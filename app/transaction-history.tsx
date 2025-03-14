import { getTransactionHistory, Transaction } from "../api/transactionsApi";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  ListRenderItem,
} from "react-native";
import { Network } from "alchemy-sdk";

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

interface TransactionItem extends Transaction {
  id: string;
  type: string;
  icon: string;
  amount?: string;
  address?: string;
}

export default function TransactionHistoryScreen(): JSX.Element {
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
      const storedWalletAddress = await SecureStore.getItemAsync("walletAddress");
      const storedNetworkId = await SecureStore.getItemAsync("networkId");

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

      const txData = await getTransactionHistory(address, network);
      if (!txData || 'error' in txData) {
        throw new Error('error' in txData ? txData.error?.toString() : "Failed to fetch transactions");
      }

      // Transform transactions into TransactionItem format
      const formattedTransactions: TransactionItem[] = txData.map((tx) => ({
        ...tx,
        id: tx.hash,
        type: tx.category === 'external' ? 'Transfer' : tx.category,
        icon: tx.category === 'external' ? '↔️' : '🔄',
        amount: tx.value ? (tx.from.toLowerCase() === address.toLowerCase() ? `-${tx.value}` : `+${tx.value}`) : undefined,
        address: tx.from.toLowerCase() === address.toLowerCase() ? tx.to : tx.from,
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
    <View style={styles.container}>
      <WalletHeader 
        pageName="Transaction History" 
        onAccountChange={handleAccountChange}
      />
      <Text style={styles.title}>Transaction History</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <BottomNav activeTab="portfolio" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1B3F",
  },
  listContainer: {
    padding: 16,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginVertical: 10,
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