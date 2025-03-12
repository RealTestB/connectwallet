import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";

type TransactionDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'transaction-details'>;
type TransactionDetailsScreenRouteProp = RouteProp<RootStackParamList, 'transaction-details'>;

interface Props {
  route: TransactionDetailsScreenRouteProp;
  navigation: TransactionDetailsScreenNavigationProp;
}

const TransactionDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { transaction } = route.params;

  const getStatusColor = (status?: string): string => {
    switch (status?.toLowerCase()) {
      case "success":
        return "green";
      case "pending":
        return "orange";
      case "failed":
        return "red";
      default:
        return "gray";
    }
  };

  const handleOpenExplorer = async (url: string): Promise<void> => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error("Cannot open explorer link:", url);
      }
    } catch (err) {
      console.error("Failed to open URL:", err);
    }
  };

  return (
    <View style={styles.container}>
      <WalletHeader 
        pageName="Transaction Details"
        onAccountChange={() => {
          // Transaction details screen doesn't need to handle account changes
        }}
      />
      <ScrollView>
        {/* Transaction Type & Amount */}
        <Text style={styles.title}>{transaction.type || "Transaction"}</Text>
        <Text
          style={[
            styles.amount,
            { color: transaction.amount?.startsWith("+") ? "green" : "red" },
          ]}
        >
          {transaction.amount || "N/A"}
        </Text>

        {/* Transaction Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.detailText}>
            📅 Date: {transaction.date || "N/A"}
          </Text>
          <Text style={styles.detailText}>
            ✅ Status:{" "}
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(transaction.status) },
              ]}
            >
              {transaction.status || "Unknown"}
            </Text>
          </Text>
          {transaction.to && (
            <Text style={styles.detailText}>📩 To: {transaction.to}</Text>
          )}
          {transaction.from && (
            <Text style={styles.detailText}>📤 From: {transaction.from}</Text>
          )}
          <Text style={styles.detailText}>
            🌐 Network: {transaction.network || "Unknown"}
          </Text>
          <Text style={styles.detailText}>
            💰 Network Fee: {transaction.fee || "N/A"}
          </Text>
        </View>

        {/* Provider Details (For Swaps) */}
        {transaction.provider && (
          <View style={styles.providerContainer}>
            <Text style={styles.detailText}>
              🔄 Provider: {transaction.provider}
            </Text>
            <Text style={styles.detailText}>
              💳 You Paid: {transaction.paid}
            </Text>
            <Text style={styles.detailText}>
              🎁 You Received: {transaction.received}
            </Text>
          </View>
        )}

        {/* View on Blockchain Explorer */}
        {transaction.explorer && (
          <TouchableOpacity
            onPress={() => void handleOpenExplorer(transaction.explorer!)}
            style={styles.explorerButton}
          >
            <Text style={styles.explorerButtonText}>🔍 View on Explorer</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <BottomNav activeTab="portfolio" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A2F6C",
    padding: 16,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  amount: {
    fontSize: 20,
    textAlign: "center",
  },
  detailsContainer: {
    backgroundColor: "#111",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  providerContainer: {
    backgroundColor: "#222",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  detailText: {
    color: "white",
  },
  statusText: {
    fontWeight: "bold",
  },
  explorerButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  explorerButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
});

export default TransactionDetailsScreen; 