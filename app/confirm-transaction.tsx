import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
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
import { makeAlchemyRequest } from "../api/alchemyApi";
import { TokenWithPrice as TokenBase } from "../types/tokens";
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getChainById } from '../constants/chains';
import { storeTransaction } from '../api/supabaseApi';
import { getCurrentGasPrices } from '../utils/gasUtils';

interface Token extends TokenBase {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
}

type SpeedType = 'slow' | 'normal' | 'fast';

type TransactionParams = {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: string;
  amount: string;
  recipient: string;
  gasPrice: string;
  gasLimit: string;
  usdValue: string;
  tokenLogo?: string;
  gasUsd?: string;
  // Legacy params kept for backward compatibility
  to?: string;
  from?: string;
  networkFee?: string;
  total?: string;
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
  const [error, setError] = useState<string | null>('');
  const [showScamWarning, setShowScamWarning] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<string>('');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<TransactionParams>();
  const [selectedSpeed, setSelectedSpeed] = useState<SpeedType>('normal');
  const { addTransaction, updateTransaction } = useTransactions();
  const [amount, setAmount] = useState('');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenPrice, setTokenPrice] = useState(0);
  const [gasEstimate, setGasEstimate] = useState('');
  const [gasUsd, setGasUsd] = useState('');

  const speedMultipliers = {
    slow: 0.8,
    normal: 1.0,
    fast: 1.2
  };

  const calculateGasPrice = (basePrice: bigint | string, speed: SpeedType): string => {
    const multiplier = speedMultipliers[speed];
    try {
      if (!basePrice) return '0';
      
      // Convert to BigInt if it's a string
      const basePriceWei = typeof basePrice === 'string'
        ? (basePrice.startsWith('0x') ? BigInt(basePrice) : BigInt(basePrice))
        : basePrice;
        
      const multiplierBigInt = BigInt(Math.floor(multiplier * 100));
      const result = (basePriceWei * multiplierBigInt) / BigInt(100);
      return result.toString();
    } catch (error) {
      console.error('Error calculating gas price:', error);
      return typeof basePrice === 'bigint' ? basePrice.toString() : '0';
    }
  };

  const getAdjustedNetworkFee = () => {
    // Get the base gas price and gas limit
    const gasPrice = params.gasPrice || '0';
    const gasLimit = params.gasLimit || '0';
    
    // Calculate adjusted gas price based on selected speed
    const adjustedGasPrice = calculateGasPrice(gasPrice, selectedSpeed);
    
    try {
      // Calculate total gas cost
      const gasCostWei = BigInt(adjustedGasPrice) * BigInt(gasLimit);
      return ethers.formatEther(gasCostWei);
    } catch (error) {
      console.error('Error calculating network fee:', error);
      return '0';
    }
  };

  const getTotal = () => {
    const networkFee = getAdjustedNetworkFee();
    // For NFTs, total is just the network fee
    if (params.type === 'nft') {
      return networkFee;
    }
    // For tokens, add amount if it exists
    const amount = params.amount ? parseFloat(params.amount) : 0;
    const fee = parseFloat(networkFee);
    return (fee + amount).toString();
  };

  const handleSpeedChange = (speed: SpeedType) => {
    setSelectedSpeed(speed);
    // Force a re-render of the gas costs
    const newFee = getAdjustedNetworkFee();
    const newGasUsd = params.gasUsd 
      ? (parseFloat(params.gasUsd) * speedMultipliers[speed]).toFixed(2)
      : (parseFloat(newFee) * 1800).toFixed(2); // Using 1800 as fallback ETH price if not provided
    
    // Update the display values
    setGasEstimate(newFee);
    setGasUsd(newGasUsd);
  };

  const handleBack = () => {
    router.back();
  };

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate all required parameters are present
      if (!params.amount || !params.recipient || !params.tokenAddress) {
        setError('Some transaction details are missing. Please try again.');
        return;
      }

      // Get current chain ID from wallet data
      const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (!walletDataStr) {
        throw new Error('No wallet data found');
      }
      const walletData = JSON.parse(walletDataStr);
      const chainId = walletData.chainId || 1;

      // Get current gas prices
      const gasPrices = await getCurrentGasPrices(chainId);
      
      // Use maxFee directly since it's already a BigInt
      console.log('[ConfirmTransaction] Gas price calculated:', gasPrices.maxFee.toString());

      // Apply speed multiplier
      const adjustedGasPrice = calculateGasPrice(gasPrices.maxFee, selectedSpeed);
      
      // Calculate gas cost in native token
      const gasCostWei = BigInt(adjustedGasPrice) * BigInt(params.gasLimit);
      const gasCostNative = ethers.formatEther(gasCostWei);

      // For native token transfers, check if we have enough balance
      if (params.tokenAddress === '0x0000000000000000000000000000000000000000') {
        const balance = await makeAlchemyRequest('eth_getBalance', [walletData.address, 'latest'], chainId);
        const currentBalance = ethers.formatEther(balance);
        const sendAmount = params.amount;
        const gasCost = ethers.formatEther(BigInt(adjustedGasPrice) * BigInt(params.gasLimit));
        
        // Convert all values to BigInt with 18 decimals for precise comparison
        const balanceWei = BigInt(balance);
        const sendAmountWei = ethers.parseEther(sendAmount);
        const gasCostWei = BigInt(adjustedGasPrice) * BigInt(params.gasLimit);
        const totalRequiredWei = sendAmountWei + gasCostWei;

        console.log('[ConfirmTransaction] Detailed balance check:', {
          rawBalance: balance,
          balanceFormatted: currentBalance,
          balanceWei: balanceWei.toString(),
          sendAmount,
          sendAmountWei: sendAmountWei.toString(),
          gasCost,
          gasCostWei: gasCostWei.toString(),
          totalRequiredWei: totalRequiredWei.toString(),
          comparison: {
            totalRequired: totalRequiredWei.toString(),
            balance: balanceWei.toString(),
            hasEnough: totalRequiredWei <= balanceWei
          }
        });

        // Compare using BigInt values to avoid floating point precision issues
        if (totalRequiredWei > balanceWei) {
          const maxPossibleAmount = ethers.formatEther(balanceWei - gasCostWei);
          if (balanceWei > gasCostWei) {
            setError(`Insufficient balance. Maximum amount you can send is ${maxPossibleAmount} ETH`);
          } else {
            setError('Insufficient balance to cover gas fees');
          }
          return;
        }
      }

      // Proceed with the transaction
      const txHash = await transferToken({
        contractAddress: params.tokenAddress,
        toAddress: params.recipient,
        amount: params.amount,
        decimals: parseInt(params.tokenDecimals),
        gasPrice: adjustedGasPrice,
        gasLimit: params.gasLimit
      });

      // Store transaction in database
      await storeTransaction({
        wallet_id: walletData.id,
        hash: txHash,
        from_address: walletData.address,
        to_address: params.recipient,
        value: ethers.parseUnits(params.amount, parseInt(params.tokenDecimals)).toString(),
        token_address: params.tokenAddress === '0x0000000000000000000000000000000000000000' ? undefined : params.tokenAddress,
        token_symbol: params.tokenSymbol,
        token_decimals: parseInt(params.tokenDecimals),
        status: 'pending',
        network_id: chainId,
        gas_price: adjustedGasPrice.toString(),
        gas_used: params.gasLimit
      });

      // Store transaction hash and show success modal
      setCurrentTxHash(txHash);
      setShowSuccessModal(true);

    } catch (error) {
      console.error('[ConfirmTransaction] Error:', error);
      
      let errorMessage = 'An error occurred while processing your transaction.';
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'You do not have enough funds to cover this transaction and gas fees.';
        } else if (error.message.includes('gas required exceeds allowance')) {
          errorMessage = 'The transaction requires more gas than expected. Please try again with a smaller amount.';
        } else if (error.message.includes('nonce')) {
          errorMessage = 'There was an issue with the transaction sequence. Please try again.';
        } else if (error.message.includes('1015')) {
          errorMessage = 'Network connection issue. Please check your internet connection and try again.';
        } else if (error.message.includes('transaction underpriced')) {
          errorMessage = 'The gas price is too low. Please try again with a higher gas price.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address?: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatEthValue = (value: string) => {
    if (!value) return '0.00000000';
    return parseFloat(value).toFixed(8);
  };

  const formatUsdValue = (ethValue: string) => {
    if (!ethValue) return '$0.00';
    const amount = parseFloat(ethValue);
    return `$${(amount * (params.usdValue ? parseFloat(params.usdValue) / parseFloat(params.amount || '1') : 1800)).toFixed(2)}`;
  };

  const SpeedOption = ({ type, label }: { type: SpeedType, label: string }) => (
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
          ~{speedMultipliers[type] * 60} sec
        </Text>
      </View>
    </TouchableOpacity>
  );

  const sanitizeParams = (params: any) => {
    return {
      hash: params.hash?.toString() || '',
      amount: params.amount?.toString() || '0',
      token: params.token?.toString() || '',
      recipient: params.recipient?.toString() || ''
    };
  };

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
              <Text style={styles.amountUsd}>{formatUsdValue(params.amount || '0')}</Text>
            </View>
          )}

          <View style={styles.detailsContainer}>
            <View style={styles.row}>
              <Text style={styles.label}>To</Text>
              <Text style={styles.value}>
                {params.type === 'nft' && params.toAddress 
                  ? formatAddress(params.toAddress) 
                  : params.recipient 
                    ? formatAddress(params.recipient) 
                    : ''}
              </Text>
            </View>

            <View style={styles.gasSpeedContainer}>
              <Text style={styles.gasSpeedTitle}>Transaction Speed</Text>
              <View style={styles.speedOptionsContainer}>
                <SpeedOption type="slow" label="Slow" />
                <SpeedOption type="normal" label="Normal" />
                <SpeedOption type="fast" label="Fast" />
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Network fee</Text>
              <View style={styles.feeContainer}>
                <Text style={styles.value}>
                  {formatEthValue(getAdjustedNetworkFee())} ETH
                </Text>
                <Text style={styles.feeUsd}>
                  ${(parseFloat(params.gasUsd || '0') * speedMultipliers[selectedSpeed]).toFixed(2)}
                </Text>
              </View>
            </View>
            
            {/* Only show total if it's different from network fee */}
            {getTotal() !== getAdjustedNetworkFee() && (
              <View style={[styles.row, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <View style={styles.feeContainer}>
                  <Text style={styles.totalValue}>
                    {formatEthValue(
                      params.type === 'nft'
                        ? getAdjustedNetworkFee()
                        : (parseFloat(params.amount || '0') + parseFloat(getAdjustedNetworkFee())).toString()
                    )} ETH
                  </Text>
                  <Text style={styles.totalUsd}>
                    ${(
                      (params.type === 'nft' ? 0 : parseFloat(params.usdValue || '0')) +
                      parseFloat(params.gasUsd || '0') * speedMultipliers[selectedSpeed]
                    ).toFixed(2)}
                  </Text>
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
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="white" />
                  <Text style={styles.buttonText}>Confirming...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Confirm Transaction</Text>
              )}
            </TouchableOpacity>
            
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </>
        )}
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              <Text style={styles.modalTitle}>Transaction Sent</Text>
              <Text style={styles.modalSubtitle}>Your transfer has been submitted successfully</Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.viewDetailsButton]}
                onPress={async () => {
                  setShowSuccessModal(false);
                  // Get wallet data
                  const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
                  const walletData = walletDataStr ? JSON.parse(walletDataStr) : null;
                  // Get current chain info
                  const chainInfo = getChainById(walletData?.chainId || 1); // Default to Ethereum if no chain ID
                  const transactionDetails = {
                    hash: currentTxHash,
                    type: params.type === 'nft' ? 'NFT_TRANSFER' : 'TOKEN_TRANSFER',
                    status: 'PENDING',
                    amount: `${params.amount} ${params.tokenSymbol}`,
                    from: params.from || '',
                    to: params.recipient || params.toAddress || '',
                    date: new Date().toLocaleString(),
                    network: chainInfo?.name || 'Unknown Network',
                    fee: `${formatEthValue(getAdjustedNetworkFee())} ${chainInfo?.nativeCurrency.symbol || 'ETH'}`,
                    explorer: chainInfo ? `${chainInfo.blockExplorerUrl}/tx/${currentTxHash}` : ''
                  };
                  router.push({
                    pathname: '/transaction-details',
                    params: {
                      transaction: JSON.stringify(transactionDetails)
                    }
                  });
                }}
              >
                <Text style={styles.viewDetailsText}>View Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.doneButton]}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push('/portfolio');
                }}
              >
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: 'rgba(20, 24, 40, 0.98)',
    borderRadius: 24,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButtons: {
    gap: SPACING.md,
  },
  modalButton: {
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewDetailsButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  doneButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewDetailsText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  doneText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.7,
  },
});

export default ConfirmTransactionScreen; 