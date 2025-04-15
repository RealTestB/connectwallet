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
  isSpam?: boolean;
  isApproved?: boolean;
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

const REFRESH_COOLDOWN = 5000; // 5 seconds cooldown between manual refreshes

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

// Add SpamTokenAlert component
const SpamTokenAlert = ({ tokens, onApprove, onReject }: { 
  tokens: Token[], 
  onApprove: (token: Token) => void,
  onReject: (token: Token) => void 
}) => {
  if (tokens.length === 0) return null;

  return (
    <View style={styles.spamAlertContainer}>
      <Text style={styles.spamAlertTitle}>New Token Notifications</Text>
      <Text style={styles.spamAlertSubtitle}>The following tokens were sent to your wallet</Text>
      
      {tokens.map((token) => (
        <View key={`${token.address}-${token.chain_id}`} style={styles.spamTokenCard}>
          <View style={styles.spamTokenInfo}>
            <View style={styles.tokenIconContainer}>
              {token.logo ? (
                <Image 
                  source={token.logo} 
                  style={styles.chainIcon} 
                  resizeMode="contain"
                />
              ) : null}
            </View>
            <View style={styles.spamTokenDetails}>
              <Text style={styles.spamTokenSymbol}>{token.symbol}</Text>
              <Text style={styles.spamTokenName}>{token.name}</Text>
              <Text style={styles.spamTokenBalance}>
                Balance: {parseFloat(token.balance).toFixed(4)}
              </Text>
            </View>
          </View>
          <View style={styles.spamTokenActions}>
            <TouchableOpacity 
              style={[styles.spamTokenButton, styles.approveButton]}
              onPress={() => onApprove(token)}
            >
              <Text style={styles.spamTokenButtonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.spamTokenButton, styles.rejectButton]}
              onPress={() => onReject(token)}
            >
              <Text style={styles.spamTokenButtonText}>Hide</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

export default function Portfolio(): JSX.Element {
  const { currentChainId, setChainId } = useChain();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenLogos, setTokenLogos] = useState<TokenLogos>({});
  const [totalValue, setTotalValue] = useState<string>("0");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSpamTokens, setShowSpamTokens] = useState(false);
  const router = useRouter();
  const [activeSubscriptions, setActiveSubscriptions] = useState<{
    token?: ReturnType<typeof supabase.channel>;
    transaction?: ReturnType<typeof supabase.channel>;
    nft?: ReturnType<typeof supabase.channel>;
    notification?: ReturnType<typeof supabase.channel>;
  }>({});
  const [approvedTokens, setApprovedTokens] = useState<Set<string>>(new Set());
  const [rejectedTokens, setRejectedTokens] = useState<Set<string>>(new Set());

  useEffect(() => {
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
          
          // Load saved data for the current chain ID
          console.log('[Portfolio] Loading portfolio data for chain:', currentChainId);
          const savedData = await loadPortfolioData(currentChainId);
          if (savedData) {
            setTokens(savedData.tokens);
            setTotalValue(savedData.totalValue);
          }

          // Set a timeout to trigger refresh after initialization
          setTimeout(() => {
            handleRefresh();
          }, 1000); // Wait 1 second before refreshing
        } else {
          console.log('[Portfolio] No wallet data found');
          setError("No wallet connected");
        }
      } catch (error) {
        console.error('[Portfolio] Error during initialization:', error);
        setError(error instanceof Error ? error.message : "Failed to initialize app");
      } finally {
        setIsInitializing(false);
        setIsLoading(false);
      }
    };

    init();
  }, [currentChainId]); // Only depend on currentChainId

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        console.log('🔍 [Portfolio] Starting authentication check...');
        
        // Log all relevant storage items
        const isAuthenticated = await SecureStore.getItemAsync(STORAGE_KEYS.IS_AUTHENTICATED);
        const walletData = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
        const lastActive = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_LAST_ACTIVE);
        
        console.log('📊 [Portfolio] Auth state:', {
          isAuthenticated,
          hasWalletData: !!walletData,
          lastActive: lastActive ? new Date(parseInt(lastActive)).toISOString() : null
        });

        if (isAuthenticated !== 'true') {
          console.log('❌ [Portfolio] Not authenticated, redirecting to signin');
          router.replace('/signin');
          return;
        }

        // Verify last active timestamp
        if (lastActive) {
          const lastActiveTime = parseInt(lastActive);
          const now = Date.now();
          const timeDiff = now - lastActiveTime;
          const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

          if (timeDiff > INACTIVITY_TIMEOUT) {
            console.log('❌ [Portfolio] Session expired due to inactivity');
            router.replace('/signin');
            return;
          }
        }

        console.log('✅ [Portfolio] Authentication check passed');
        setIsLoading(false);
      } catch (error) {
        console.error('[Portfolio] Error checking authentication:', error);
        setError('Failed to load portfolio');
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, []);

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

  const handleRefresh = useCallback(async () => {
    try {
      // Only check if already refreshing
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
      const effectiveAccount = { 
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
              chain_id: currentChainId,
              isSpam: balance.metadata?.isSpam || false
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

      // Filter out failed token updates and spam tokens if not showing them
      const validTokens = updatedTokens
        .filter((token): token is Token => token !== null)
        .filter(token => showSpamTokens || !token.isSpam);

      // Calculate total value (excluding spam tokens)
      const totalValue = validTokens
        .filter(token => !token.isSpam)
        .reduce((sum: number, token: Token) => {
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
  }, [currentChainId, isRefreshing, lastRefreshTime, showSpamTokens]);

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
  }, [getLogoSource]);

  // Memoize sorted tokens
  const sortedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => {
      // Always put native token first
      if (a.isNative) return -1;
      if (b.isNative) return 1;
      
      // Sort remaining tokens by USD value in descending order
      const valueA = parseFloat(a.balanceUSD || '0');
      const valueB = parseFloat(b.balanceUSD || '0');
      return valueB - valueA;
    });
  }, [tokens]);

  // Add subscription effect
  useEffect(() => {
    const init = async () => {
      const walletData = await getStoredWallet();
      if (!walletData?.address) return;

      // Subscribe to changes in token balances and transactions for current wallet
      const tokenBalanceSubscription = supabase
        .channel('token_balance_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'token_balances',
            filter: `public_address=eq.${walletData.address}`
          },
          (payload) => {
            console.log('Token balance changed:', payload);
            handleRefresh();
          }
        )
        .subscribe();

      // Subscribe to changes in transactions for current wallet
      const transactionSubscription = supabase
        .channel('transaction_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `from_address=eq.${walletData.address.toLowerCase()}`
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
            filter: `to_address=eq.${walletData.address.toLowerCase()}`
          },
          (payload) => {
            console.log('Incoming transaction changed:', payload);
            handleRefresh();
          }
        )
        .subscribe();

      // Get the current user's session
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
              filter: `wallet_id.in.(select id from wallets where public_address=eq.${walletData.address.toLowerCase()})`
            },
            (payload) => {
              console.log('NFT collection changed:', payload);
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
            }
          )
          .subscribe();

        setActiveSubscriptions(prev => ({
          ...prev,
          nft: nftSubscription,
          notification: notificationSubscription
        }));
      }

      // Store token and transaction subscriptions
      setActiveSubscriptions(prev => ({
        ...prev,
        token: tokenBalanceSubscription,
        transaction: transactionSubscription
      }));
    };

    init();

    // Cleanup subscriptions on unmount
    return () => {
      Object.values(activeSubscriptions).forEach(subscription => {
        if (subscription) subscription.unsubscribe();
      });
    };
  }, [handleRefresh]); // Only depend on handleRefresh

  // Add handlers for spam tokens
  const handleApproveToken = useCallback(async (token: Token) => {
    const tokenKey = `${token.address}-${token.chain_id}`;
    setApprovedTokens(prev => new Set([...prev, tokenKey]));
    
    // Save approved status to SecureStore
    try {
      const approvedTokensStr = await SecureStore.getItemAsync(STORAGE_KEYS.APPROVED_TOKENS);
      const approvedTokens = approvedTokensStr ? JSON.parse(approvedTokensStr) : [];
      approvedTokens.push(tokenKey);
      await SecureStore.setItemAsync(STORAGE_KEYS.APPROVED_TOKENS, JSON.stringify(approvedTokens));
    } catch (error) {
      console.error('[Portfolio] Error saving approved token:', error);
    }
  }, []);

  const handleRejectToken = useCallback(async (token: Token) => {
    const tokenKey = `${token.address}-${token.chain_id}`;
    setRejectedTokens(prev => new Set([...prev, tokenKey]));
    
    // Save rejected status to SecureStore
    try {
      const rejectedTokensStr = await SecureStore.getItemAsync(STORAGE_KEYS.REJECTED_TOKENS);
      const rejectedTokens = rejectedTokensStr ? JSON.parse(rejectedTokensStr) : [];
      rejectedTokens.push(tokenKey);
      await SecureStore.setItemAsync(STORAGE_KEYS.REJECTED_TOKENS, JSON.stringify(rejectedTokens));
    } catch (error) {
      console.error('[Portfolio] Error saving rejected token:', error);
    }
  }, []);

  // Load approved/rejected tokens on mount
  useEffect(() => {
    const loadTokenPreferences = async () => {
      try {
        const approvedTokensStr = await SecureStore.getItemAsync(STORAGE_KEYS.APPROVED_TOKENS);
        const rejectedTokensStr = await SecureStore.getItemAsync(STORAGE_KEYS.REJECTED_TOKENS);
        
        if (approvedTokensStr) {
          setApprovedTokens(new Set(JSON.parse(approvedTokensStr)));
        }
        if (rejectedTokensStr) {
          setRejectedTokens(new Set(JSON.parse(rejectedTokensStr)));
        }
      } catch (error) {
        console.error('[Portfolio] Error loading token preferences:', error);
      }
    };
    
    loadTokenPreferences();
  }, []);

  // Filter tokens based on spam status and user preferences
  const { displayedTokens, pendingSpamTokens } = useMemo(() => {
    return tokens.reduce((acc: { displayedTokens: Token[], pendingSpamTokens: Token[] }, token) => {
      const tokenKey = `${token.address}-${token.chain_id}`;
      
      if (token.isSpam) {
        if (approvedTokens.has(tokenKey)) {
          acc.displayedTokens.push({ ...token, isApproved: true });
        } else if (!rejectedTokens.has(tokenKey)) {
          acc.pendingSpamTokens.push(token);
        }
      } else {
        acc.displayedTokens.push(token);
      }
      
      return acc;
    }, { displayedTokens: [], pendingSpamTokens: [] });
  }, [tokens, approvedTokens, rejectedTokens]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <ImageBackground 
        source={require('../assets/background.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
        imageStyle={{ width: '100%', height: '100%' }}
      >
        <View style={styles.content}>
          <WalletHeader 
            pageName="Portfolio"
          />

          {/* Portfolio Value */}
          <View style={styles.portfolioValue}>
            <View style={styles.portfolioHeader}>
              <Text style={styles.valueLabel}>Total Value</Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRefresh}
                disabled={isRefreshing}
              >
                <Ionicons 
                  name="refresh" 
                  size={24} 
                  color={COLORS.white} 
                  style={isRefreshing ? styles.rotating : undefined}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.valueAmount}>
              {isInitializing ? 'Loading...' : `$${totalValue}`}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/swap')}
              disabled={isInitializing}
            >
              <Ionicons name="swap-horizontal" size={24} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Swap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowSpamTokens(!showSpamTokens)}
            >
              <Ionicons 
                name={showSpamTokens ? "eye-off" : "eye"} 
                size={24} 
                color={COLORS.white} 
              />
              <Text style={styles.actionButtonText}>
                {showSpamTokens ? 'Hide Spam' : 'Show Spam'}
              </Text>
            </TouchableOpacity>
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
            ) : (
              <>
                {pendingSpamTokens.length > 0 && (
                  <SpamTokenAlert
                    tokens={pendingSpamTokens}
                    onApprove={handleApproveToken}
                    onReject={handleRejectToken}
                  />
                )}
                {displayedTokens.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No tokens found</Text>
                  </View>
                ) : (
                  displayedTokens.map(renderTokenCard)
                )}
              </>
            )}
          </ScrollView>

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
    flex: 1,
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
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  valueLabel: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '500',
  },
  valueAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.white,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
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
  rotating: {
    transform: [{ rotate: '360deg' }],
  },
  spamAlertContainer: {
    backgroundColor: 'rgba(41, 40, 40, 0.25)',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  spamAlertTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  spamAlertSubtitle: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  spamTokenCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  spamTokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  spamTokenDetails: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  spamTokenSymbol: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  spamTokenName: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 12,
  },
  spamTokenBalance: {
    color: COLORS.white,
    opacity: 0.7,
    fontSize: 12,
    marginTop: 2,
  },
  spamTokenActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  spamTokenButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: COLORS.primary,
  },
  rejectButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  spamTokenButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
}); 