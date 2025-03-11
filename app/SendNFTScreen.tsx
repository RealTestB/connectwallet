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

type SendNFTScreenRouteProp = RouteProp<RootStackParamList, 'SendNFTScreen'>;

export default function SendNFTScreen(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<SendNFTScreenRouteProp>();
  const { nft } = route.params;

  const [recipientAddress, setRecipientAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<'classic' | 'smart'>('classic');

  useEffect(() => {
    // Load wallet type from secure storage
    const loadWalletType = async () => {
      try {
        const type = await SecureStore.getItemAsync('walletType');
        if (type === 'classic' || type === 'smart') {
          setWalletType(type);
        }
      } catch (err) {
        console.error('Error loading wallet type:', err);
      }
    };

    loadWalletType();
  }, []);

  const validateAddress = (address: string): boolean => {
    return isAddress(address);
  };

  const estimateGas = async (toAddress: string) => {
    try {
      if (!validateAddress(toAddress)) return;

      const walletAddress = await SecureStore.getItemAsync('walletAddress');
      if (!walletAddress) {
        throw new Error('Wallet address not found');
      }

      const estimate = await estimateNFTTransferGas({
        contractAddress: nft.contractAddress,
        tokenId: nft.tokenId,
        toAddress,
        fromAddress: walletAddress,
        walletType,
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
      const walletAddress = await SecureStore.getItemAsync('walletAddress');
      if (!walletAddress) {
        throw new Error('Wallet address not found');
      }

      const txHash = await transferNFT({
        contractAddress: nft.contractAddress,
        tokenId: nft.tokenId,
        toAddress: recipientAddress,
        fromAddress: walletAddress,
        walletType,
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
        <Text style={styles.walletType}>
          {walletType === 'classic' ? 'Classic Wallet' : 'Smart Wallet'}
        </Text>
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  gasLabel: {
    color: '#6A9EFF',
    fontSize: 16,
  },
  gasAmount: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sendButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#2563EB80',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF4B4B',
    marginBottom: 16,
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  statusText: {
    color: '#6A9EFF',
    marginLeft: 8,
    fontSize: 14,
  },
}); 