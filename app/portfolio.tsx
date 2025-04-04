import React, { useState, useCallback, useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, ActivityIndicator, Dimensions, ImageBackground, Alert, Modal, TouchableWithoutFeedback, Animated, ImageSourcePropType } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../styles/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { getNativeBalance, getTokenBalance, getTokenBalances } from '../api/tokensApi';
import { getTokenPrice, getTokenPriceHistory, CHAIN_TO_PLATFORM, NATIVE_TOKEN_IDS, COINGECKO_BASE_URL, COINGECKO_API_KEY } from '../api/coingeckoApi';
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
import { CHAINS, getChainById, ChainId } from '../constants/chains';
import { TokenBalanceResult, TokenMetadata } from '../types/tokens';
import { useChain } from '../contexts/ChainContext';
import { getTokenInfo } from '../api/coingeckoApi';
import { supabase } from '../lib/supabase';

interface PriceHistoryResponse {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

interface TokenLogo {
  hasLogo: boolean;
  logoUri?: string;
  lastUpdated?: number;
  error?: string;
}

interface Token {
  address: string;
  chain_id: number;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceUSD: string;
  priceUSD: string;
  priceChange24h: number;
  logo?: { uri: string };
  isNative: boolean;
  lastUpdate: string;
  priceHistory: {
    prices: Array<[number, number]>;
    market_caps: Array<[number, number]>;
    total_volumes: Array<[number, number]>;
  };
}

interface TokenLogos {
  [key: string]: TokenLogo;
}

interface Account {
  address: string;
  chainId: number;
  name?: string;
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

interface PortfolioData {
  tokens: Token[];
  totalValue: string;
  lastUpdate: number;
  chainId: number;
}

interface StorageToken {
  symbol: string;
  address: string;
  balance: string;
  balanceUSD: string;
  isNative: boolean;
  chain_id: number;
  name?: string;
  decimals?: number;
}

interface StorageData {
  tokens: StorageToken[];
  totalValue: string;
  lastUpdate: number;
  chainId: number;
}

const MODAL_HEIGHT = Dimensions.get('window').height * 0.7;

const CHAIN_LOGOS: { [key: number]: string } = {
  1: 'ethereum',
  137: 'matic-network',
  42161: 'arbitrum',
  10: 'optimistic-ethereum',
  56: 'binancecoin',
  43114: 'avalanche-2',
  8453: 'base'
};

// Add cache expiration time (5 minutes)
const LOGO_CACHE_EXPIRY = 5 * 60 * 1000;

// Default images for different scenarios
const DEFAULT_TOKEN_LOGO = require('../assets/images/default-token.png');
const DEFAULT_LOADING_LOGO = require('../assets/images/loading-token.png');
const DEFAULT_ERROR_LOGO = require('../assets/images/error-token.png');

// Storage functions
const savePortfolioData = async (data: PortfolioData): Promise<void> => {
  try {
    // Create a minimal version of the data for storage
    const storageData: StorageData = {
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
    
    // Save chain-specific portfolio data
    const chainKey = `${STORAGE_KEYS.PORTFOLIO_DATA}_${data.chainId}`;
    
    if (dataString.length > 2000) {
      console.warn('[Portfolio] Data size exceeds recommended limit, saving only total value');
      await SecureStore.setItemAsync(
        chainKey,
        JSON.stringify({
          totalValue: data.totalValue,
          lastUpdate: data.lastUpdate,
          chainId: data.chainId
        })
      );
    } else {
      await SecureStore.setItemAsync(chainKey, dataString);
    }
    
    // Save last used network
    await SecureStore.setItemAsync(STORAGE_KEYS.SETTINGS.LAST_USED_NETWORK, data.chainId.toString());
    
    console.log('[Portfolio] Successfully saved portfolio data to SecureStore');
  } catch (error) {
    console.error('[Portfolio] Error saving portfolio data:', error);
    throw error;
  }
};

const loadPortfolioData = async (chainId: number): Promise<PortfolioData | null> => {
  try {
    console.log('[Portfolio] Loading portfolio data from SecureStore...', { chainId });
    
    // Try to load chain-specific data first
    const chainKey = `${STORAGE_KEYS.PORTFOLIO_DATA}_${chainId}`;
    const data = await SecureStore.getItemAsync(chainKey);
    
    if (data) {
      const parsed = JSON.parse(data) as StorageData;
      
      // If we only have total value, return minimal data
      if (!parsed.tokens) {
        return {
          tokens: [],
          totalValue: parsed.totalValue || "0",
          lastUpdate: parsed.lastUpdate || Date.now(),
          chainId: chainId // Always use the provided chainId
        };
      }
      
      // Initialize minimal token data
      const tokensWithDefaults = parsed.tokens.map((token: StorageToken): Token => ({
        symbol: token.symbol,
        name: token.name || token.symbol,
        address: token.address,
        decimals: token.decimals || 18,
        balance: token.balance,
        balanceUSD: token.balanceUSD,
        priceUSD: "0",
        priceChange24h: 0,
        lastUpdate: new Date(parsed.lastUpdate).toISOString(),
        isNative: token.isNative,
        chain_id: token.chain_id,
        priceHistory: {
          prices: [],
          market_caps: [],
          total_volumes: []
        }
      }));
      
      console.log('[Portfolio] Successfully loaded portfolio data:', {
        chainId,
        totalValue: parsed.totalValue,
        tokenCount: tokensWithDefaults.length,
        lastUpdate: new Date(parsed.lastUpdate).toISOString()
      });
      
      return {
        tokens: tokensWithDefaults,
        totalValue: parsed.totalValue,
        lastUpdate: parsed.lastUpdate,
        chainId
      };
    } else {
      console.log('[Portfolio] No saved portfolio data found for chain:', chainId);
    }
  } catch (error) {
    console.error('[Portfolio] Error loading portfolio data:', error);
    throw error;
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

export default function Portfolio(): JSX.Element {
  const { currentChainId, setChainId } = useChain();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenLogos, setTokenLogos] = useState<TokenLogos>({});
  const [totalValue, setTotalValue] = useState<string>("0");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isChainSwitching, setIsChainSwitching] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
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
  const [isAccountSwitching, setIsAccountSwitching] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState<{
    token?: ReturnType<typeof supabase.channel>;
    transaction?: ReturnType<typeof supabase.channel>;
    nft?: ReturnType<typeof supabase.channel>;
    notification?: ReturnType<typeof supabase.channel>;
  }>({});

  // Helper function to get the appropriate logo source
  const getLogoSource = useCallback((address: string, chainId: number): ImageSourcePropType | undefined => {
    // For all tokens, try the cached logo first
    const logoKey = `${address}-${chainId}`;
    const logoData = tokenLogos[logoKey];

    if (!logoData || !logoData.hasLogo || logoData.error) {
      return undefined;
    }

    return { uri: logoData.logoUri };
  }, [tokenLogos]);

  const loadTokenLogo = useCallback(async (token: Token) => {
    try {
      const logoKey = `${token.address}-${token.chain_id}`;
      
      // Check if logo is already loaded and not expired
      const currentLogo = tokenLogos[logoKey];
      if (currentLogo?.hasLogo && currentLogo?.lastUpdated && 
          Date.now() - currentLogo.lastUpdated < LOGO_CACHE_EXPIRY) {
        return;
      }

      // Get token info from CoinGecko
      const tokenInfo = await getTokenInfo(token.address, token.chain_id as ChainId);
      
      if (tokenInfo?.image?.thumb) {
        // Update logo state with cache timestamp
        setTokenLogos((prev: TokenLogos) => ({
          ...prev,
          [logoKey]: {
            hasLogo: true,
            logoUri: tokenInfo.image.thumb,
            lastUpdated: Date.now()
          }
        }));

        // Update token with logo
        setTokens((prev: Token[]) => 
          prev.map((t: Token) => 
            t.address === token.address && t.chain_id === token.chain_id ? 
            { ...t, logo: { uri: tokenInfo.image.thumb } } : 
            t
          )
        );
      }
    } catch (error) {
      console.error('[Portfolio] Error loading logo:', {
        symbol: token.symbol,
        address: token.address,
        chainId: token.chain_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [tokenLogos]);

  // Add effect to load logos for new tokens with debouncing
  useEffect(() => {
    const loadLogos = async () => {
      const tokensToLoad = tokens.filter(token => !token.logo);
      
      // Process tokens in batches of 5 to prevent too many simultaneous requests
      for (let i = 0; i < tokensToLoad.length; i += 5) {
        const batch = tokensToLoad.slice(i, i + 5);
        await Promise.all(batch.map(token => loadTokenLogo(token)));
        // Add a small delay between batches
        if (i + 5 < tokensToLoad.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    };

    loadLogos();
  }, [tokens, loadTokenLogo]);

  // Add effect to clear logo cache when chain changes
  useEffect(() => {
    setTokenLogos({});
  }, [currentChainId]);

  // Simple close modal function for wallet selector
  const handleCloseModal = useCallback(() => {
    setShowWalletSelector(false);
  }, []);

  const handleTokenPress = (token: Token): void => {
    console.log('Token pressed:', token.symbol);
  };

  const handleRefresh = useCallback(async () => {
    try {
      // Only check if already refreshing, remove initialization check
      if (isRefreshing) {
        console.log('[Portfolio] Skipping refresh - already refreshing');
        return;
      }

      // Check refresh cooldown
      const now = Date.now();
      if (now - lastRefreshTime < REFRESH_COOLDOWN) {
        console.log('[Portfolio] Skipping refresh - within cooldown period');
        return;
      }

      setIsRefreshing(true);
      setError(null);

      // Get current wallet data
      const walletData = await getStoredWallet();
      if (!walletData?.address) {
        setError("No wallet connected");
        return;
      }

      // Ensure we have both account and chain
      const effectiveAccount = currentAccount || { 
        address: walletData.address, 
        chainId: currentChainId 
      };

      if (!effectiveAccount.address || !currentChainId) {
        console.log('[Portfolio] Missing required data:', {
          address: effectiveAccount.address,
          chainId: currentChainId
        });
        setError("No account or chain selected");
        return;
      }

      console.log('[Portfolio] Starting refresh:', {
        address: effectiveAccount.address,
        chainId: currentChainId
      });

      // Get token balances for the current chain
      const tokenBalances = await getTokenBalances(effectiveAccount.address, currentChainId);
      
      if (!tokenBalances || tokenBalances.length === 0) {
        console.log('[Portfolio] No token balances found');
        setTokens([]);
        setTotalValue("0");
        return;
      }

      // Process each token balance
      const updatedTokens = await Promise.all(
        tokenBalances.map(async (balance: TokenBalanceResult) => {
          try {
            // Skip tokens with errors
            if (balance.error) {
              console.warn('[Portfolio] Token balance error:', {
                address: balance.contractAddress,
                error: balance.error
              });
              return null;
            }

            // Get price data
            const priceData = await getTokenPrice(balance.contractAddress, currentChainId as ChainId);
            const priceHistory = await getTokenPriceHistory(balance.contractAddress, currentChainId as ChainId);
            
            // Calculate USD value
            const balanceUSD = calculateTokenBalanceUSD(
              balance.formattedBalance,
              priceData?.price?.toString() || "0",
              balance.metadata?.decimals || 18
            );

            // Use metadata from balance for native token
            const isNative = balance.contractAddress === "0x0000000000000000000000000000000000000000";
            const symbol = isNative ? balance.metadata?.symbol || 'UNKNOWN' : balance.metadata?.symbol || 'UNKNOWN';
            const name = isNative ? balance.metadata?.name || 'Unknown Token' : balance.metadata?.name || 'Unknown Token';

            const token: Token = {
              symbol,
              name,
              address: balance.contractAddress,
              decimals: balance.metadata?.decimals || 18,
              balance: balance.formattedBalance,
              balanceUSD: balanceUSD,
              priceUSD: priceData?.price?.toString() || "0",
              priceChange24h: priceData?.change24h || 0,
              lastUpdate: new Date().toISOString(),
              isNative,
              priceHistory: priceHistory || {
                prices: [],
                market_caps: [],
                total_volumes: []
              },
              chain_id: currentChainId
            };

            return token;
          } catch (error) {
            console.error('[Portfolio] Error processing token:', {
              address: balance.contractAddress,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
          }
        })
      );

      // Filter out failed token updates
      const validTokens = updatedTokens.filter((token): token is Token => token !== null);

      // Calculate total value
      const totalValue = validTokens.reduce((sum: number, token: Token) => {
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

      console.log('[Portfolio] Refresh completed:', {
        tokenCount: validTokens.length,
        totalValue: totalValue.toFixed(2)
      });

      // Update last refresh time
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error('[Portfolio] Error refreshing portfolio:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to refresh portfolio";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentAccount?.address, currentChainId, isRefreshing, lastRefreshTime]);

  const handleAccountChange = useCallback(async (account: Account) => {
    console.log('[Portfolio] Account change received:', {
      address: account.address,
      chainId: account.chainId,
      currentAccount: currentAccount?.address
    });

    try {
      setIsAccountSwitching(true);
      setError(null);

      // Validate account
      if (!account.address) {
        throw new Error('Invalid account address');
      }

      // 1. Update current account
      setCurrentAccount(account);
      
      // 2. Clear existing data
      setTokens(current => 
        current.map(t => ({ ...t, logo: undefined }))
      );
      setTokens([]);
      setTotalValue("0");
      
      // 3. Load and save portfolio data for the new account
      const savedData = await loadPortfolioData(currentChainId);
      if (savedData) {
        setTokens(savedData.tokens);
        setTotalValue(savedData.totalValue);
      }

      // 4. Trigger a refresh to get fresh data
      await handleRefresh();
    } catch (error) {
      console.error('[Portfolio] Error handling account change:', error);
      setError(error instanceof Error ? error.message : 'Failed to update portfolio for new account');
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update portfolio for new account');
    } finally {
      setIsAccountSwitching(false);
    }
  }, [currentAccount, handleRefresh, currentChainId]);

  const handleChainChange = useCallback(async (chainId: number) => {
    console.log('[Portfolio] Chain change received:', {
      newChainId: chainId,
      currentChainId,
      currentAccount: currentAccount?.address
    });
    
    try {
      setIsChainSwitching(true);
      setError(null);

      // Validate chain ID
      if (!getChainById(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      // 1. Update chain ID in context
      await setChainId(chainId);
      
      // 2. Update current account with new chain ID
      if (currentAccount) {
        const updatedAccount = { ...currentAccount, chainId };
        setCurrentAccount(updatedAccount);
      }
      
      // 3. Clear existing data
      setTokens(current => 
        current.map(t => ({ ...t, logo: undefined }))
      );
      setTokens([]);
      setTotalValue("0");
      
      // 4. Load and save portfolio data for the new chain
      const savedData = await loadPortfolioData(chainId);
      if (savedData) {
        setTokens(savedData.tokens);
        setTotalValue(savedData.totalValue);
      }

      // 5. Trigger a refresh to get fresh data
      await handleRefresh();
    } catch (error) {
      console.error('[Portfolio] Error handling chain change:', error);
      setError(error instanceof Error ? error.message : 'Failed to update portfolio for new network');
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update portfolio for new network');
    } finally {
      setIsChainSwitching(false);
    }
  }, [currentAccount, handleRefresh, setChainId]);

  // Update initialization effect to use ChainContext
  useEffect(() => {
    let isMounted = true;
    let initializationTimeout: NodeJS.Timeout;

    const init = async () => {
      try {
        setIsInitializing(true);
        console.log('[Portfolio] Starting initialization...');

        // Get stored wallet data first
        const walletData = await getStoredWallet();
        
        if (walletData?.address) {
          // Use chain ID from context
          console.log('[Portfolio] Found wallet data:', {
            address: walletData.address,
            chainId: currentChainId
          });
          
          // Set current account with the chain ID from context
          const account = { 
            address: walletData.address,
            chainId: currentChainId
          };
          
          if (isMounted) {
            setCurrentAccount(account);
            
            // Load saved data for the current chain ID
            console.log('[Portfolio] Loading portfolio data for chain:', currentChainId);
            const savedData = await loadPortfolioData(currentChainId);
            if (savedData && isMounted) {
              setTokens(savedData.tokens);
              setTotalValue(savedData.totalValue);
            }

            // Set a timeout to trigger refresh after initialization
            initializationTimeout = setTimeout(() => {
              if (isMounted) {
                handleRefresh();
              }
            }, 1000); // Wait 1 second before refreshing
          }
        } else {
          console.log('[Portfolio] No wallet data found');
          if (isMounted) {
            setError("No wallet connected");
          }
        }
      } catch (error) {
        console.error('[Portfolio] Error during initialization:', error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : "Failed to initialize app");
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
    };
  }, [currentChainId]); // Only depend on currentChainId

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

    const logoSource = getLogoSource(token.address, token.chain_id);

    return (
      <TouchableOpacity 
        key={`${token.address}-${token.chain_id}`}
        style={styles.tokenCard}
        onPress={() => handleTokenPress(token)}
      >
        <View style={[styles.cardBlur, { backgroundColor: 'rgba(41, 40, 40, 0.25)' }]}>
          <View style={styles.cardContent}>
            <View style={styles.topRow}>
              <View style={styles.tokenHeader}>
                <View style={styles.tokenIconContainer}>
                  {logoSource && (
                    <Image 
                      source={logoSource}
                      style={styles.chainIcon}
                      resizeMode="contain"
                    />
                  )}
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

              <View style={styles.valueContainer}>
                <View style={styles.balanceRow}>
                  <Text style={styles.tokenBalance}>{formattedBalance} {token.symbol}</Text>
                  <Text style={styles.tokenBalanceUSD}>{formattedBalanceUSD}</Text>
                </View>
                <Text style={styles.tokenPrice}>{pricePerCoin}</Text>
              </View>
            </View>

            <View style={styles.chartWrapper}>
              <View style={styles.chartContainer}>
                {chartPoints.length > 0 ? (
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <LineChart.Provider data={chartPoints}>
                      <LineChart height={80} width={chartWidth}>
                        <LineChart.Path color={priceChangeColor} width={2}>
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
  }, [getLogoSource, handleTokenPress]);

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

  // Update wallet selection handler
  const handleWalletSelect = useCallback(async (wallet: { id: string, public_address: string, chain_name: string }) => {
    try {
      console.log('[Portfolio] Wallet selected:', wallet);
      handleAccountChange({ 
        address: wallet.public_address,
        chainId: currentChainId
      });
      handleCloseModal();
    } catch (error) {
      console.error('[Portfolio] Error selecting wallet:', error);
      Alert.alert('Error', 'Failed to select wallet');
    }
  }, [currentChainId, handleAccountChange, handleCloseModal]);

  // Add subscription effect
  useEffect(() => {
    if (!currentAccount?.address) return;

    // Subscribe to changes in token balances and transactions for current wallet
    const tokenBalanceSubscription = supabase
      .channel('token_balance_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'token_balances',
          filter: `public_address=eq.${currentAccount.address}`
        },
        (payload) => {
          console.log('Token balance changed:', payload);
          handleRefresh();
        }
      )
      .subscribe();

    // Subscribe to changes in transactions for current wallet (both incoming and outgoing)
    const transactionSubscription = supabase
      .channel('transaction_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `from_address=eq.${currentAccount.address.toLowerCase()}`
        },
        (payload) => {
          console.log('Outgoing transaction changed:', payload);
          handleRefresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `to_address=eq.${currentAccount.address.toLowerCase()}`
        },
        (payload) => {
          console.log('Incoming transaction changed:', payload);
          handleRefresh();
        }
      )
      .subscribe();

    // Get the current user's session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        // Subscribe to NFT changes for current wallet
        const nftSubscription = supabase
          .channel('nft_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'nfts',
              filter: `wallet_id.in.(select id from wallets where public_address=eq.${currentAccount.address.toLowerCase()})`
            },
            (payload) => {
              console.log('NFT collection changed:', payload);
              // Here you would typically update NFT state
              // For now just refresh everything
              handleRefresh();
            }
          )
          .subscribe();

        // Subscribe to notification changes for current user
        const notificationSubscription = supabase
          .channel('notification_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notification_logs',
              filter: `user_id=eq.${session.user.id}`
            },
            (payload) => {
              console.log('New notification:', payload);
              // Here you would typically update notification state or show a toast
              // For now just log it
            }
          )
          .subscribe();

        // Store subscriptions for cleanup
        setActiveSubscriptions(prev => ({
          ...prev,
          nft: nftSubscription,
          notification: notificationSubscription
        }));
      }
    };

    // Initialize NFT and notification subscriptions
    getSession();

    // Store token and transaction subscriptions
    setActiveSubscriptions(prev => ({
      ...prev,
      token: tokenBalanceSubscription,
      transaction: transactionSubscription
    }));

    // Cleanup subscriptions on unmount
    return () => {
      Object.values(activeSubscriptions).forEach(subscription => {
        if (subscription) subscription.unsubscribe();
      });
    };
  }, [currentAccount?.address, handleRefresh]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <WalletHeader 
        onAccountChange={handleAccountChange}
        pageName="Portfolio"
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
            <Text style={styles.valueAmount}>
              {isInitializing ? 'Loading...' : isChainSwitching ? 'Switching...' : `$${totalValue}`}
            </Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.swapButton}
                onPress={() => router.push('/swap')}
                disabled={isInitializing || isChainSwitching}
              >
                <Ionicons name="swap-horizontal" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={handleRefresh}
                disabled={isInitializing || isRefreshing || isChainSwitching || !currentAccount?.address}
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
            {isInitializing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading portfolio...</Text>
              </View>
            ) : isChainSwitching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Switching network...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={handleRefresh}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : sortedTokens.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No tokens found</Text>
              </View>
            ) : (
              sortedTokens.map(renderTokenCard)
            )}
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
                            handleWalletSelect(wallet);
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chainIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  tokenIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    color: COLORS.white,
    marginTop: SPACING.md,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    color: COLORS.white,
    textAlign: 'center',
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 