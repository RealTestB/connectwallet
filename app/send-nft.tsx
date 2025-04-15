import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { isAddress } from 'ethers';
import { estimateNFTTransferGas } from '../api/nftTransactionsApi';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams } from 'expo-router';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WalletHeader from '../components/ui/WalletHeader';
import BottomNav from '../components/ui/BottomNav';
import { COLORS, SPACING, FONTS, sharedStyles } from '../styles/shared';
import { estimateGas, TransactionType } from '../utils/gasUtils';
import { ChainId } from '../constants/chains';

const truncateAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function SendNFTScreen(): JSX.Element {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { nft: nftParam } = useLocalSearchParams<{ nft: string }>();
  const nft = nftParam ? JSON.parse(decodeURIComponent(nftParam)) : null;

  const [recipientAddress, setRecipientAddress] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [gasEstimate, setGasEstimate] = useState<{ gasLimit: bigint; gasPrice: bigint } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWalletData = async () => {
      try {
        setIsWalletLoading(true);
        const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
        if (walletDataStr) {
          const walletData = JSON.parse(walletDataStr);
          console.log('Loaded wallet data:', walletData);
          setFromAddress(walletData.address);
        } else {
          console.error('No wallet data found in storage');
          setError('Wallet data not found');
        }
      } catch (err) {
        console.error('Error loading wallet data:', err);
        setError('Failed to load wallet data');
      } finally {
        setIsWalletLoading(false);
      }
    };

    loadWalletData();
  }, []);

  const validateAddress = (address: string): boolean => {
    return isAddress(address);
  };

  const estimateNFTGas = async (toAddress: string) => {
    try {
      if (!validateAddress(toAddress)) return;
      
      if (!fromAddress) {
        console.error('Wallet address not loaded');
        setError('Wallet address not loaded. Please try again.');
        return;
      }
      
      // Validate NFT data
      if (!nft?.contract?.address || !nft?.tokenId) {
        console.error('Missing required NFT data:', {
          contractAddress: nft?.contract?.address,
          tokenId: nft?.tokenId
        });
        setError('Missing required NFT data');
        return;
      }

      // Get wallet data for chainId
      const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (!walletDataStr) {
        console.error('No wallet data found in storage');
        setError('Wallet data not found');
        return;
      }
      const walletData = JSON.parse(walletDataStr);
      const chainId = (walletData.chainId || 1) as ChainId;

      // Get token type from NFT data
      const tokenType = nft.contract.tokenType as 'ERC721' | 'ERC1155';
      if (!tokenType) {
        console.error('Missing token type:', nft.contract);
        setError('Invalid NFT token type');
        return;
      }

      // Get gas estimation
      const gasEstimation = await estimateGas(
        chainId,
        tokenType === 'ERC721' ? TransactionType.NFT_TRANSFER : TransactionType.NFT_APPROVAL,
        fromAddress,
        toAddress,
        undefined,
        undefined
      );

      setGasEstimate({
        gasLimit: gasEstimation.gasLimit,
        gasPrice: gasEstimation.gasPrice
      });
      setError(null);
    } catch (err) {
      console.error('Gas estimation error:', err);
      setError('Failed to estimate gas. Please try again.');
      setGasEstimate(null);
    }
  };

  const handleScan = () => {
    router.push('/scan-qr');
  };

  const handleBack = () => {
    router.back();
  };

  const handleSend = async () => {
    try {
      if (!recipientAddress || !validateAddress(recipientAddress)) {
        setError('Please enter a valid recipient address');
        return;
      }

      if (!gasEstimate) {
        setError('Gas estimation failed. Please try again.');
        return;
      }

      // Get token type from NFT data
      const tokenType = nft.contract.tokenType as 'ERC721' | 'ERC1155';
      if (!tokenType) {
        console.error('Missing token type:', nft.contract);
        setError('Invalid NFT token type');
        return;
      }

      // Calculate network fee in Wei
      const networkFeeWei = (BigInt(gasEstimate.gasLimit) * BigInt(gasEstimate.gasPrice)).toString();
      
      // Convert Wei to ETH (1 ETH = 10^18 Wei)
      const networkFeeEth = (Number(networkFeeWei) / 1e18).toFixed(8);
      
      // For NFTs, total cost is just the network fee since we're not paying for the NFT itself
      const totalEth = networkFeeEth;

      console.log('Preparing navigation with params:', {
        type: 'nft',
        contractAddress: nft.contract.address,
        tokenId: nft.tokenId,
        toAddress: recipientAddress,
        tokenType: nft.contract.tokenType,
        nftName: nft.title,
        nftImage: nft.media?.[0]?.gateway,
        gasLimit: gasEstimate.gasLimit.toString(),
        gasPrice: gasEstimate.gasPrice.toString(),
        networkFee: networkFeeEth,
        total: totalEth
      });

      // Set loading state
      setIsLoading(true);

      // Use push with a slight delay to ensure clean navigation
      setTimeout(() => {
        router.push({
          pathname: '/confirm-transaction',
          params: {
            type: 'nft',
            contractAddress: nft.contract.address,
            tokenId: nft.tokenId,
            toAddress: recipientAddress,
            tokenType: nft.contract.tokenType as 'ERC721' | 'ERC1155',
            nftName: nft.title,
            nftImage: nft.media?.[0]?.gateway,
            gasLimit: gasEstimate.gasLimit.toString(),
            gasPrice: gasEstimate.gasPrice.toString(),
            networkFee: networkFeeEth,
            total: totalEth
          }
        });
      }, 100);
    } catch (err) {
      console.error('Error preparing transaction:', err);
      setError('Failed to prepare transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountChange = (account: { address: string; chainId?: number }) => {
    // Handle account change
  };

  if (!nft) {
    return (
      <View style={sharedStyles.container}>
        <Image
          source={require('../assets/images/background.png')}
          style={sharedStyles.backgroundImage}
        />
        <WalletHeader onAccountChange={handleAccountChange} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid NFT data</Text>
        </View>
        <BottomNav activeTab="nft" />
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <Image
        source={require('../assets/images/background.png')}
        style={sharedStyles.backgroundImage}
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send NFT</Text>
      </View>

      <View style={[styles.content, { paddingBottom: 64 + insets.bottom }]}>
        <View style={styles.nftInfo}>
          <Image
            source={{ uri: nft?.media?.[0]?.gateway }}
            style={styles.nftImage}
            resizeMode="cover"
          />
          <Text style={styles.nftName}>{nft?.title || 'Untitled NFT'}</Text>
          {nft?.contract?.name && (
            <Text style={styles.collectionName}>{nft.contract.name}</Text>
          )}
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Recipient Address</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={recipientAddress}
              onChangeText={(text) => {
                setRecipientAddress(text);
                if (validateAddress(text) && !isWalletLoading) {
                  estimateNFTGas(text);
                }
              }}
              placeholder={isWalletLoading ? "Loading wallet..." : "Enter recipient's address"}
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isWalletLoading}
            />
            <TouchableOpacity 
              style={[styles.scanButton, isWalletLoading && styles.buttonDisabled]} 
              onPress={handleScan}
              disabled={isWalletLoading}
            >
              <Ionicons name="qr-code-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!validateAddress(recipientAddress) || isLoading || isWalletLoading) && styles.buttonDisabled
            ]}
            onPress={handleSend}
            disabled={!validateAddress(recipientAddress) || isLoading || isWalletLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.sendButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <BottomNav activeTab="nft" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 20,
    paddingBottom: SPACING.lg,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.md,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  nftInfo: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  nftImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  nftName: {
    ...FONTS.h2,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  collectionName: {
    ...FONTS.body,
    color: COLORS.primary,
  },
  form: {
    flex: 1,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  input: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.white,
    padding: SPACING.md,
  },
  scanButton: {
    padding: SPACING.md,
  },
  errorText: {
    ...FONTS.caption,
    color: COLORS.error,
    marginBottom: SPACING.md,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    ...FONTS.body,
    color: COLORS.white,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 