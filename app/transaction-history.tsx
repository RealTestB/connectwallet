import { getTransactionHistory, Transaction } from "../api/transactionsApi";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View, ListRenderItem } from "react-native";
import { Network } from "alchemy-sdk";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TransactionResponse } from "ethers";
import { STORAGE_KEYS } from '../constants/storageKeys';

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

interface TransactionItem {
  id: string;
  hash: string;
  type: string;
  icon: string;
  amount?: string;
  address?: string;
  from: string;
  to: string;
  value?: string;
}

export default function TransactionHistoryScreen(): JSX.Element {
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<Network>(Network.ETH_MAINNET);

  useEffect(() => {
    loadWalletData();
  }, []);

  const handleAccountChange = (account: Account): void => {
    setWalletAddress(account.address);
    if (account.chainId) {
      // Convert chain ID to Alchemy Network enum
      const networkMap: { [key: number]: Network } = {
        1: Network.ETH_MAINNET,
        5: Network.ETH_GOERLI,
        137: Network.MATIC_MAINNET,
        80001: Network.MATIC_MUMBAI,
      };
      setNetworkId(networkMap[account.chainId] || Network.ETH_MAINNET);
    }
  };

  const loadWalletData = async (): Promise<void> => {
    try {
      const storedWalletAddress = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_ADDRESS);
      const storedNetworkId = await SecureStore.getItemAsync(STORAGE_KEYS.NETWORK.ID);

      if (storedWalletAddress) setWalletAddress(storedWalletAddress);
      if (storedNetworkId) {
        // Convert network ID to Alchemy Network enum
        const networkMap: { [key: string]: Network } = {
          "1": Network.ETH_MAINNET,
          "5": Network.ETH_GOERLI,
          "137": Network.MATIC_MAINNET,
          "80001": Network.MATIC_MUMBAI,
        };
        setNetworkId(networkMap[storedNetworkId] || Network.ETH_MAINNET);
      }

      if (storedWalletAddress) {
        await fetchTransactions(storedWalletAddress, networkId);
      }
    } catch (error) {
      console.error("Error loading wallet data:", error);
    }
  };

  const fetchTransactions = async (
    address: string,
    network: Network
  ): Promise<void> => {
    try {
      setIsLoading(true);

      const txData = await getTransactionHistory(address);
      if (!txData || 'error' in txData) {
        throw new Error('error' in txData ? txData.error?.toString() : "Failed to fetch transactions");
      }

      // Transform TransactionResponse into TransactionItem format
      const formattedTransactions: TransactionItem[] = txData.map((tx: TransactionResponse) => ({
        id: tx.hash,
        hash: tx.hash,
        type: 'Transfer', // Default to Transfer since TransactionResponse doesn't have category
        icon: '↔️',
        amount: tx.value ? (tx.from.toLowerCase() === address.toLowerCase() ? `-${tx.value.toString()}` : `+${tx.value.toString()}`) : undefined,
        address: tx.from.toLowerCase() === address.toLowerCase() ? tx.to || '' : tx.from,
        from: tx.from,
        to: tx.to || '',
        value: tx.value?.toString(),
      }));

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTransaction: ListRenderItem<TransactionItem> = ({ item }) => (
    <View style={styles.transactionCard}>
      <Text style={styles.transactionType}>{item.icon} {item.type}</Text>
      {item.amount && (
        <Text style={[
          styles.transactionAmount,
          { color: item.amount.startsWith("+") ? "#4CAF50" : "#F44336" }
        ]}>
          {item.amount}
        </Text>
      )}
      {item.address && (
        <Text style={styles.transactionAddress}>
          {item.type === "Swap" ? "via " : "From "}{item.address}
        </Text>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
      <WalletHeader 
        pageName="Transaction History" 
        onAccountChange={handleAccountChange}
      />

      <View style={[styles.content, { paddingTop: insets.top + 80 }]}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#fff" style={styles.loader} />
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={renderTransaction}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      <BottomNav activeTab="portfolio" />
    </LinearGradient>
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
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
  },
  transactionType: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  transactionAmount: {
    fontSize: 14,
    marginTop: 4,
  },
  transactionAddress: {
    color: "#93C5FD",
    fontSize: 12,
    marginTop: 4,
  },
}); 