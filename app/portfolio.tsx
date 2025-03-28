import React, { useState, useCallback, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, ActivityIndicator, Dimensions, ImageBackground, Alert } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../styles/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { getNativeBalance, getTokenBalance } from '../api/tokensApi';
import { getTokenPrice, getTokenPriceHistory } from '../api/coingeckoApi';
import { getStoredWallet } from '../api/walletApi';
import { Network } from 'alchemy-sdk';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { LineChart } from 'react-native-wagmi-charts';
import { BlurView } from 'expo-blur';
import { ethers } from 'ethers';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface PriceHistoryResponse {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

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

interface WalletData {
  hasAddress: boolean;
  hasBalance: boolean;
  balance: string;
}

// Storage functions
const savePortfolioData = async (data: {
  tokens: Token[];
  totalValue: string;
  lastUpdate: number;
}) => {
  try {
    // Create a simplified version of the data for storage
    const storageData = {
      tokens: data.tokens.map(token => ({
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        decimals: token.decimals,
        balance: token.balance,
        logo: token.logo,
        price: token.price,
        balanceUSD: token.balanceUSD,
        priceChange24h: token.priceChange24h,
        isNative: token.isNative
        // Don't store priceHistory in SecureStore
      })),
      totalValue: data.totalValue,
      lastUpdate: data.lastUpdate
    };

    console.log('[Portfolio] Saving portfolio data:', {
      totalValue: storageData.totalValue,
      tokenCount: storageData.tokens.length,
      lastUpdate: new Date(storageData.lastUpdate).toISOString()
    });
    
    await SecureStore.setItemAsync(
      STORAGE_KEYS.PORTFOLIO_DATA,
      JSON.stringify(storageData)
    );
    
    console.log('[Portfolio] Successfully saved portfolio data to SecureStore');
  } catch (error) {
    console.error('[Portfolio] Error saving portfolio data:', error);
  }
};

const loadPortfolioData = async () => {
  try {
    console.log('[Portfolio] Loading portfolio data from SecureStore...');
    const data = await SecureStore.getItemAsync(STORAGE_KEYS.PORTFOLIO_DATA);
    if (data) {
      const parsed = JSON.parse(data);
      // Initialize priceHistory as empty array for each token
      const tokensWithEmptyHistory = parsed.tokens.map((token: any) => ({
        ...token,
        priceHistory: []
      }));
      
      console.log('[Portfolio] Successfully loaded portfolio data:', {
        totalValue: parsed.totalValue,
        tokenCount: parsed.tokens.length,
        lastUpdate: new Date(parsed.lastUpdate).toISOString()
      });
      return {
        ...parsed,
        tokens: tokensWithEmptyHistory
      };
    } else {
      console.log('[Portfolio] No saved portfolio data found');
    }
  } catch (error) {
    console.error('[Portfolio] Error loading portfolio data:', error);
  }
  return null;
};

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
      priceHistory: [] // Initialize empty, will be populated when we get data
    },
    {
      symbol: "WBTC",
      name: "Wrapped Bitcoin",
      address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC contract address
      decimals: 8,
      balance: "0",
      logo: "https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png",
      isNative: false,
      price: 0,
      balanceUSD: 0,
      priceChange24h: 0,
      priceHistory: [] // Initialize empty, will be populated when we get data
    }
  ]);

  const [totalValue, setTotalValue] = useState<string>("0");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const REFRESH_COOLDOWN = 5000; // 5 seconds cooldown between manual refreshes
  const [walletData, setWalletData] = useState<WalletData>({
    hasAddress: false,
    hasBalance: false,
    balance: '0'
  });

  const handleTokenPress = (token: Token): void => {
    console.log('Token pressed:', token.symbol);
  };

  const handleAccountChange = useCallback(async (account: Account) => {
    // Only update if the account has actually changed and we have an address
    if (account?.address && currentAccount?.address !== account.address) {
      console.log('[Portfolio] Account changed:', account.address);
      setCurrentAccount(account);
    }
  }, [currentAccount?.address]);

  useEffect(() => {
    const init = async () => {
      try {
        // Load saved data first
        const savedData = await loadPortfolioData();
        if (savedData) {
          setTokens(savedData.tokens);
          setTotalValue(savedData.totalValue);
          console.log('[Portfolio] Loaded initial data from storage with chart data');
        }

        // Check for wallet data only if we don't have an account
        if (!currentAccount?.address) {
          const walletData = await getStoredWallet();
          if (walletData?.address) {
            handleAccountChange({ address: walletData.address });
          }
        }
      } catch (error) {
        console.error('[Portfolio] Error during initialization:', error);
        Alert.alert(
          "Error",
          "Failed to initialize app. Please try again.",
          [{ text: "OK" }]
        );
      }
    };

    init();
  }, []); // Only run once on mount

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    
    const loadData = async () => {
      if (!isMounted || !currentAccount?.address) return;
      
      // Skip if we're already refreshing
      if (isRefreshing) {
        console.log('[Portfolio] Already refreshing, skipping interval refresh');
        return;
      }
      
      await handleRefresh();
    };

    // Only set up interval if we have an account
    if (currentAccount?.address) {
      loadData(); // Initial load
      intervalId = setInterval(loadData, 120000); // 2 minutes
      console.log('[Portfolio] Set up refresh interval for 2 minutes');
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
        console.log('[Portfolio] Cleared refresh interval');
      }
    };
  }, [currentAccount?.address]); // Only depend on the address

  const handleRefresh = async () => {
    if (isRefreshing) {
      console.log('[Portfolio] Already refreshing, skipping');
      return;
    }

    const now = Date.now();
    if (now - lastRefreshTime < REFRESH_COOLDOWN) {
      console.log('[Portfolio] Too soon to refresh, skipping');
      return;
    }

    console.log('[Portfolio] Starting refresh...');
    setIsRefreshing(true);
    setLastRefreshTime(now);
    
    try {
      // Get stored wallet data
      console.log('[Portfolio] Getting stored wallet data...');
      const walletData = await getStoredWallet();
      
      if (!walletData?.address) {
        throw new Error('No wallet address found');
      }

      // Handle ETH and WBTC updates independently
      const updateToken = async (token: Token) => {
        try {
          if (token.isNative) {
            // Fetch ETH data
            console.log('[Portfolio] Fetching ETH data...');
            const [priceHistory, hexBalance, priceData] = await Promise.all([
              getTokenPriceHistory('0x0000000000000000000000000000000000000000'),
              getNativeBalance(walletData.address),
              getTokenPrice('0x0000000000000000000000000000000000000000')
            ]);

            if (!priceHistory || !hexBalance || !priceData) {
              throw new Error('Failed to fetch ETH data');
            }

            // Process ETH price history
            let mappedPriceHistory: Array<{ timestamp: number; value: number }> = [];
            if (priceHistory.prices.length >= 280) {
              const points = priceHistory.prices.slice(-280);
              mappedPriceHistory = points.map(([timestamp, price]) => ({
                timestamp,
                value: price
              }));
            }

            const balance = ethers.formatEther(hexBalance);
            const balanceNum = parseFloat(balance);
            const balanceUSD = balanceNum * (priceData?.price || 0);

            return {
              ...token,
              balance,
              balanceUSD,
              price: priceData?.price || token.price,
              priceChange24h: priceData?.change24h || token.priceChange24h,
              priceHistory: mappedPriceHistory
            };
          } else {
            // Fetch WBTC data
            console.log('[Portfolio] Fetching WBTC data...');
            
            // First get price data and history since these don't need RPC
            const [priceHistory, priceData] = await Promise.all([
              getTokenPriceHistory(token.address),
              getTokenPrice(token.address)
            ]);

            console.log('[Portfolio] WBTC price data received:', priceData);

            // Process price history first so we at least have the chart
            let mappedPriceHistory: Array<{ timestamp: number; value: number }> = [];
            if (priceHistory?.prices?.length >= 280) {
              const points = priceHistory.prices.slice(-280);
              mappedPriceHistory = points.map(([timestamp, price]) => ({
                timestamp,
                value: price
              }));
            }

            // Try to get balance with a shorter timeout
            let balance = '0';
            try {
              console.log('[Portfolio] Attempting to fetch WBTC balance...');
              balance = await Promise.race([
                getTokenBalance(token.address, walletData.address),
                new Promise<string>((_, reject) => 
                  setTimeout(() => reject(new Error('Balance fetch timeout')), 5000)
                )
              ]);
              console.log('[Portfolio] WBTC balance fetched successfully');
            } catch (error) {
              console.warn('[Portfolio] WBTC balance fetch failed, using 0:', error);
              // Keep balance as '0'
            }

            const balanceNum = parseFloat(balance || '0');
            const balanceUSD = balanceNum * (priceData?.price || 0);

            // Calculate 24h price change
            const priceChange24h = typeof priceData?.change24h === 'number' 
              ? priceData.change24h 
              : (priceHistory?.prices?.length >= 2 
                ? ((priceHistory.prices[priceHistory.prices.length - 1][1] - priceHistory.prices[0][1]) / priceHistory.prices[0][1]) * 100
                : 0);

            console.log('[Portfolio] WBTC data prepared:', {
              price: priceData?.price,
              priceChange24h,
              historyPoints: mappedPriceHistory.length,
              balance: balanceNum,
              firstPrice: priceHistory?.prices?.[0]?.[1],
              lastPrice: priceHistory?.prices?.[priceHistory.prices.length - 1]?.[1]
            });

            // Return token with whatever data we managed to get
            return {
              ...token,
              balance: balance || '0',
              balanceUSD,
              price: priceData?.price || token.price,
              priceChange24h,
              priceHistory: mappedPriceHistory
            };
          }
        } catch (error) {
          console.error(`[Portfolio] Error updating ${token.symbol}:`, error);
          return token; // Return unchanged token on error
        }
      };

      // Update tokens independently
      const updatedTokens = await Promise.all(tokens.map(updateToken));
      const newTotalValue = updatedTokens.reduce((total, token) => total + (token.balanceUSD || 0), 0).toFixed(2);

      console.log('[Portfolio] Updating state with:', {
        tokenCount: updatedTokens.length,
        totalValue: newTotalValue,
        tokens: updatedTokens.map(t => ({
          symbol: t.symbol,
          priceHistoryPoints: t.priceHistory.length,
          balance: t.balance,
          price: t.price
        }))
      });

      // Update state with final data
      setTokens(updatedTokens);
      setTotalValue(newTotalValue);
      setWalletData({
        hasAddress: true,
        hasBalance: true,
        balance: updatedTokens.find(t => t.isNative)?.balance || '0'
      });

      // Save updated data to storage
      await savePortfolioData({
        tokens: updatedTokens,
        totalValue: newTotalValue,
        lastUpdate: now
      });

      console.log('[Portfolio] Successfully updated all data and saved to storage');
    } catch (error) {
      console.error('[Portfolio] Error during refresh:', error);
      Alert.alert(
        "Update Failed",
        "Failed to update portfolio data. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderTokenCard = (token: Token) => {
    const chartData = token.priceHistory;

    // Always log chart data to track what we're showing
    console.log('[Portfolio] Chart data prepared:', {
      symbol: token.symbol,
      totalPoints: chartData.length,
      allPoints: chartData.map(p => ({
        time: new Date(p.timestamp).toISOString(),
        value: p.value
      })),
      currentPrice: token.price,
      priceChange24h: token.priceChange24h
    });

    const priceChangeColor = (token.priceChange24h || 0) >= 0 ? "#D3F8A6" : "#FF5C5C";
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = screenWidth - (SPACING.lg * 2);
    const chartWidth = cardWidth;
    
    // Format values
    const pricePerCoin = token.price ? `$${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
    const formattedBalance = parseFloat(token.balance || '0').toFixed(4);
    const formattedBalanceUSD = token.balanceUSD ? `$${token.balanceUSD.toFixed(2)}` : '$0.00';
    const formattedPriceChange = (token.priceChange24h || 0).toFixed(2);

    return (
      <TouchableOpacity 
        key={token.address}
        style={styles.tokenCard}
        onPress={() => handleTokenPress(token)}
      >
        <View style={[styles.cardBlur, { backgroundColor: 'rgba(41, 40, 40, 0.25)' }]}>
          <View style={styles.cardContent}>
            {/* Top row */}
            <View style={styles.topRow}>
              {/* Left side - Token info */}
              <View style={styles.tokenHeader}>
                <View style={styles.tokenIconContainer}>
                  <Image 
                    source={{ uri: token.logo }} 
                    style={[styles.tokenIcon]}
                    resizeMode="contain"
                  />
                  <View style={styles.tokenIconOverlay} />
                </View>
                <View style={styles.tokenDetails}>
                  <View style={styles.tokenTitleRow}>
                    <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                    <Text style={[styles.priceChange, { color: priceChangeColor }]}>
                      {(token.priceChange24h || 0) >= 0 ? "+" : ""}{formattedPriceChange}%
                    </Text>
                  </View>
                  <Text style={styles.tokenName}>{token.name}</Text>
                </View>
              </View>

              {/* Right side - Values */}
              <View style={styles.valueContainer}>
                <View style={styles.balanceRow}>
                  <Text style={styles.tokenBalance}>{formattedBalance} {token.symbol}</Text>
                  <Text style={styles.tokenBalanceUSD}>{formattedBalanceUSD}</Text>
                </View>
                <Text style={styles.tokenPrice}>{pricePerCoin}</Text>
              </View>
            </View>

            {/* Chart */}
            <View style={styles.chartWrapper}>
              <View style={styles.chartContainer}>
                {chartData.length > 0 ? (
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <LineChart.Provider 
                      data={chartData}
                    >
                      <LineChart 
                        height={80} 
                        width={chartWidth}
                      >
                        <LineChart.Path 
                          color={priceChangeColor} 
                          width={2}
                        >
                          <LineChart.Gradient />
                        </LineChart.Path>
                        <LineChart.CursorCrosshair />
                      </LineChart>
                    </LineChart.Provider>
                  </GestureHandlerRootView>
                ) : (
                  <View style={styles.emptyChart}>
                    <Text style={styles.emptyChartText}>Loading price history...</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('../assets/background.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
        imageStyle={{ width: '100%', height: '100%' }}
      >
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
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
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
    marginBottom: SPACING.md,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBlur: {
    padding: SPACING.md,
    paddingBottom: 0,
  },
  cardContent: {
    gap: SPACING.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.sm,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  tokenIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tokenIcon: {
    width: '70%',
    height: '70%',
  },
  tokenIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  tokenDetails: {
    gap: 2,
  },
  tokenTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  tokenSymbol: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  tokenName: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 12,
  },
  priceChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  valueContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tokenBalance: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  tokenBalanceUSD: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  tokenPrice: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 12,
  },
  chartWrapper: {
    height: 80,
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: -SPACING.md,
  },
  chartContainer: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
  },
  chartLine: {
    height: 2,
    opacity: 0.5,
  },
  emptyChart: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 12,
  },
}); 