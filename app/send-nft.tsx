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
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { isAddress } from 'ethers';
import { estimateNFTTransferGas, transferNFT } from '../api/nftTransactionsApi';
import * as SecureStore from 'expo-secure-store';
import config from '../api/config';
import { useLocalSearchParams } from 'expo-router';

type SendNFTScreenRouteProp = RouteProp<RootStackParamList, 'send-nft'>;

const truncateAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function SendNFTScreen(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<SendNFTScreenRouteProp>();
  const { nft } = route.params;
  const { contractAddress, tokenId } = useLocalSearchParams<{ contractAddress: string; tokenId: string }>();

  const [recipientAddress, setRecipientAddress] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load wallet address
    const loadWalletAddress = async () => {
      try {
        const address = await SecureStore.getItemAsync(config.wallet.classic.storageKeys.addresses);
        if (address) {
          setFromAddress(address);
        }
      } catch (err) {
        console.error('Error loading wallet address:', err);
      }
    };

    loadWalletAddress();
  }, []);

  const validateAddress = (address: string): boolean => {
    return isAddress(address);
  };

  const estimateGas = async (toAddress: string) => {
    try {
      if (!validateAddress(toAddress)) return;

      const estimate = await estimateNFTTransferGas({
        contractAddress,
        tokenId,
        toAddress,
        fromAddress,
      });

      setGasEstimate(estimate);
      setError(null);
    } catch (err) {
      console.error('Gas estimation error:', err);
      setError('Failed to estimate gas. Please try again.');
      setGasEstimate(null);
    }
  };

  const handleSend = async () => {
    if (!validateAddress(recipientAddress)) {
      Alert.alert('Invalid Address', 'Please enter a valid Ethereum address');
      return;
    }

    setIsLoading(true);
    setTransactionStatus('pending');
    setError(null);

    try {
      const txHash = await transferNFT({
        contractAddress,
        tokenId,
        toAddress: recipientAddress,
        fromAddress,
      });

      setTransactionStatus('success');
      Alert.alert(
        'Success',
        'NFT sent successfully!',
        [{ 
          text: 'View Transaction',
          onPress: () => {
            // Open transaction in explorer
            const explorerUrl = `https://etherscan.io/tx/${txHash}`;
            Linking.openURL(explorerUrl);
          }
        },
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }]
      );
    } catch (err) {
      console.error('Send NFT error:', err);
      setTransactionStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to send NFT. Please try again.');
      Alert.alert('Error', 'Failed to send NFT. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Send NFT</Text>
      </View>

      <View style={styles.walletInfo}>
        <Text style={styles.walletLabel}>From</Text>
        <Text style={styles.walletAddress}>{truncateAddress(fromAddress)}</Text>
        <Text style={styles.walletType}>Classic Wallet</Text>
      </View>

      <View style={styles.nftInfo}>
        <Image
          source={{ uri: nft.image }}
          style={styles.nftImage}
          resizeMode="cover"
        />
        <Text style={styles.nftName}>{nft.name}</Text>
        {nft.collection && (
          <Text style={styles.collectionName}>{nft.collection}</Text>
        )}
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Recipient Address</Text>
        <TextInput
          style={styles.input}
          value={recipientAddress}
          onChangeText={(text) => {
            setRecipientAddress(text);
            if (validateAddress(text)) {
              estimateGas(text);
            }
          }}
          placeholder="Enter recipient's address"
          placeholderTextColor="#6A9EFF"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {gasEstimate && (
          <View style={styles.gasEstimate}>
            <Text style={styles.gasLabel}>Estimated Gas Fee:</Text>
            <Text style={styles.gasAmount}>{gasEstimate} ETH</Text>
          </View>
        )}

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!validateAddress(recipientAddress) || isLoading) && styles.buttonDisabled
          ]}
          onPress={handleSend}
          disabled={!validateAddress(recipientAddress) || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.sendButtonText}>Send NFT</Text>
          )}
        </TouchableOpacity>

        {transactionStatus === 'pending' && (
          <View style={styles.statusContainer}>
            <ActivityIndicator color="#6A9EFF" />
            <Text style={styles.statusText}>Transaction in progress...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1B3F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    fontSize: 24,
    color: '#6A9EFF',
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  walletInfo: {
    alignItems: 'center',
    padding: 20,
  },
  walletLabel: {
    fontSize: 16,
    color: '#6A9EFF',
    marginBottom: 8,
  },
  walletAddress: {
    fontSize: 16,
    color: 'white',
    marginBottom: 8,
  },
  walletType: {
    fontSize: 14,
    color: '#6A9EFF',
    backgroundColor: 'rgba(106, 158, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nftInfo: {
    alignItems: 'center',
    padding: 20,
  },
  nftImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  nftName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  collectionName: {
    fontSize: 16,
    color: '#6A9EFF',
    marginBottom: 24,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: '#6A9EFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 16,
    marginBottom: 16,
  },
  gasEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gasLabel: {
    fontSize: 14,
    color: '#6A9EFF',
  },
  gasAmount: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  statusText: {
    color: '#6A9EFF',
    marginLeft: 8,
  },
}); 