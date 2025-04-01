import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, sharedStyles } from '../styles/shared';
import { transferToken } from '../api/tokensApi';
import { transferNFT, syncNFTs } from '../api/nftsApi';
import WalletHeader from '../components/ui/WalletHeader';
import { useTransactions, Transaction } from '../contexts/TransactionContext';
import { ethers } from 'ethers';
import { getProvider } from '../lib/provider';

type TransactionParams = {
  amount?: string;
  to?: string;
  from?: string;
  tokenSymbol?: string;
  gasLimit: string;
  gasPrice: string;
  networkFee: string;
  total: string;
  tokenAddress?: string;
  decimals?: string;
  // NFT specific params
  type?: string;
  contractAddress?: string;
  tokenId?: string;
  nftName?: string;
  nftImage?: string;
  toAddress?: string;
  tokenType?: string;
};

const ConfirmTransactionScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showScamWarning, setShowScamWarning] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<TransactionParams>();
  const [selectedSpeed, setSelectedSpeed] = useState<'slow' | 'market' | 'fast'>('market');
  const [speedOptions] = useState({
    slow: { multiplier: 0.397, time: '60 sec' },
    market: { multiplier: 1, time: '60 sec' },
    fast: { multiplier: 2.064, time: '15 sec' }
  });
  const { addTransaction, updateTransaction } = useTransactions();

  const calculateGasPrice = (basePrice: string, speedType: 'slow' | 'market' | 'fast') => {
    const basePriceNum = Number(basePrice);
    return (basePriceNum * speedOptions[speedType].multiplier).toString();
  };

  const getAdjustedNetworkFee = () => {
    const baseNetworkFee = params.networkFee || '0';
    return calculateGasPrice(baseNetworkFee, selectedSpeed);
  };

  const getTotal = () => {
    const networkFee = getAdjustedNetworkFee();
    // For NFTs, total is just the network fee
    if (params.type === 'nft') {
      return networkFee;
    }
    // For tokens, add amount if it exists
    const amount = params.amount ? Number(params.amount) : 0;
    return (Number(networkFee) + amount).toString();
  };

  const handleSpeedChange = (speed: 'slow' | 'market' | 'fast') => {
    setSelectedSpeed(speed);
  };

  const handleBack = () => {
    router.back();
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (params.type === 'nft') {
        // NFT transfer
        if (!params.contractAddress || !params.toAddress || !params.tokenId || !params.tokenType) {
          setError('Missing required NFT transfer parameters');
          return;
        }

        // Check for suspicious terms but show warning instead of blocking
        const suspiciousTerms = ['stake', 'claim', 'reward', 'airdrop', 'free'];
        const contractName = params.nftName?.toLowerCase() || '';
        const isScammy = suspiciousTerms.some(term => contractName.includes(term));
        
        if (isScammy && !showScamWarning) {
          setShowScamWarning(true);
          setIsLoading(false);
          return;
        }
        
        // Create pending transaction record
        const transaction: Transaction = {
          hash: '', // Will be updated once we have the tx hash
          type: 'NFT_TRANSFER',
          status: 'PENDING',
          from: params.from || '',
          to: params.toAddress,
          timestamp: new Date().toISOString(),
          tokenId: params.tokenId,
          contractAddress: params.contractAddress,
          nftName: params.nftName,
          nftImage: params.nftImage,
          gasPrice: calculateGasPrice(params.gasPrice || '0', selectedSpeed),
          gasLimit: params.gasLimit || '0',
        };

        // Start NFT transfer
        const tx = await transferNFT({
          contractAddress: params.contractAddress,
          tokenId: params.tokenId,
          toAddress: params.toAddress,
          tokenType: params.tokenType as 'ERC721' | 'ERC1155',
          gasPrice: calculateGasPrice(params.gasPrice || '0', selectedSpeed),
          gasLimit: params.gasLimit || '0',
        });

        // Update transaction with hash and navigate to transactions screen
        transaction.hash = tx.hash;
        addTransaction(transaction);
        router.push('/transaction-history');

        // Handle transaction confirmation in background
        tx.wait()
          .then(() => {
            updateTransaction(tx.hash, { status: 'COMPLETED' });
            syncNFTs(); // Sync NFTs after successful transfer
          })
          .catch((error: Error) => {
            updateTransaction(tx.hash, {
              status: 'FAILED',
              error: error.message,
            });
          });

      } else {
        // ETH or token transfer
        if (!params.to || !params.amount) {
          setError('Missing required transfer parameters');
          return;
        }

        // Start transfer
        console.log('[ConfirmTransaction] Starting transfer with details:', {
          to: params.to,
          amount: params.amount,
          gasPrice: calculateGasPrice(params.gasPrice || '0', selectedSpeed),
          gasLimit: params.gasLimit || '0'
        });
        const txHash = await transferToken({
          contractAddress: params.tokenAddress || '0x0000000000000000000000000000000000000000',
          toAddress: params.to,
          amount: params.amount,
          decimals: params.decimals ? parseInt(params.decimals) : 18,
          gasPrice: calculateGasPrice(params.gasPrice || '0', selectedSpeed),
          gasLimit: params.gasLimit || '0',
        });

        console.log('[ConfirmTransaction] Transfer initiated! Transaction hash:', txHash);

        // Create pending transaction record
        const transaction: Transaction = {
          hash: txHash,
          type: params.tokenAddress ? 'TOKEN_TRANSFER' : 'ETH_TRANSFER',
          status: 'PENDING',
          from: params.from || '',
          to: params.to || '',
          timestamp: new Date().toISOString(),
          amount: params.amount,
          tokenSymbol: params.tokenSymbol || 'ETH',
          tokenAddress: params.tokenAddress,
          gasPrice: calculateGasPrice(params.gasPrice || '0', selectedSpeed),
          gasLimit: params.gasLimit || '0'
        };

        console.log('[ConfirmTransaction] Adding transaction to history:', transaction);
        addTransaction(transaction);
        
        // Navigate immediately to transaction history
        console.log('[ConfirmTransaction] Navigating to transaction history...');
        router.push('/transaction-history');

        // Get provider to monitor transaction in background
        const provider = await getProvider();
        console.log('[ConfirmTransaction] Setting up transaction monitoring for hash:', txHash);
        
        // Use provider.once instead of provider.on to ensure we only handle the confirmation once
        provider.once(txHash, (receipt) => {
          console.log('[ConfirmTransaction] Transaction confirmed:', receipt);
          updateTransaction(txHash, { status: 'COMPLETED' });
          console.log('[ConfirmTransaction] Transaction status updated to COMPLETED');
        });

      }
    } catch (error) {
      console.error('Transfer failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transfer';
      setError(errorMessage);
      
      if (errorMessage.includes('1015')) {
        setError('Network error: Please check your internet connection and try again');
      }
      setIsLoading(false);
    }
  };

  const formatAddress = (address?: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatEthValue = (value: string) => {
    return Number(value).toFixed(8);
  };

  const formatUsdValue = (ethValue: string) => {
    const ethPrice = 1800;
    const usdValue = Number(ethValue) * ethPrice;
    return `$${usdValue.toFixed(2)}`;
  };

  const SpeedOption = ({ type, label }: { type: 'slow' | 'market' | 'fast', label: string }) => (
    <TouchableOpacity 
      style={[
        styles.speedOption,
        selectedSpeed === type && styles.speedOptionSelected
      ]}
      onPress={() => handleSpeedChange(type)}
    >
      <View style={styles.speedIconContainer}>
        <Ionicons 
          name="flash" 
          size={16} 
          color={selectedSpeed === type ? COLORS.white : COLORS.textSecondary} 
        />
        {type === 'fast' && (
          <Ionicons 
            name="flash" 
            size={16} 
            color={selectedSpeed === type ? COLORS.white : COLORS.textSecondary}
            style={styles.secondFlash} 
          />
        )}
      </View>
      <View>
        <Text style={[
          styles.speedLabel,
          selectedSpeed === type && styles.speedLabelSelected
        ]}>
          {label}
        </Text>
        <Text style={[
          styles.speedTime,
          selectedSpeed === type && styles.speedTimeSelected
        ]}>
          ~{speedOptions[type].time}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={sharedStyles.container}>
      <Image 
        source={require('../assets/background.png')} 
        style={sharedStyles.backgroundImage}
      />

      <WalletHeader 
        onAccountChange={() => {}}
      />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.title}>Review Transaction</Text>
            <View style={styles.backButton} />
          </View>

          {params.type === 'nft' ? (
            <>
              <View style={styles.nftContainer}>
                {params.nftImage && (
                  <Image 
                    source={{ uri: params.nftImage }}
                    style={styles.nftImage}
                    resizeMode="cover"
                  />
                )}
                <Text numberOfLines={2} style={styles.nftName}>{params.nftName || 'NFT'}</Text>
              </View>
            </>
          ) : (
            <View style={styles.amountContainer}>
              <Text style={styles.amount}>{params.amount} {params.tokenSymbol}</Text>
              <Text style={styles.amountUsd}>{formatUsdValue(params.total)}</Text>
            </View>
          )}

          <View style={styles.detailsContainer}>
            <View style={styles.row}>
              <Text style={styles.label}>To</Text>
              <Text style={styles.value}>
                {params.type === 'nft' ? formatAddress(params.toAddress) : formatAddress(params.to)}
              </Text>
            </View>

            <View style={styles.gasSpeedContainer}>
              <Text style={styles.gasSpeedTitle}>Transaction Speed</Text>
              <View style={styles.speedOptionsContainer}>
                <SpeedOption type="slow" label="Slow" />
                <SpeedOption type="market" label="Normal" />
                <SpeedOption type="fast" label="Fast" />
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Network fee</Text>
              <View style={styles.feeContainer}>
                <Text style={styles.value}>{formatEthValue(getAdjustedNetworkFee())} ETH</Text>
                <Text style={styles.feeUsd}>{formatUsdValue(getAdjustedNetworkFee())}</Text>
              </View>
            </View>
            
            {/* Only show total if it's different from network fee */}
            {getTotal() !== getAdjustedNetworkFee() && (
              <View style={[styles.row, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <View style={styles.feeContainer}>
                  <Text style={styles.totalValue}>{formatEthValue(getTotal())} ETH</Text>
                  <Text style={styles.totalUsd}>{formatUsdValue(getTotal())}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        {showScamWarning ? (
          <>
            <Text style={styles.warningText}>
              ⚠️ Warning: This NFT contains suspicious terms and might be a scam. Please verify the contract and proceed with caution.
            </Text>
            <View style={styles.warningButtons}>
              <TouchableOpacity
                style={[styles.warningButton, styles.cancelButton]}
                onPress={() => {
                  setShowScamWarning(false);
                  router.back();
                }}
              >
                <Text style={styles.warningButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.warningButton, styles.proceedButton]}
                onPress={() => {
                  setShowScamWarning(false);
                  setIsLoading(true);
                  handleConfirm();
                }}
              >
                <Text style={styles.warningButtonText}>Proceed Anyway</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={isLoading}
            >
              <Text style={styles.confirmButtonText}>
                {isLoading ? 'Confirming...' : 'Confirm Transaction'}
              </Text>
            </TouchableOpacity>
            
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  nftContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  nftImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    marginBottom: SPACING.md,
  },
  nftName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    lineHeight: 32,
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  amountUsd: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  detailsContainer: {
    padding: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: SPACING.lg,
    marginTop: SPACING.lg,
  },
  label: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
  feeContainer: {
    alignItems: 'flex-end',
  },
  feeUsd: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  totalUsd: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  gasSpeedContainer: {
    marginBottom: SPACING.lg,
  },
  gasSpeedTitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  speedOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  speedOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: SPACING.md,
    borderRadius: 16,
    gap: SPACING.xs,
  },
  speedOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  speedIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  secondFlash: {
    marginLeft: -8,
  },
  speedLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  speedLabelSelected: {
    color: COLORS.white,
  },
  speedTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  speedTimeSelected: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bottomBar: {
    padding: SPACING.lg,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  warningText: {
    color: '#FFA500',
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontSize: 16,
    lineHeight: 24,
  },
  warningButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  warningButton: {
    flex: 1,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  proceedButton: {
    backgroundColor: '#FFA500',
  },
  warningButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default ConfirmTransactionScreen; 