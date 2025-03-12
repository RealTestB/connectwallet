import { getTokenPrices } from "../api/pricingApi";
import { getTokenBalances } from "../api/tokensApi";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ListRenderItem,
} from "react-native";
import { Network } from "alchemy-sdk";
import { RootStackParamList } from "../navigation/types";

interface Token {
  symbol: string;
  name: string;
  address: string;
  balance: string;
  usdValue: string;
  price: string;
  priceChange: number;
  decimals: number;
}

interface Account {
  address: string;
  name?: string;
  type: 'classic' | 'smart';
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
  const [walletType, setWalletType] = useState<'classic' | 'smart' | null>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  useEffect(() => {
    if (walletAddress && walletType) {
      fetchPortfolioData();
    }
  }, [walletAddress, walletType]);

  const loadWalletData = async (): Promise<void> => {
    try {
      const storedWalletAddress = await SecureStore.getItemAsync("walletAddress");
      const storedWalletType = await SecureStore.getItemAsync("walletType") as 'classic' | 'smart' | null;

      if (!storedWalletAddress || !storedWalletType) {
        throw new Error("Wallet data not found");
      }

      setWalletAddress(storedWalletAddress);
      setWalletType(storedWalletType);
    } catch (error) {
      console.error("Error loading wallet data:", error);
      setError("Failed to load wallet data. Please try again.");
    }
  };

  const fetchPortfolioData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!walletAddress || !walletType) {
        throw new Error("Wallet data not available");
      }

      const tokenBalances = await getTokenBalances(walletAddress);

      if (!tokenBalances || 'error' in tokenBalances) {
        throw new Error(tokenBalances?.error?.toString() || "Failed to fetch portfolio data");
      }

      // Fetch price for all tokens
      const addresses = tokenBalances.map(token => token.address);
      const priceData = await getTokenPrices(addresses);

      const formattedTokens = tokenBalances.map(token => {
        const priceInfo = priceData[token.symbol];
        const usdValue = (parseFloat(token.balance) * (priceInfo?.price || 0)).toFixed(2);
        return {
          ...token,
          usdValue,
          price: (priceInfo?.price || 0).toFixed(2),
          priceChange: priceInfo?.change24h || 0,
        };
      });

      // Calculate total portfolio value
      const total = formattedTokens.reduce(
        (sum, token) => sum + parseFloat(token.usdValue),
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
    setWalletType(account.type);
    if (account.chainId) {
      setNetworkId(account.chainId.toString());
    }
  };

  const renderTokenItem: ListRenderItem<Token> = ({ item }) => (
    <TouchableOpacity 
      style={styles.tokenContainer}
      onPress={() => handleTokenPress(item)}
    >
      <View style={styles.tokenInfo}>
        <Text style={styles.tokenName}>
          {item.name} ({item.symbol})
        </Text>
        <Text style={styles.tokenBalance}>
          {parseFloat(item.balance).toFixed(4)} {item.symbol}
        </Text>
      </View>
      <View style={styles.tokenValues}>
        <Text style={styles.tokenValue}>${item.usdValue}</Text>
        <Text style={[
          styles.priceChange,
          { color: item.priceChange >= 0 ? "#4ADE80" : "#FF4D4D" }
        ]}>
          {item.priceChange >= 0 ? "+" : ""}{item.priceChange}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <WalletHeader 
        pageName="portfolio"
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
    paddingHorizontal: 16,
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
  tokenContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 12,
    borderRadius: 12,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  tokenBalance: {
    color: "#6A9EFF",
    fontSize: 14,
  },
  tokenValues: {
    alignItems: "flex-end",
  },
  tokenValue: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  priceChange: {
    fontSize: 14,
  },
}); 