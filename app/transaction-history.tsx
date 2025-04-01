import { getTransactionHistory } from "../api/transactionsApi";
import BottomNav from "../components/ui/BottomNav";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, TouchableOpacity, Image, RefreshControl } from "react-native";
import { Network } from "alchemy-sdk";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TransactionResponse } from "ethers";
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useTransactions, Transaction } from '../contexts/TransactionContext';
import { ethers } from "ethers";
import { useRouter } from "expo-router";
import { NETWORKS } from '../api/config';
import { COLORS, SPACING, sharedStyles } from '../styles/shared';
import { getProvider } from '../lib/provider';
import { makeAlchemyRequest } from '../api/alchemyApi';

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

type TransactionItem = Transaction | TransactionResponse;

export default function TransactionHistoryScreen(): JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { transactions, updateTransaction } = useTransactions();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<Network>(Network.ETH_MAINNET);
  
  // Split transactions into pending and completed
  const pendingTransactions = transactions.filter(tx => tx.status === 'PENDING');
  const completedTransactions = transactions.filter(tx => tx.status === 'COMPLETED' || tx.status === 'FAILED');

  useEffect(() => {
    console.log('[TransactionHistory] Initial load with transactions:', {
      pending: pendingTransactions.length,
      completed: completedTransactions.length
    });
    loadWalletData();
  }, []);

  useEffect(() => {
    // Set up polling for pending transactions
    const checkPendingTransactions = async () => {
      if (pendingTransactions.length === 0) return;
      
      console.log('[TransactionHistory] Checking pending transactions:', pendingTransactions.length);
      
      for (const tx of pendingTransactions) {
        try {
          console.log('[TransactionHistory] Checking transaction:', tx.hash);
          const response = await makeAlchemyRequest('eth_getTransactionReceipt', [tx.hash]);
          
          if (response && response.status !== undefined) {
            const newStatus = response.status === '0x1' ? 'COMPLETED' : 'FAILED';
            console.log('[TransactionHistory] Updating transaction status:', {
              hash: tx.hash,
              oldStatus: tx.status,
              newStatus,
              receipt: response
            });
            
            updateTransaction(tx.hash, { status: newStatus });
          } else {
            console.log('[TransactionHistory] Transaction still pending:', tx.hash);
          }
        } catch (error) {
          console.error('[TransactionHistory] Error checking transaction status:', {
            hash: tx.hash,
            error
          });
        }
      }
    };

    // Poll more frequently (every 3 seconds) when there are pending transactions
    if (pendingTransactions.length > 0) {
      console.log('[TransactionHistory] Starting polling for pending transactions');
      checkPendingTransactions(); // Check immediately
      const interval = setInterval(checkPendingTransactions, 3000);
      return () => clearInterval(interval);
    }
  }, [pendingTransactions, updateTransaction]);

  const handleAccountChange = (account: Account): void => {
    setWalletAddress(account.address);
    if (account.chainId) {
      const networkMap: { [key: number]: Network } = {
        1: Network.ETH_MAINNET,
        5: Network.ETH_GOERLI,
        137: Network.MATIC_MAINNET,
        80001: Network.MATIC_MUMBAI,
      };
      setNetworkId(networkMap[account.chainId] || Network.ETH_MAINNET);
    }
  };

  const handleRefresh = async () => {
    console.log('[TransactionHistory] Manual refresh triggered');
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const loadWalletData = async (): Promise<void> => {
    try {
      console.log('[TransactionHistory] Loading wallet data...');
      const storedWalletAddress = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_ADDRESS);
      const storedNetworkId = await SecureStore.getItemAsync(STORAGE_KEYS.NETWORK.ID);

      if (storedWalletAddress) {
        console.log('[TransactionHistory] Wallet address found:', storedWalletAddress);
        setWalletAddress(storedWalletAddress);
        if (storedNetworkId) {
          const networkMap: { [key: string]: Network } = {
            "1": Network.ETH_MAINNET,
            "5": Network.ETH_GOERLI,
            "137": Network.MATIC_MAINNET,
            "80001": Network.MATIC_MUMBAI,
          };
          setNetworkId(networkMap[storedNetworkId] || Network.ETH_MAINNET);
        }
      }
    } catch (error) {
      console.error("[TransactionHistory] Error loading wallet data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return '#4CAF50';
      case 'PENDING':
        return '#FFA726';
      case 'FAILED':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return '✅';
      case 'PENDING':
        return '⏳';
      case 'FAILED':
        return '❌';
      default:
        return '❓';
    }
  };

  const getExplorerUrl = (hash: string) => {
    return `https://etherscan.io/tx/${hash}`;
  };

  const handleTransactionPress = (transaction: Transaction | TransactionResponse) => {
    const formatGasPrice = (gasPrice: string | bigint | undefined) => {
      if (!gasPrice) return 'N/A';
      try {
        const gasPriceBigInt = typeof gasPrice === 'string' ? BigInt(gasPrice.replace('0x', '')) : gasPrice;
        return ethers.formatEther(gasPriceBigInt) + ' ETH';
      } catch (error) {
        console.error('[TransactionHistory] Error formatting gas price:', error);
        return 'N/A';
      }
    };

    const formattedTransaction = {
      hash: transaction.hash,
      type: 'status' in transaction ? transaction.type : 'ETH_TRANSFER',
      status: 'status' in transaction ? transaction.status : 'COMPLETED',
      amount: 'status' in transaction 
        ? `${transaction.amount} ${transaction.tokenSymbol || 'ETH'}`
        : `${ethers.formatEther(transaction.value)} ETH`,
      from: transaction.from,
      to: transaction.to || '',
      date: 'timestamp' in transaction 
        ? new Date(transaction.timestamp).toLocaleString()
        : new Date().toLocaleString(),
      network: 'Ethereum',
      fee: formatGasPrice(transaction.gasPrice),
      explorer: getExplorerUrl(transaction.hash)
    };

    router.push({
      pathname: '/transaction-details',
      params: { transaction: JSON.stringify(formattedTransaction) }
    });
  };

  const renderTransactionList = () => {
    console.log('[TransactionHistory] Rendering transaction list:', {
      pending: pendingTransactions.length,
      completed: completedTransactions.length
    });

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      );
    }

    const allTransactions = [...pendingTransactions, ...completedTransactions];
    
    if (allTransactions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions found</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {allTransactions.map((item) => (
          <TouchableOpacity 
            key={item.hash}
            style={styles.transactionCard}
            onPress={() => handleTransactionPress(item)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.transactionType}>
                {getStatusIcon(item.status)} {item.type.replace('_', ' ')}
              </Text>
              <View style={styles.amountContainer}>
                <Text style={styles.amount}>
                  {item.amount} {item.tokenSymbol || 'ETH'}
                </Text>
                <Text style={styles.amountUsd}>
                  ${(Number(item.amount) * 1800).toFixed(2)}
                </Text>
              </View>
            </View>

            <Text style={styles.transactionAddress}>
              To: {item.to.slice(0, 6)}...{item.to.slice(-4)}
            </Text>
            
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>

            {item.error ? (
              <Text style={styles.errorText}>{item.error}</Text>
            ) : (
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={sharedStyles.container}>
      <Image 
        source={require('../assets/background.png')} 
        style={sharedStyles.backgroundImage}
      />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transaction History</Text>
      </View>
      
      {renderTransactionList()}
      
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: SPACING.lg,
    marginVertical: SPACING.sm,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  transactionType: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "600",
  },
  amountUsd: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  transactionAddress: {
    color: COLORS.white,
    fontSize: 16,
    marginBottom: SPACING.sm,
  },
  timestamp: {
    color: COLORS.white,
    fontSize: 16,
    marginBottom: SPACING.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: 'uppercase',
  },
  errorText: {
    color: "#F44336",
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.white,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.white,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  header: {
    padding: SPACING.lg,
    paddingTop: 40,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
}); 