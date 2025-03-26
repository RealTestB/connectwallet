import React, { useState, useCallback, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, ActivityIndicator, Dimensions } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../styles/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { getTokenPrice, getTokenPriceHistory, getNativeBalance } from '../api/tokensApi';
import { Network } from 'alchemy-sdk';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { LineChart } from 'react-native-wagmi-charts';

interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance: string;
  logo: string;
  price: number;
  balanceUSD: number;
  priceChange24h: number;
  isNative: boolean;
  priceHistory: Array<{
    timestamp: number;
    value: number;
  }>;
}

interface Account {
  address: string;
  chainId?: number;
}

export default function Portfolio(): JSX.Element {
  const [tokens, setTokens] = useState<Token[]>([
    {
      symbol: "ETH",
      name: "Ethereum",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      balance: "0",
      logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
      isNative: true,
      price: 0,
      balanceUSD: 0,
      priceChange24h: 0,
      priceHistory: []
    }
  ]);

  const [totalValue, setTotalValue] = useState<string>("0");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);

  // Add useEffect to refresh prices periodically
  useEffect(() => {
    if (currentAccount?.address) {
      handleRefresh();
      const interval = setInterval(handleRefresh, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [currentAccount]);

  const handleTokenPress = (token: Token): void => {
    console.log('Token pressed:', token.symbol);
  };

  const handleAccountChange = useCallback(async (account: Account) => {
    console.log('[Portfolio] Account changed:', account.address);
    setCurrentAccount(account);
    await handleRefresh();
  }, []);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      
      if (!currentAccount?.address) {
        console.log('[Portfolio] No account selected, skipping refresh');
        return;
      }

      console.log('[Portfolio] Refreshing balances for account:', currentAccount.address);
      
      // Get wallet data from SecureStore
      const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (!walletDataStr) {
        throw new Error('No wallet data found');
      }

      const walletData = JSON.parse(walletDataStr);
      console.log('[Portfolio] Got wallet data from SecureStore');
      
      // Update tokens with new prices, balances, and price history
      const updatedTokens = await Promise.all(tokens.map(async (token) => {
        try {
          // Use balance from wallet data for native token
          let balance = token.balance;
          if (token.isNative) {
            balance = walletData.balance || "0";
          }
          
          // Get price and 24h price history in parallel
          const [priceData, priceHistoryData] = await Promise.all([
            getTokenPrice(token.address),
            getTokenPriceHistory(token.address, 1) // 1 day instead of 7
          ]);

          // Transform price history data to match the expected format
          const priceHistory = priceHistoryData.map(([timestamp, value]) => ({
            timestamp,
            value
          }));

          return {
            ...token,
            balance,
            price: priceData?.price || 0,
            priceChange24h: priceData?.change24h || 0,
            balanceUSD: parseFloat(balance) * (priceData?.price || 0),
            priceHistory
          };
        } catch (error) {
          console.error(`[Portfolio] Error updating token ${token.symbol}:`, error);
          return {
            ...token,
            priceHistory: []
          };
        }
      }));

      console.log('[Portfolio] Setting updated tokens:', updatedTokens);
      setTokens(updatedTokens);
      
      // Calculate total value
      const total = updatedTokens.reduce((sum, token) => sum + (token.balanceUSD || 0), 0);
      setTotalValue(total.toFixed(2));
    } catch (error) {
      console.error('[Portfolio] Error refreshing portfolio:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderTokenCard = (token: Token) => {
    const priceChangeColor = (token.priceChange24h || 0) >= 0 ? "#4ADE80" : "#FF4D4D";
    const screenWidth = Dimensions.get('window').width;
    
    return (
      <TouchableOpacity 
        key={token.address}
        style={styles.tokenCard}
        onPress={() => handleTokenPress(token)}
      >
        <LinearGradient
          colors={['#1A2F6C', '#0A1B3F']}
          style={styles.cardBackground}
        >
          {/* Token Header */}
          <View style={styles.tokenHeader}>
            <View style={styles.tokenIconContainer}>
              <Image 
                source={{ uri: token.logo }} 
                style={styles.tokenIcon}
              />
            </View>
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenSymbol}>{token.symbol}</Text>
              <Text style={styles.tokenName}>{token.name}</Text>
            </View>
            <View style={styles.priceChangeContainer}>
              <Text style={[styles.priceChange, { color: priceChangeColor }]}>
                {(token.priceChange24h || 0) >= 0 ? "+" : ""}{(token.priceChange24h || 0).toFixed(2)}%
              </Text>
            </View>
          </View>

          {/* Price Chart */}
          {token.priceHistory.length > 0 ? (
            <View style={styles.chartContainer}>
              <LineChart.Provider data={token.priceHistory}>
                <LineChart height={100} width={screenWidth - 64}>
                  <LineChart.Path color={priceChangeColor} width={2} />
                  <LineChart.CursorCrosshair>
                    <LineChart.Tooltip />
                  </LineChart.CursorCrosshair>
                </LineChart>
              </LineChart.Provider>
            </View>
          ) : (
            <View style={styles.chartContainer}>
              <View style={[styles.chartLine, { backgroundColor: priceChangeColor }]} />
            </View>
          )}
          
          {/* Token Value */}
          <View style={styles.tokenValue}>
            <Text style={styles.tokenPrice}>
              1 {token.symbol} = ${(token.price || 0).toFixed(2)}
            </Text>
            <Text style={styles.tokenBalance}>
              {parseFloat(token.balance).toFixed(4)} {token.symbol}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <WalletHeader 
          onAccountChange={handleAccountChange}
        />

        {/* Portfolio Value */}
        <View style={styles.portfolioValue}>
          <Text style={styles.valueLabel}>Total Value</Text>
          <Text style={styles.valueAmount}>${totalValue}</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={isRefreshing || !currentAccount?.address}
          >
            {isRefreshing ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <Ionicons name="refresh" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Network Selection */}
        <View style={styles.networkContainer}>
          <View style={styles.networkSelector}>
            <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
            <Text style={styles.networkLabel}>Network:</Text>
            <Text style={styles.networkValue}>Ethereum Mainnet</Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {tokens.map(renderTokenCard)}
        </ScrollView>

        <BottomNav activeTab="portfolio" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1B3F',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  portfolioValue: {
    padding: SPACING.xl,
    alignItems: "center",
    position: 'relative',
  },
  valueLabel: {
    fontSize: 16,
    color: COLORS.white,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  valueAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.white,
  },
  refreshButton: {
    position: 'absolute',
    right: SPACING.xl,
    top: SPACING.xl + 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  networkSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: SPACING.sm,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  networkLabel: {
    fontSize: 14,
    color: COLORS.white,
  },
  networkValue: {
    fontSize: 14,
    color: COLORS.white,
    flex: 1,
  },
  listContent: {
    padding: SPACING.lg,
  },
  tokenCard: {
    marginBottom: SPACING.lg,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardBackground: {
    padding: SPACING.lg,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  tokenIconContainer: {
    marginRight: SPACING.md,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  tokenName: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 14,
  },
  priceChangeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartContainer: {
    height: 60,
    justifyContent: 'center',
    marginVertical: SPACING.md,
  },
  chartLine: {
    height: 2,
    opacity: 0.5,
    borderRadius: 1,
  },
  tokenValue: {
    marginTop: SPACING.sm,
  },
  tokenPrice: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  tokenBalance: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 14,
  },
}); 