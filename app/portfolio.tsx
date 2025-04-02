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
import { getWalletTokenBalances } from '../api/tokensApi';
import { supabaseAdmin } from '../lib/supabase';
import { calculateTokenBalanceUSD } from "../utils/tokenUtils";

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
  balanceUSD: string;
  priceUSD: string;
  priceChange24h: number;
  logo: string;
  lastUpdate: string;
  isNative: boolean;
  chain_id: number;
  priceHistory: {
    prices: [number, number][];
    market_caps: [number, number][];
    total_volumes: [number, number][];
  };
}

interface Account {
  address: string;
  chainId?: number;
}

interface WalletData {
  address: string;
  type: "classic";
  chainId?: number;
  hasPassword?: boolean;
}

interface ChartData {
  symbol: string;
  data: { timestamp: number; value: number }[];
  currentPrice: string;
  priceChange24h: number;
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
        priceUSD: token.priceUSD,
        balanceUSD: token.balanceUSD,
        priceChange24h: token.priceChange24h,
        isNative: token.isNative
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
        priceHistory: {
          prices: [],
          market_caps: [],
          total_volumes: []
        }
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

// Token logo mapping
const TOKEN_LOGOS: { [key: string]: string } = {
  'ETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  'WETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  'WBTC': 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png'
};

export default function Portfolio(): JSX.Element {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [totalValue, setTotalValue] = useState<string>("0");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const REFRESH_COOLDOWN = 5000; // 5 seconds cooldown between manual refreshes
  const [walletData, setWalletData] = useState<WalletData>({
    address: '',
    type: 'classic',
    chainId: undefined,
    hasPassword: undefined
  });
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [currentChainId, setCurrentChainId] = useState<number>(1); // Default to Ethereum mainnet

  const handleTokenPress = (token: Token): void => {
    console.log('Token pressed:', token.symbol);
  };

  const handleAccountChange = useCallback(async (account: Account) => {
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
  }, [currentAccount?.address]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      console.log("Starting portfolio refresh...");

      // Get stored wallet data
      const storedWalletData = await getStoredWallet();
      console.log("Stored wallet data:", storedWalletData);

      if (!storedWalletData?.address) {
        throw new Error("No wallet address found in stored data");
      }

      // Get wallet from Supabase first
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from("wallets")
        .select("id, public_address")
        .eq("public_address", storedWalletData.address.toLowerCase())
        .maybeSingle();

      if (walletError) {
        console.error("Error fetching wallet:", walletError);
        throw new Error("Failed to fetch wallet data");
      }

      if (!wallet) {
        console.error("No wallet found for address:", storedWalletData.address);
        throw new Error("Wallet not found");
      }

      // Fetch token balances using wallet ID
      console.log("Fetching token balances for wallet ID:", wallet.id);
      const supabaseTokens = await getWalletTokenBalances(wallet.id);
      console.log("Fetched tokens from Supabase:", supabaseTokens);

      if (!supabaseTokens || supabaseTokens.length === 0) {
        console.log("No tokens found in Supabase");
        setTokens([]);
        return;
      }

      // Filter tokens by current chain ID
      const chainTokens = supabaseTokens.filter(token => token.chain_id === currentChainId);
      console.log(`Filtered tokens for chain ${currentChainId}:`, chainTokens);

      // Map Supabase tokens to Token interface
      const mappedTokens: Token[] = chainTokens.map((token) => ({
        symbol: token.symbol,
        name: token.name,
        address: token.token_address,
        decimals: token.decimals || 18,
        balance: token.balance || "0",
        balanceUSD: "0",
        priceUSD: "0",
        priceChange24h: 0,
        logo: TOKEN_LOGOS[token.symbol] || TOKEN_LOGOS.ETH,
        lastUpdate: token.timestamp,
        isNative: token.token_address === "0x0000000000000000000000000000000000000000",
        priceHistory: {
          prices: [],
          market_caps: [],
          total_volumes: []
        },
        chain_id: token.chain_id
      }));

      console.log("Mapped tokens:", mappedTokens);

      // Update each token's data
      const updatedTokens = await Promise.all(
        mappedTokens.map(async (token) => {
          try {
            // Get token balance
            const balance = await getTokenBalance(
              storedWalletData.address,
              token.address
            );
            console.log(`Balance for ${token.symbol}:`, balance);

            // Get token price data
            const priceData = await getTokenPrice(token.address, token.chain_id);
            console.log(`Price data for ${token.symbol}:`, priceData);

            // Get price history data
            const priceHistory = await getTokenPriceHistory(token.address, token.chain_id);
            console.log(`Price history for ${token.symbol}:`, priceHistory);

            return {
              ...token,
              balance: balance || "0",
              balanceUSD: calculateTokenBalanceUSD(
                balance || "0",
                priceData?.price?.toString() || "0",
                token.decimals
              ),
              priceUSD: priceData?.price?.toString() || "0",
              priceChange24h: priceData?.change24h || 0,
              lastUpdate: new Date().toISOString(),
              priceHistory: priceHistory || {
                prices: [],
                market_caps: [],
                total_volumes: []
              }
            };
          } catch (error) {
            console.error(`Failed to update ${token.symbol} data:`, error);
            return {
              ...token,
              priceHistory: {
                prices: [],
                market_caps: [],
                total_volumes: []
              }
            };
          }
        })
      );

      console.log("Setting updated tokens:", updatedTokens);
      setTokens(updatedTokens);

      // Prepare chart data
      const chartData = updatedTokens.map((token) => {
        const chartPoints = token.priceHistory.prices.map(([timestamp, price]) => ({
          timestamp: timestamp,
          value: price,
        }));
        console.log(`[Portfolio] Chart data prepared:`, {
          symbol: token.symbol,
          totalPoints: chartPoints.length,
          allPoints: chartPoints,
          currentPrice: token.priceUSD,
          priceChange24h: token.priceChange24h,
        });
        return {
          symbol: token.symbol,
          data: chartPoints,
          currentPrice: token.priceUSD,
          priceChange24h: token.priceChange24h,
        };
      });

      // Update chart data state
      setChartData(chartData);
    } catch (error) {
      console.error("Failed to refresh portfolio:", error);
      Alert.alert("Error", "Failed to refresh portfolio. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderTokenCard = (token: Token) => {
    // Create chart data from price history
    const chartPoints = token.priceHistory?.prices?.map(([timestamp, price]) => ({
      timestamp,
      value: price,
    })) || [];

    // Always log chart data to track what we're showing
    console.log(`[Portfolio] Chart data prepared for ${token.symbol}:`, {
      totalPoints: chartPoints.length,
      samplePoints: chartPoints.slice(0, 3),
      currentPrice: token.priceUSD,
      priceChange24h: token.priceChange24h
    });

    const priceChangeColor = (token.priceChange24h || 0) >= 0 ? "#D3F8A6" : "#FF5C5C";
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = screenWidth - (SPACING.lg * 2);
    const chartWidth = cardWidth;

    // Format values
    const pricePerCoin = token.priceUSD ? `$${parseFloat(token.priceUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
    const formattedBalance = parseFloat(token.balance || '0').toFixed(4);
    const formattedBalanceUSD = token.balanceUSD ? `$${parseFloat(token.balanceUSD).toFixed(2)}` : '$0.00';
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
                {chartPoints.length > 0 ? (
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <LineChart.Provider 
                      data={chartPoints}
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