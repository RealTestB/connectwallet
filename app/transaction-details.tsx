import BottomNav from "../components/ui/BottomNav";
import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS, SPACING, sharedStyles } from '../styles/shared';
import { Ionicons } from '@expo/vector-icons';

interface TransactionDetailsParams {
  transaction: string;
}

interface TransactionDetails {
  hash: string;
  type: string;
  status: string;
  amount: string;
  from: string;
  to: string;
  date: string;
  network: string;
  fee: string;
  explorer: string;
}

const TransactionDetailsScreen = () => {
  const { transaction } = useLocalSearchParams();
  const router = useRouter();
  const transactionDetails: TransactionDetails = JSON.parse(transaction as string);

  const handleBack = () => {
    router.back();
  };

  const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "#4CAF50";
      case "PENDING":
        return "#FFA726";
      case "FAILED":
        return "#F44336";
      default:
        return "#757575";
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "✅";
      case "PENDING":
        return "⏳";
      case "FAILED":
        return "❌";
      default:
        return "❓";
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
    <View style={sharedStyles.container}>
      <Image 
        source={require('../assets/background.png')} 
        style={sharedStyles.backgroundImage}
      />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleBack}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Transaction Details</Text>
        <View style={styles.backButton} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          {/* Transaction Type & Status */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {getStatusIcon(transactionDetails.status)} {transactionDetails.type.replace('_', ' ')}
            </Text>
            <Text style={[styles.statusText, { color: getStatusColor(transactionDetails.status) }]}>
              {transactionDetails.status}
            </Text>
          </View>

          {/* Amount */}
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>{transactionDetails.amount}</Text>
          </View>

          {/* Transaction Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.row}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>{transactionDetails.date}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>From</Text>
              <Text style={styles.value}>{transactionDetails.from}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>To</Text>
              <Text style={styles.value}>{transactionDetails.to}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Network</Text>
              <Text style={styles.value}>{transactionDetails.network}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Network Fee</Text>
              <Text style={styles.value}>{transactionDetails.fee}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Transaction Hash</Text>
              <Text style={styles.value} numberOfLines={1}>{transactionDetails.hash}</Text>
            </View>
          </View>

          {/* View on Explorer Button */}
          <TouchableOpacity
            style={styles.explorerButton}
            onPress={() => handleOpenExplorer(transactionDetails.explorer)}
          >
            <Text style={styles.explorerButtonText}>🔍 View on Explorer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav activeTab="portfolio" />
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
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
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  detailsContainer: {
    padding: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  label: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  explorerButton: {
    backgroundColor: COLORS.primary,
    margin: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  explorerButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TransactionDetailsScreen; 