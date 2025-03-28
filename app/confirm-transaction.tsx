import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, sharedStyles } from '../styles/shared';
import { transferToken } from '../api/tokensApi';
import WalletHeader from '../components/ui/WalletHeader';

export default function ConfirmTransactionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    amount: string;
    to: string;
    from: string;
    tokenSymbol: string;
    gasLimit: string;
    gasPrice: string;
    networkFee: string;
    total: string;
    tokenAddress?: string;
    decimals?: string;
  }>();

  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      
      if (params.tokenAddress && params.decimals) {
        // Token transfer
        const txHash = await transferToken({
          contractAddress: params.tokenAddress,
          toAddress: params.to,
          amount: params.amount,
          decimals: parseInt(params.decimals)
        });
        console.log('Transaction sent:', txHash);
      }
      
      // Navigate to success screen or back to portfolio
      router.push('/portfolio');
    } catch (error) {
      console.error('Transaction failed:', error);
      // Handle error (show error message)
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.title}>Review Transaction</Text>
            <View style={styles.backButton} />
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amount}>{params.amount} {params.tokenSymbol}</Text>
            <Text style={styles.fiatAmount}>$0.00</Text>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>From</Text>
              <View style={styles.addressContainer}>
                <Text style={styles.addressText}>{formatAddress(params.from)}</Text>
                <View style={styles.networkTag}>
                  <Text style={styles.networkText}>Ethereum Mainnet</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To</Text>
              <Text style={styles.addressText}>{formatAddress(params.to)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Network fee</Text>
              <View style={styles.feeContainer}>
                <Text style={styles.feeAmount}>{params.networkFee} ETH</Text>
                <Text style={styles.feeUsd}>$0.00</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Speed</Text>
              <View style={styles.speedContainer}>
                <Ionicons name="flash" size={16} color={COLORS.primary} />
                <Text style={styles.speedText}>Market (45 sec)</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <View style={styles.totalContainer}>
                <Text style={styles.totalAmount}>{params.total} ETH</Text>
                <Text style={styles.totalUsd}>$0.00</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        <TouchableOpacity
          style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={isLoading}
        >
          <Text style={styles.confirmButtonText}>
            {isLoading ? 'Confirming...' : 'Confirm Transaction'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
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
  fiatAmount: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  detailsContainer: {
    padding: SPACING.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 14,
    color: COLORS.white,
    marginRight: SPACING.sm,
  },
  networkTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  networkText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: SPACING.md,
  },
  feeContainer: {
    alignItems: 'flex-end',
  },
  feeAmount: {
    fontSize: 14,
    color: COLORS.white,
  },
  feeUsd: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  speedText: {
    fontSize: 12,
    color: COLORS.white,
    marginLeft: 4,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  totalUsd: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bottomBar: {
    padding: SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
}); 