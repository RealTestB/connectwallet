import { getTransactionHistory } from "../api/transactionsApi";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from "react-native";

const TransactionHistoryScreen = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState(null);
  const [networkId, setNetworkId] = useState(null);
  const [walletType, setWalletType] = useState(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const storedWalletAddress = await SecureStore.getItemAsync("walletAddress");
      const storedNetworkId = await SecureStore.getItemAsync("networkId");
      const storedWalletType = await SecureStore.getItemAsync("walletType");

      if (storedWalletAddress) setWalletAddress(storedWalletAddress);
      if (storedNetworkId) setNetworkId(parseInt(storedNetworkId));
      if (storedWalletType) setWalletType(storedWalletType);

      if (storedWalletAddress) {
        fetchTransactions(storedWalletAddress, storedNetworkId, storedWalletType);
      }
    } catch (error) {
      console.error("Error loading wallet data:", error);
    }
  };

  const fetchTransactions = async (walletAddress, networkId, walletType) => {
    try {
      setIsLoading(true);

      const txData = await getTransactionHistory(walletAddress, networkId, walletType);
      if (!txData || txData.error) {
        throw new Error(txData?.error || "Failed to fetch transactions");
      }

      setTransactions(txData);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionCard}>
      <Text style={styles.transactionType}>{item.icon} {item.type}</Text>
      {item.amount && (
        <Text style={[styles.transactionAmount, { color: item.amount.startsWith("+") ? "green" : "red" }]}>
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
      <WalletHeader />
      <Text style={styles.title}>Transaction History</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
        />
      )}

      <BottomNav />
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#1A2F6C",
    padding: 16,
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  transactionCard: {
    backgroundColor: "#111",
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
  },
  transactionType: {
    color: "white",
    fontWeight: "bold",
  },
  transactionAmount: {
    fontSize: 14,
  },
  transactionAddress: {
    color: "gray",
  },
};

export default TransactionHistoryScreen;

