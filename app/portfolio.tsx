import React, { useState, useCallback, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, ActivityIndicator, Dimensions } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../styles/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { getTokenPrice, getTokenPriceHistory, getNativeBalance } from '../api/tokensApi';
import { getStoredWallet } from '../api/walletApi';
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

  const handleTokenPress = (token: Token): void => {
    console.log('Token pressed:', token.symbol);
  };

  const handleAccountChange = useCallback(async (account: Account) => {
    console.log('[Portfolio] Account changed:', account.address);
    setCurrentAccount(account);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const loadData = async () => {
      if (currentAccount?.address) {
        await handleRefresh();
      }
    };

    loadData(); // Initial load

    // Set up interval for periodic updates - changed from 30 seconds to 2 minutes
    if (currentAccount?.address) {
      intervalId = setInterval(loadData, 120000); // 2 minutes
      console.log('[Portfolio] Set up refresh interval for 2 minutes');
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log('[Portfolio] Cleared refresh interval');
      }
    };
  }, [currentAccount]);

  const handleRefresh = async () => {
    let isActive = true;
    let timeoutId: NodeJS.Timeout | undefined;
    
    try {
      setIsRefreshing(true);
      console.log('[Portfolio] Starting refresh...');

      // Force stop the spinner after 3 seconds
      timeoutId = setTimeout(() => {
        if (isActive) {
          console.log('[Portfolio] Force stopping refresh spinner after 3 seconds');
          setIsRefreshing(false);
        }
      }, 3000);

      if (!currentAccount?.address) {
        console.log('[Portfolio] No account selected, skipping refresh');
        setIsRefreshing(false);
        if (timeoutId) clearTimeout(timeoutId);
        return;
      }

      console.log('[Portfolio] Getting stored wallet data...');
      const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (!walletDataStr) {
        console.log('[Portfolio] No wallet data found in storage');
        setIsRefreshing(false);
        if (timeoutId) clearTimeout(timeoutId);
        return;
      }

      const walletData = JSON.parse(walletDataStr);
      console.log('[Portfolio] Wallet data:', {
        hasAddress: !!walletData.address,
        hasBalance: !!walletData.balance,
        balance: walletData.balance
      });

      console.log('[Portfolio] Fetching ETH price data...');
      const priceData = await getTokenPrice("0x0000000000000000000000000000000000000000");
      console.log('[Portfolio] ETH price data received:', priceData);

      // Only update state if the component is still mounted and refresh hasn't been cancelled
      if (!isActive) {
        console.log('[Portfolio] Refresh was cancelled, skipping state updates');
        if (timeoutId) clearTimeout(timeoutId);
        return;
      }

      if (!priceData) {
        console.warn('[Portfolio] No price data received, keeping existing price data');
        if (timeoutId) clearTimeout(timeoutId);
        return;
      }

      // Create updated token with new data
      const balance = walletData.balance || "0";
      const updatedToken = {
        ...tokens[0],
        balance,
        price: priceData.price,
        priceChange24h: priceData.change24h || 0,
        balanceUSD: parseFloat(balance) * priceData.price,
        priceHistory: tokens[0].priceHistory // Keep existing price history if new one fails
      };

      console.log('[Portfolio] Fetching ETH price history...');
      const priceHistoryData = await getTokenPriceHistory("0x0000000000000000000000000000000000000000", 1);
      
      // Check again if we should continue
      if (!isActive) {
        console.log('[Portfolio] Refresh was cancelled, skipping state updates');
        if (timeoutId) clearTimeout(timeoutId);
        return;
      }

      console.log('[Portfolio] Price history received:', {
        points: priceHistoryData?.length,
        firstPoint: priceHistoryData?.[0],
        lastPoint: priceHistoryData?.[priceHistoryData.length - 1]
      });

      if (priceHistoryData && priceHistoryData.length > 0) {
        updatedToken.priceHistory = priceHistoryData.map(([timestamp, value]) => ({
          timestamp,
          value
        }));
      }

      console.log('[Portfolio] Updating token state:', {
        price: updatedToken.price,
        change24h: updatedToken.priceChange24h,
        balance: updatedToken.balance,
        balanceUSD: updatedToken.balanceUSD,
        historyPoints: updatedToken.priceHistory.length
      });

      setTokens([updatedToken]);
      setTotalValue(updatedToken.balanceUSD.toFixed(2));
      
      console.log('[Portfolio] State updated successfully');
    } catch (error) {
      console.error('[Portfolio] Error during refresh:', error);
      setIsRefreshing(false);
    } finally {
      // Clear the timeout if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Set refreshing to false one final time to ensure it's stopped
      setIsRefreshing(false);
      // Return cleanup function
      return () => {
        isActive = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
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