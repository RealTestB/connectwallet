import React, { useState, useCallback, useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, ActivityIndicator, Dimensions, ImageBackground, Alert, Modal, TouchableWithoutFeedback, Animated } from "react-native";
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
import { useRouter } from 'expo-router';
import { CHAINS, getChainById } from '../constants/chains';

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

const MODAL_HEIGHT = Dimensions.get('window').height * 0.7;

// Storage functions
const savePortfolioData = async (data: {
  tokens: Token[];
  totalValue: string;
  lastUpdate: number;
  chainId: number;
}) => {
  try {
    // Create a minimal version of the data for storage
    const storageData = {
      tokens: data.tokens.map(token => ({
        symbol: token.symbol,
        address: token.address,
        balance: token.balance,
        balanceUSD: token.balanceUSD,
        isNative: token.isNative,
        chain_id: token.chain_id
      })),
      totalValue: data.totalValue,
      lastUpdate: data.lastUpdate,
      chainId: data.chainId
    };

    const dataString = JSON.stringify(storageData);
    console.log('[Portfolio] Saving portfolio data:', {
      chainId: data.chainId,
      totalValue: storageData.totalValue,
      tokenCount: storageData.tokens.length,
      lastUpdate: new Date(storageData.lastUpdate).toISOString(),
      dataSize: dataString.length
    });
    
    if (dataString.length > 2000) {
      console.warn('[Portfolio] Data size exceeds recommended limit, saving only total value');
      await SecureStore.setItemAsync(
        STORAGE_KEYS.PORTFOLIO_DATA,
        JSON.stringify({
          totalValue: data.totalValue,
          lastUpdate: data.lastUpdate,
          chainId: data.chainId
        })
      );
    } else {
      await SecureStore.setItemAsync(
        STORAGE_KEYS.PORTFOLIO_DATA,
        dataString
      );
    }
    
    console.log('[Portfolio] Successfully saved portfolio data to SecureStore');
  } catch (error) {
    console.error('[Portfolio] Error saving portfolio data:', error);
  }
};

const loadPortfolioData = async (chainId: number) => {
  try {
    console.log('[Portfolio] Loading portfolio data from SecureStore...', { chainId });
    const data = await SecureStore.getItemAsync(STORAGE_KEYS.PORTFOLIO_DATA);
    if (data) {
      const parsed = JSON.parse(data);
      
      // If we only have total value, return minimal data
      if (!parsed.tokens) {
        return {
          tokens: [],
          totalValue: parsed.totalValue || "0",
          lastUpdate: parsed.lastUpdate || Date.now(),
          chainId: chainId // Always use the provided chainId
        };
      }
      
      // Filter tokens by chain ID
      const chainTokens = parsed.tokens.filter((token: any) => token.chain_id === chainId);
      
      // Initialize minimal token data
      const tokensWithDefaults = chainTokens.map((token: any) => ({
        ...token,
        name: token.name || token.symbol,
        decimals: token.decimals || 18,
        priceUSD: "0",
        priceChange24h: 0,
        logo: getTokenLogo(token.symbol, token.address, chainId), // Use the provided chainId
        lastUpdate: parsed.lastUpdate,
        priceHistory: {
          prices: [],
          market_caps: [],
          total_volumes: []
        }
      }));
      
      console.log('[Portfolio] Successfully loaded portfolio data:', {
        chainId,
        totalValue: parsed.totalValue,
        tokenCount: chainTokens.length,
        lastUpdate: new Date(parsed.lastUpdate).toISOString()
      });
      
      return {
        tokens: tokensWithDefaults,
        totalValue: parsed.totalValue,
        lastUpdate: parsed.lastUpdate,
        chainId // Always use the provided chainId
      };
    } else {
      console.log('[Portfolio] No saved portfolio data found');
    }
  } catch (error) {
    console.error('[Portfolio] Error loading portfolio data:', error);
  }
  return null;
};

const getChainPath = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return 'ethereum';
    case 137:
      return 'polygon';
    case 42161:
      return 'arbitrum';
    case 10:
      return 'optimism';
    case 56:
      return 'smartchain';
    case 43114:
      return 'avalanche';
    default:
      return 'ethereum';
  }
};

const getTokenLogo = (symbol: string, tokenAddress: string, chainId: number = 1): string => {
  const chainPath = getChainPath(chainId);
  
  // For native tokens
  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    switch (chainId) {
      case 137:
        return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png";
      case 42161:
        return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png";
      case 10:
        return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png";
      case 56:
        return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png";
      case 43114:
        return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanche/info/logo.png";
      default:
        return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png";
    }
  }

  // Try multiple sources in order of reliability
  const sources = [
    // 1. 1inch Protocol Token Logo API (most reliable for verified tokens)
    chainId === 1 ? `https://tokens.1inch.io/${tokenAddress.toLowerCase()}.png` : 
    chainId === 137 ? `https://tokens.1inch.io/polygon/${tokenAddress.toLowerCase()}.png` :
    chainId === 42161 ? `https://tokens.1inch.io/arbitrum/${tokenAddress.toLowerCase()}.png` :
    chainId === 10 ? `https://tokens.1inch.io/optimism/${tokenAddress.toLowerCase()}.png` :
    `https://tokens.1inch.io/${tokenAddress.toLowerCase()}.png`,
    
    // 2. Trustwallet Assets (fallback for verified tokens)
    `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainPath}/assets/${tokenAddress}/logo.png`,
    
    // 3. Default chain-specific placeholder
    `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainPath}/info/logo.png`
  ];

  // Return the first source - the Image component will naturally fall back to the next source if one fails
  return sources[0];
};

export default function Portfolio(): JSX.Element {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [totalValue, setTotalValue] = useState<string>("0");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number>(1);
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
  const router = useRouter();
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<Array<{id: string, public_address: string, chain_name: string}>>([]);

  // Load initial chain ID from storage
  useEffect(() => {
    const loadInitialChain = async () => {
      try {
        // First try to get from wallet data
        const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
        if (walletDataStr) {
          const walletData = JSON.parse(walletDataStr);
          if (walletData.chainId) {
            console.log('[Portfolio] Loading chain ID from wallet data:', walletData.chainId);
            setCurrentChainId(walletData.chainId);
            return;
          }
        }

        // If not in wallet data, try settings
        const lastUsedNetwork = await SecureStore.getItemAsync(STORAGE_KEYS.SETTINGS.LAST_USED_NETWORK);
        if (lastUsedNetwork && CHAINS[lastUsedNetwork]) {
          console.log('[Portfolio] Loading chain ID from settings:', CHAINS[lastUsedNetwork].chainId);
          setCurrentChainId(CHAINS[lastUsedNetwork].chainId);
          return;
        }

        // Default to Ethereum mainnet if nothing found
        console.log('[Portfolio] No stored chain ID found, defaulting to Ethereum mainnet');
        setCurrentChainId(1);
      } catch (error) {
        console.error('[Portfolio] Error loading initial chain ID:', error);
        setCurrentChainId(1); // Default to Ethereum mainnet on error
      }
    };

    loadInitialChain();
  }, []);

  const handleTokenPress = (token: Token): void => {
    console.log('Token pressed:', token.symbol);
  };

  const handleAccountChange = useCallback(async (account: Account) => {
    if (account?.address && currentAccount?.address !== account.address) {
      console.log('[Portfolio] Account changed:', account.address);
      setCurrentAccount(account);
    }
  }, [currentAccount?.address]);

  // Simple close modal function for wallet selector
  const handleCloseModal = useCallback(() => {
    setShowWalletSelector(false);
  }, []);

  // Manual refresh function
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);

      // Get stored wallet data
      const storedWalletData = await getStoredWallet();
      if (!storedWalletData?.address) {
        throw new Error("No wallet address found");
      }

      // Get token balances for the current chain and wallet address
      const { data: tokenBalances, error: tokenError } = await supabaseAdmin
        .from("token_balances")
        .select("*")
        .eq("public_address", storedWalletData.address.toLowerCase())
        .eq("chain_id", currentChainId);

      if (tokenError) {
        throw new Error("Failed to fetch token balances");
      }

      // Map and update tokens with fresh data
      const updatedTokens = await Promise.all(
        tokenBalances.map(async (token) => {
          try {
            const balance = await getTokenBalance(token.token_address, storedWalletData.address);
            const priceData = await getTokenPrice(token.token_address, token.chain_id);
            const priceHistory = await getTokenPriceHistory(token.token_address, token.chain_id);
            const balanceUSD = calculateTokenBalanceUSD(
              balance || "0",
              priceData?.price?.toString() || "0",
              token.decimals
            );

            return {
              symbol: token.symbol,
              name: token.name,
              address: token.token_address,
              decimals: token.decimals || 18,
              balance: balance || "0",
              balanceUSD: balanceUSD,
              priceUSD: priceData?.price?.toString() || "0",
              priceChange24h: priceData?.change24h || 0,
              logo: getTokenLogo(token.symbol, token.token_address, token.chain_id),
              lastUpdate: new Date().toISOString(),
              isNative: token.token_address === "0x0000000000000000000000000000000000000000",
              priceHistory: priceHistory || {
                prices: [],
                market_caps: [],
                total_volumes: []
              },
              chain_id: token.chain_id
            };
          } catch (error) {
            return null;
          }
        })
      );

      // Filter out failed token updates
      const validTokens = updatedTokens.filter((token): token is Token => token !== null);

      // Calculate total value
      const totalValue = validTokens.reduce((sum, token) => {
        return sum + parseFloat(token.balanceUSD || "0");
      }, 0);

      // Update state
      setTokens(validTokens);
      setTotalValue(totalValue.toFixed(2));

      // Save to storage
      await savePortfolioData({
        tokens: validTokens,
        totalValue: totalValue.toFixed(2),
        lastUpdate: Date.now(),
        chainId: currentChainId
      });

    } catch (error) {
      Alert.alert("Error", "Failed to refresh portfolio");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleChainChange = useCallback(async (chainId: number) => {
    console.log('[Portfolio] Chain change received:', {
      newChainId: chainId,
      currentChainId,
      currentAccount: currentAccount?.address
    });
    
    try {
      // 1. Update current chain ID
      setCurrentChainId(chainId);
      
      // 2. Update current account with new chain ID
      if (currentAccount) {
        const updatedAccount = { ...currentAccount, chainId };
        setCurrentAccount(updatedAccount);
      }
      
      // 3. Clear existing data
      setTokens([]);
      setTotalValue("0");
      
      // 4. Load and save portfolio data for the new chain
      const savedData = await loadPortfolioData(chainId);
      if (savedData) {
        setTokens(savedData.tokens);
        setTotalValue(savedData.totalValue);
        
        // Save updated portfolio data with new chain
        await savePortfolioData({
          tokens: savedData.tokens,
          totalValue: savedData.totalValue,
          lastUpdate: Date.now(),
          chainId
        });
      }
    } catch (error) {
      console.error('[Portfolio] Error handling chain change:', error);
      Alert.alert('Error', 'Failed to update portfolio for new network');
    }
  }, [currentChainId, currentAccount]);

  // Add effect to handle chain changes
  useEffect(() => {
    if (currentChainId) {
      console.log('[Portfolio] Chain changed, reloading data:', currentChainId);
      loadPortfolioData(currentChainId);
    }
  }, [currentChainId]);

  useEffect(() => {
    const init = async () => {
      try {
        // Load saved data first for current chain
        const savedData = await loadPortfolioData(currentChainId);
        if (savedData) {
          setTokens(savedData.tokens);
          setTotalValue(savedData.totalValue);
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
  }, []); // Remove currentChainId dependency

  // Separate effect for chain changes - only trigger when chain actually changes
  useEffect(() => {
    const loadChainData = async () => {
      try {
        console.log('[Portfolio] Starting to load chain data:', {
          chainId: currentChainId,
          currentAccount: currentAccount?.address
        });
        
        setIsRefreshing(true);
        // Get stored wallet data
        const storedWalletData = await getStoredWallet();
        if (!storedWalletData?.address) {
          throw new Error("No wallet address found");
        }

        console.log('[Portfolio] Fetching token balances for:', {
          address: storedWalletData.address,
          chainId: currentChainId
        });

        // Get token balances for the current chain and wallet address
        const { data: tokenBalances, error: tokenError } = await supabaseAdmin
          .from("token_balances")
          .select("*")
          .eq("public_address", storedWalletData.address.toLowerCase())
          .eq("chain_id", currentChainId);

        if (tokenError) {
          console.error('[Portfolio] Error fetching token balances:', tokenError);
          throw new Error("Failed to fetch token balances");
        }

        console.log('[Portfolio] Token balances fetched:', {
          count: tokenBalances?.length || 0,
          chainId: currentChainId
        });

        // Map and update tokens with fresh data
        const updatedTokens = await Promise.all(
          tokenBalances.map(async (token) => {
            try {
              const balance = await getTokenBalance(token.token_address, storedWalletData.address);
              const priceData = await getTokenPrice(token.token_address, token.chain_id);
              const priceHistory = await getTokenPriceHistory(token.token_address, token.chain_id);
              const balanceUSD = calculateTokenBalanceUSD(
                balance || "0",
                priceData?.price?.toString() || "0",
                token.decimals
              );

              return {
                symbol: token.symbol,
                name: token.name,
                address: token.token_address,
                decimals: token.decimals || 18,
                balance: balance || "0",
                balanceUSD: balanceUSD,
                priceUSD: priceData?.price?.toString() || "0",
                priceChange24h: priceData?.change24h || 0,
                logo: getTokenLogo(token.symbol, token.token_address, token.chain_id),
                lastUpdate: new Date().toISOString(),
                isNative: token.token_address === "0x0000000000000000000000000000000000000000",
                priceHistory: priceHistory || {
                  prices: [],
                  market_caps: [],
                  total_volumes: []
                },
                chain_id: token.chain_id
              };
            } catch (error) {
              return null;
            }
          })
        );

        // Filter out failed token updates
        const validTokens = updatedTokens.filter((token): token is Token => token !== null);

        // Calculate total value
        const totalValue = validTokens.reduce((sum, token) => {
          return sum + parseFloat(token.balanceUSD || "0");
        }, 0);

        // Update state
        setTokens(validTokens);
        setTotalValue(totalValue.toFixed(2));

        // Save to storage
        await savePortfolioData({
          tokens: validTokens,
          totalValue: totalValue.toFixed(2),
          lastUpdate: Date.now(),
          chainId: currentChainId
        });
      } catch (error) {
        console.error("Error loading chain data:", error);
        Alert.alert("Error", "Failed to load chain data");
      } finally {
        setIsRefreshing(false);
      }
    };

    // Only load data when chain changes
    if (currentChainId) {
      loadChainData();
    }
  }, [currentChainId]); // Remove showNetworkPicker from dependencies

  // Memoize chart data preparation
  const prepareChartData = useCallback((token: Token) => {
    return token.priceHistory?.prices?.map(([timestamp, price]) => ({
      timestamp,
      value: price,
    })) || [];
  }, []);

  const renderTokenCard = useCallback((token: Token) => {
    const chartPoints = prepareChartData(token);
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
                    onError={(error) => {
                      console.log(`Failed to load logo for ${token.symbol}:`, error);
                      // The Image component will automatically try the next source
                    }}
                    defaultSource={require('../assets/favicon.png')}
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
  }, [prepareChartData]);

  const loadAvailableWallets = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabaseAdmin.auth.getSession();
      if (sessionError || !session?.user?.id) {
        console.error("No user session found");
        return;
      }

      const { data: wallets, error } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (wallets) {
        setAvailableWallets(wallets);
      }
    } catch (error) {
      console.error("Error loading available wallets:", error);
    }
  };

  useEffect(() => {
    if (showWalletSelector) {
      loadAvailableWallets();
    }
  }, [showWalletSelector]);

  // Memoize sorted tokens
  const sortedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => {
      const balanceA = parseFloat(a.balance || '0');
      const balanceB = parseFloat(b.balance || '0');
      return balanceB - balanceA;
    });
  }, [tokens]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <WalletHeader 
        onAccountChange={handleAccountChange}
        pageName="Portfolio"
        currentChainId={currentChainId}
        onChainChange={handleChainChange}
      />
      <ImageBackground 
        source={require('../assets/background.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
        imageStyle={{ width: '100%', height: '100%' }}
      >
        <View style={styles.content}>
          <WalletHeader 
            onAccountChange={handleAccountChange}
            onPress={() => {
              setShowWalletSelector(true);
            }}
          />

          {/* Portfolio Value */}
          <View style={styles.portfolioValue}>
            <Text style={styles.valueLabel}>Total Value</Text>
            <Text style={styles.valueAmount}>${totalValue}</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.swapButton}
                onPress={() => router.push('/swap')}
              >
                <Ionicons name="swap-horizontal" size={24} color={COLORS.primary} />
              </TouchableOpacity>
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
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {sortedTokens.map(renderTokenCard)}
          </ScrollView>

          {/* Wallet Selection Modal */}
          <Modal
            animationType="none"
            transparent={true}
            visible={showWalletSelector}
            onRequestClose={handleCloseModal}
          >
            <TouchableWithoutFeedback onPress={handleCloseModal}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.modalContainer}>
                    <Image
                      source={require('../assets/background.png')}
                      style={styles.modalBackground}
                    />
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Wallet</Text>
                      <TouchableOpacity
                        style={styles.closeButton}
                        onPress={handleCloseModal}
                      >
                        <Ionicons name="close" size={24} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView
                      style={styles.modalList}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.modalListContent}
                    >
                      {availableWallets.map((wallet) => (
                        <TouchableOpacity
                          key={wallet.id}
                          style={[
                            styles.modalOption,
                            currentAccount?.address === wallet.public_address && styles.modalOptionSelected
                          ]}
                          onPress={() => {
                            handleAccountChange({ address: wallet.public_address });
                            handleCloseModal();
                          }}
                        >
                          <View style={styles.chainSelectContent}>
                            <View style={styles.modalChainIcon}>
                              <Ionicons name="wallet" size={24} color={COLORS.primary} />
                            </View>
                            <View style={styles.modalTokenInfo}>
                              <Text style={[
                                styles.modalOptionText,
                                currentAccount?.address === wallet.public_address && styles.modalOptionTextSelected
                              ]}>
                                {wallet.public_address.slice(0, 6)}...{wallet.public_address.slice(-4)}
                              </Text>
                              <Text style={styles.modalTokenName}>{wallet.chain_name}</Text>
                            </View>
                          </View>
                          {currentAccount?.address === wallet.public_address && (
                            <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          <BottomNav activeTab="portfolio" />
        </View>
      </ImageBackground>
    </GestureHandlerRootView>
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
  headerButtons: {
    position: 'absolute',
    right: SPACING.xl,
    top: SPACING.xl + 8,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: MODAL_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: SPACING.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalList: {
    flex: 1,
  },
  modalListContent: {
    padding: SPACING.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORS.white,
  },
  modalOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  chainSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  modalChainIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTokenInfo: {
    flex: 1,
  },
  modalTokenName: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.7,
  },
  modalContent: {
    padding: SPACING.lg,
  },
}); 