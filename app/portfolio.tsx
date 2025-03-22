import { getTokenPrices } from "../api/pricingApi";
import { getTokenBalances } from "../api/tokensApi";
import { getStoredWallet } from "../api/walletApi";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View, ListRenderItem, Image } from "react-native";
import { Network } from "alchemy-sdk";
import { RootStackParamList } from "../navigation/types";
import { LinearGradient } from 'expo-linear-gradient';

interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance: string;
  logo?: string;
  balanceUSD?: number;
  price?: number;
  priceChange24h?: number;
  isSpam?: boolean;
  isNative?: boolean;
}

// Default native tokens for each chain
const NATIVE_TOKENS: { [key: string]: Token } = {
  "1": {
    symbol: "ETH",
    name: "Ethereum",
    address: "0x0000000000000000000000000000000000000000",
    balance: "0",
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

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

type NavigationProp = StackNavigationProp<RootStackParamList, 'portfolio'>;

export default function Portfolio(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();

  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState<string>("0");
  const [networkId, setNetworkId] = useState<string>("1"); // Default to Ethereum mainnet
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchPortfolioData();
    }
  }, [walletAddress]);

  const loadWalletData = async (): Promise<void> => {
    try {
      const walletData = await getStoredWallet();

      if (!walletData) {
        throw new Error("Wallet data not found");
      }

      setWalletAddress(walletData.address);
    } catch (error) {
      console.error("Error loading wallet data:", error);
      setError("Failed to load wallet data. Please try again.");
    }
  };

  const fetchPortfolioData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!walletAddress) {
        throw new Error("Wallet data not available");
      }

      // Add native token first
      const nativeToken = NATIVE_TOKENS[networkId];
      if (!nativeToken) {
        throw new Error("Unsupported network");
      }

      const tokenBalances = await getTokenBalances(walletAddress);
      const allTokens: Token[] = [nativeToken];

      if (tokenBalances && !('error' in tokenBalances)) {
        const transformedTokens = tokenBalances.map(token => ({
          symbol: token.metadata?.symbol || 'Unknown',
          name: token.metadata?.name || 'Unknown Token',
          address: token.contractAddress,
          decimals: token.metadata?.decimals || 18,
          balance: token.formattedBalance || '0',
          logo: token.metadata?.logo
        }));
        allTokens.push(...transformedTokens);
      }

      // Fetch price for all tokens
      const addresses = allTokens.map(token => token.address);
      const priceData = await getTokenPrices(addresses);

      const formattedTokens: Token[] = allTokens.map(token => {
        const priceInfo = priceData[token.symbol];
        const price = priceInfo?.price || 0;
        const balanceUSD = parseFloat(token.balance) * price;
        
        return {
          ...token,
          price,
          balanceUSD,
          priceChange24h: priceInfo?.change24h || 0
        };
      });

      // Calculate total portfolio value
      const total = formattedTokens.reduce(
        (sum, token) => sum + (token.balanceUSD || 0),
        0
      );

      setTotalValue(total.toFixed(2));
      setTokens(formattedTokens);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      setError("Failed to load portfolio. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = (): void => {
    loadWalletData();
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

  const renderTokenItem: ListRenderItem<Token> = ({ item }) => (
    <TouchableOpacity 
      style={styles.tokenCard}
      onPress={() => handleTokenPress(item)}
    >
      <LinearGradient
        colors={['rgba(106, 158, 255, 0.1)', 'rgba(106, 158, 255, 0.05)']}
        style={styles.cardBackground}
      >
        <View style={styles.tokenHeader}>
          <View style={styles.tokenIconContainer}>
            {item.logo ? (
              <Image source={{ uri: item.logo }} style={styles.tokenIcon} />
            ) : (
              <View style={[styles.tokenIcon, styles.placeholderIcon]} />
            )}
          </View>
          <View style={styles.tokenInfo}>
            <Text style={styles.tokenSymbol}>{item.symbol}</Text>
            <Text style={styles.tokenName}>{item.name}</Text>
          </View>
          <View style={styles.priceChangeContainer}>
            <Text style={[
              styles.priceChange,
              { color: (item.priceChange24h || 0) >= 0 ? "#4ADE80" : "#FF4D4D" }
            ]}>
              {(item.priceChange24h || 0) >= 0 ? "+" : ""}{(item.priceChange24h || 0).toFixed(2)}%
            </Text>
          </View>
        </View>
        
        <View style={styles.tokenBalances}>
          <Text style={styles.tokenBalance}>
            {parseFloat(item.balance).toFixed(4)} {item.symbol}
          </Text>
          <Text style={styles.tokenUsdValue}>
            ${(item.balanceUSD || 0).toFixed(2)}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Image source={require('../assets/background.png')} style={styles.backgroundImage} />
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
        <Text style={styles.networkLabel}>Network:</Text>
        <Text style={styles.networkValue}>Ethereum Mainnet</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#6A9EFF" style={styles.loader} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tokens}
          keyExtractor={(item) => item.symbol}
          renderItem={renderTokenItem}
          contentContainerStyle={styles.listContent}
          onRefresh={handleRefresh}
          refreshing={isLoading}
        />
      )}

      <BottomNav activeTab="portfolio" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1B3F",
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  portfolioValue: {
    padding: 20,
    alignItems: "center",
  },
  valueLabel: {
    fontSize: 16,
    color: "#6A9EFF",
    marginBottom: 8,
  },
  valueAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
  },
  networkContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  networkLabel: {
    fontSize: 14,
    color: "#6A9EFF",
    marginRight: 8,
  },
  networkValue: {
    fontSize: 14,
    color: "white",
  },
  listContent: {
    padding: 16,
  },
  tokenCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBackground: {
    padding: 16,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tokenIconContainer: {
    marginRight: 12,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  placeholderIcon: {
    backgroundColor: 'rgba(106, 158, 255, 0.2)',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tokenName: {
    color: '#6A9EFF',
    fontSize: 14,
  },
  priceChangeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  tokenBalances: {
    marginTop: 8,
  },
  tokenBalance: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tokenUsdValue: {
    color: '#6A9EFF',
    fontSize: 14,
  },
  loader: {
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#FF4D4D",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#6A9EFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
}); 