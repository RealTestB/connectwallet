import { getTokenPrices, TokenPrice } from "../api/pricingApi";
import { 
  getStoredTokenBalances,
  setupTransactionMonitoring,
  Token as TokenType
} from "../api/tokensApi";
import { getStoredWallet } from "../api/walletApi";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View, ListRenderItem, Image, ImageBackground } from "react-native";
import { Network } from "alchemy-sdk";
import { RootStackParamList } from "../navigation/types";
import { LinearGradient } from 'expo-linear-gradient';
import { sharedStyles, COLORS, SPACING } from '../styles/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from "../contexts/AuthContext";
import { ethers } from "ethers";

interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance: string;
  logo?: string;
  price: number;
  balanceUSD: number;
  priceChange24h: number;
  isNative?: boolean;
}

// Default native tokens for each chain
const NATIVE_TOKENS: { [key: string]: Token } = {
  "1": {
    symbol: "ETH",
    name: "Ethereum",
    address: "0x0000000000000000000000000000000000000000",
    balance: "--",
    decimals: 18,
    logo: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    isNative: true,
    price: 0,
    balanceUSD: 0,
    priceChange24h: 0
  },
  "137": {
    symbol: "MATIC",
    name: "Polygon",
    address: "0x0000000000000000000000000000000000000000",
    balance: "0",
    decimals: 18,
    logo: "https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png",
    isNative: true,
    price: 0,
    balanceUSD: 0,
    priceChange24h: 0
  },
  "43114": {
    symbol: "AVAX",
    name: "Avalanche",
    address: "0x0000000000000000000000000000000000000000",
    balance: "0",
    decimals: 18,
    logo: "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
    isNative: true,
    price: 0,
    balanceUSD: 0,
    priceChange24h: 0
  }
};

// Add WETH to our known tokens
const KNOWN_TOKENS: { [key: string]: Token } = {
  // WETH on Ethereum Mainnet
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": {
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    logo: "https://assets.coingecko.com/coins/images/2518/large/weth.png",
    balance: "--",
    price: 0,
    balanceUSD: 0,
    priceChange24h: 0
  }
};

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

type NavigationProp = StackNavigationProp<RootStackParamList, 'portfolio'>;

export default function Portfolio(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const { isAuthenticated, hasWallet, updateLastActive } = useAuth();

  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState<string>("0");
  const [networkId, setNetworkId] = useState<string>("1"); // Default to Ethereum mainnet
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const MAX_RETRIES = 3;

  // Add new state for native token
  const [nativeToken, setNativeToken] = useState<Token | null>(null);

  // Initialize tokens when component mounts
  useEffect(() => {
    const initialTokens = [
      {
        ...NATIVE_TOKENS["1"],
        balance: "0",
        price: 0,
        balanceUSD: 0,
        priceChange24h: 0
      },
      {
        ...KNOWN_TOKENS["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"],
        balance: "0",
        price: 0,
        balanceUSD: 0,
        priceChange24h: 0
      }
    ].map(token => ({...token})); // Create new objects to ensure mutability
    setTokens(initialTokens);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !hasWallet) {
      console.log('[Portfolio] Not authenticated or no wallet');
      return;
    }
    
    // Load wallet data when authenticated
    loadWalletData();
  }, [isAuthenticated, hasWallet]);

  useEffect(() => {
    if (walletAddress) {
      // Set up transaction monitoring when wallet is loaded
      setupTransactionMonitoring(walletAddress)
        .catch(error => console.error('[Portfolio] Error setting up monitoring:', error));
    }
  }, [walletAddress]);

  // Add effect to set native token immediately
  useEffect(() => {
    if (networkId) {
      console.log('[Portfolio] Setting native token for network:', networkId);
      const nativeToken = NATIVE_TOKENS[networkId];
      if (nativeToken) {
        setNativeToken(nativeToken);
        // Always show native token in the list
        setTokens(prevTokens => {
          const existingTokens = prevTokens.filter(t => t.address !== nativeToken.address);
          return [nativeToken, ...existingTokens];
        });
      }
    }
  }, [networkId]);

  // Separate effect for loading portfolio data
  useEffect(() => {
    if (walletAddress && isAuthenticated) {
      console.log('[Portfolio] Loading portfolio data for address:', walletAddress);
      fetchTokenPrices();
    } else {
      console.log('[Portfolio] Waiting for wallet address or authentication:', {
        hasWalletAddress: !!walletAddress,
        isAuthenticated
      });
    }
  }, [walletAddress, retryCount, isAuthenticated]);

  const loadWalletData = async (): Promise<void> => {
    try {
      console.log('[Portfolio] Loading wallet data');
      await updateLastActive();
      
      const walletData = await getStoredWallet();
      if (!walletData) {
        console.error('[Portfolio] No wallet data found');
        setError("Failed to load wallet data. Please try again.");
        return;
      }

      console.log('[Portfolio] Wallet data loaded:', walletData);
      setWalletAddress(walletData.address);
      
      // Load stored balances
      const storedBalances = await getStoredTokenBalances(walletData.address);
      
      // Update tokens with stored balances
      setTokens(prevTokens => {
        return prevTokens.map(token => ({
          ...token,
          balance: storedBalances[token.address.toLowerCase()] || '0'
        }));
      });

      // Fetch prices
      await fetchTokenPrices();
    } catch (error) {
      console.error("[Portfolio] Error loading wallet data:", error);
      setError("Failed to load wallet data. Please try again.");
    }
  };

  const fetchTokenPrices = async (): Promise<void> => {
    try {
      console.log('[Portfolio] Fetching token prices...');
      const addresses = tokens.map(token => token.address);
      const prices = await getTokenPrices(addresses);
      
      // Update prices
      setTokens(prevTokens => {
        return prevTokens.map(token => {
          const price = prices[token.address.toLowerCase()];
          if (price?.price) {
            const balanceNum = parseFloat(token.balance === '--' ? '0' : token.balance);
            return {
              ...token,
              price: price.price,
              priceChange24h: price.change24h,
              balanceUSD: balanceNum * price.price
            };
          }
          return token;
        });
      });

      // Calculate total value
      const total = tokens.reduce((acc, token) => {
        const balance = token.balance === '--' ? 0 : parseFloat(token.balance);
        return acc + (balance * (token.price || 0));
      }, 0);
      
      setTotalValue(total.toFixed(2));
    } catch (error) {
      console.log('[Portfolio] Error fetching prices:', error);
      setError('Failed to fetch token prices');
    }
  };

  const handleRefresh = (): void => {
    setRetryCount(prev => prev + 1);
    fetchTokenPrices();
  };

  const handleTokenPress = async (token: Token): Promise<void> => {
    // Store token details securely before navigation
    await SecureStore.setItemAsync("selectedToken", JSON.stringify({
      symbol: token.symbol,
      balance: token.balance,
      address: token.address
    }));
    // Navigation removed - will be implemented later with proper token details screen
  };

  const handleAccountChange = (account: Account): void => {
    setWalletAddress(account.address);
    if (account.chainId) {
      setNetworkId(account.chainId.toString());
    }
  };

  const renderTokenItem: ListRenderItem<Token> = ({ item }) => {
    // Create a new mutable object for rendering
    const tokenItem = { ...item };
    return (
      <TouchableOpacity 
        style={styles.tokenCard}
        onPress={() => handleTokenPress(tokenItem)}
      >
        <LinearGradient
          colors={['#1A2F6C', '#0A1B3F']}
          style={styles.cardBackground}
        >
          {/* Token Header */}
          <View style={styles.tokenHeader}>
            <View style={styles.tokenIconContainer}>
              {tokenItem.logo ? (
                <Image 
                  source={{ uri: tokenItem.logo }} 
                  style={styles.tokenIcon}
                />
              ) : (
                <View style={[styles.tokenIcon, styles.placeholderIcon]}>
                  <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
                </View>
              )}
            </View>
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenSymbol}>{tokenItem.symbol}</Text>
              <Text style={styles.tokenName}>{tokenItem.name}</Text>
            </View>
            <View style={styles.priceChangeContainer}>
              <Text style={[
                styles.priceChange,
                { color: (tokenItem.priceChange24h || 0) >= 0 ? "#4ADE80" : "#FF4D4D" }
              ]}>
                {(tokenItem.priceChange24h || 0) >= 0 ? "+" : ""}{(tokenItem.priceChange24h || 0).toFixed(2)}%
              </Text>
            </View>
          </View>

          {/* Price Chart Placeholder */}
          <View style={styles.chartContainer}>
            <View style={[
              styles.chartLine,
              { backgroundColor: (tokenItem.priceChange24h || 0) >= 0 ? "#4ADE80" : "#FF4D4D" }
            ]} />
          </View>
          
          {/* Token Value */}
          <View style={styles.tokenValue}>
            <Text style={styles.tokenPrice}>
              1 {tokenItem.symbol} = ${(tokenItem.price || 0).toFixed(2)}
            </Text>
            <Text style={styles.tokenBalance}>
              {parseFloat(tokenItem.balance).toFixed(4)} {tokenItem.symbol}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(10, 27, 63, 0.7)', 'rgba(26, 47, 108, 0.7)']}
          style={styles.backgroundGradient}
        />
      </ImageBackground>
      
      <View style={styles.content}>
        <WalletHeader 
          onAccountChange={handleAccountChange}
        />

        {/* Portfolio Value */}
        <View style={styles.portfolioValue}>
          <Text style={styles.valueLabel}>Total Value</Text>
          <Text style={styles.valueAmount}>${totalValue}</Text>
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

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading your portfolio...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={handleRefresh}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={tokens}
            keyExtractor={(item) => item.address.toLowerCase()}
            renderItem={renderTokenItem}
            contentContainerStyle={styles.listContent}
            onRefresh={handleRefresh}
            refreshing={isLoading}
            removeClippedSubviews={false}
            initialNumToRender={5}
            maxToRenderPerBatch={10}
            windowSize={5}
            extraData={tokens}
          />
        )}

        <BottomNav activeTab="portfolio" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  backgroundGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
  portfolioValue: {
    padding: SPACING.xl,
    alignItems: "center",
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
  placeholderIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: SPACING.md,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: "center",
    marginVertical: SPACING.lg,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    marginTop: SPACING.md,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
}); 