import { useNavigation } from "@react-navigation/native";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { getTokens, getTokenAllowance, setTokenAllowance, getRoutes, executeRoute, createConfig, EVM } from "@lifi/sdk";
import type { Token, Route, TokensResponse, RoutesRequest, RoutesResponse } from "@lifi/sdk";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import type { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/types";
import { createWalletClient, http, isAddress } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

type SwapScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Swap'>;

interface Quote extends Route {
  steps: Route["steps"];
}

const SwapScreen = (): JSX.Element => {
  const navigation = useNavigation<SwapScreenNavigationProp>();
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [fromChain, setFromChain] = useState<number>(1); // Default: Ethereum
  const [toChain, setToChain] = useState<number>(56); // Default: BSC
  const [fromToken, setFromToken] = useState<string>("");
  const [toToken, setToToken] = useState<string>("");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [walletClient, setWalletClient] = useState<any>(null);

  useEffect(() => {
    void loadWalletData();
    void fetchTokens();
  }, []);

  useEffect(() => {
    if (walletAddress) {
      // Initialize LiFi SDK with wallet client
      const account = privateKeyToAccount(walletAddress as `0x${string}`);
      const client = createWalletClient({
        account,
        chain: mainnet,
        transport: http()
      });

      setWalletClient(client);

      createConfig({
        integrator: "Your dApp/company name",
        providers: [
          EVM({
            getWalletClient: async () => client,
            switchChain: async (chainId) => client, // For simplicity, not implementing chain switching
          }),
        ],
      });
    }
  }, [walletAddress]);

  useEffect(() => {
    if (fromAmount && fromToken && toToken && fromChain && toChain) {
      void fetchQuote();
    }
  }, [fromAmount, fromToken, toToken, fromChain, toChain]);

  const loadWalletData = async (): Promise<void> => {
    try {
      const [storedAddress, storedNetworkId] = await Promise.all([
        SecureStore.getItemAsync("walletAddress"),
        SecureStore.getItemAsync("networkId"),
      ]);
      
      if (storedAddress && isAddress(storedAddress)) {
        setWalletAddress(storedAddress as `0x${string}`);
      }
      if (storedNetworkId) setNetworkId(parseInt(storedNetworkId));
    } catch (error) {
      console.error("Failed to load wallet data:", error);
      setError("Failed to load wallet data. Please try again.");
    }
  };

  const fetchTokens = async (): Promise<void> => {
    try {
      const tokenList = await getTokens({ chains: [fromChain, toChain] }) as TokensResponse;
      const allTokens = Object.values(tokenList.tokens).flat();
      setTokens(allTokens);
      if (allTokens.length > 0) {
        setFromToken(allTokens[0].address);
        if (allTokens.length > 1) {
          setToToken(allTokens[1].address);
        }
      }
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
      setError("Failed to fetch token list. Please check your connection.");
    }
  };

  const fetchQuote = async (): Promise<void> => {
    if (!walletAddress) {
      setError("Wallet not connected. Please connect your wallet first.");
      return;
    }
    if (!checkNetworkBeforeSwap()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const request: RoutesRequest = {
        fromChainId: fromChain,
        fromTokenAddress: fromToken as `0x${string}`,
        toChainId: toChain,
        toTokenAddress: toToken as `0x${string}`,
        fromAmount,
        fromAddress: walletAddress
      };
      
      const routes = await getRoutes(request) as RoutesResponse;
      
      if (!routes.routes || routes.routes.length === 0) {
        throw new Error("No routes available for this swap");
      }
      
      setQuote(routes.routes[0]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch swap route";
      setError(errorMessage);
      console.error("Failed to fetch quote:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = async (): Promise<void> => {
    if (!quote || !walletAddress || !fromToken || !walletClient) {
      Alert.alert("Error", "Please get a quote first and ensure wallet is connected");
      return;
    }
    if (!checkNetworkBeforeSwap()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const token = {
        address: fromToken as `0x${string}`,
        chainId: fromChain
      };

      const allowanceResponse = await getTokenAllowance(
        token,
        walletAddress,
        quote.steps[0].estimate.approvalAddress as `0x${string}`
      );

      if (allowanceResponse && allowanceResponse < BigInt(fromAmount)) {
        await setTokenAllowance({
          token,
          spenderAddress: quote.steps[0].estimate.approvalAddress as `0x${string}`,
          amount: BigInt(fromAmount),
          walletClient
        });
      }
      
      const step = await executeRoute(quote);
      
      console.log("Swap executed:", step);
      Alert.alert("Success", "Swap executed successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Swap failed. Please check your balance and try again.";
      setError(errorMessage);
      console.error("Swap failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkNetworkBeforeSwap = (): boolean => {
    if (networkId !== fromChain) {
      const errorMessage = `Please switch to the correct network for this swap.`;
      setError(errorMessage);
      Alert.alert("Network Error", errorMessage);
      return false;
    }
    return true;
  };

  return (
    <View style={styles.container}>
      <WalletHeader 
        pageName="Swap" 
        onAccountChange={(account) => {
          if (account?.address) {
            setWalletAddress(account.address as `0x${string}`);
            setNetworkId(account.chainId || null);
          }
        }}
      />
      <Text style={styles.title}>Swap Tokens</Text>
      <Picker 
        selectedValue={fromToken || undefined} 
        onValueChange={(value: string) => setFromToken(value)}
        style={styles.picker}
      >
        {tokens.map((token) => (
          <Picker.Item 
            key={token.address} 
            label={token.symbol} 
            value={token.address}
          />
        ))}
      </Picker>
      <TextInput
        style={styles.input}
        placeholder="Enter Amount"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={fromAmount}
        onChangeText={setFromAmount}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <TouchableOpacity 
        onPress={handleSwap} 
        style={[
          styles.swapButton,
          (isLoading || !walletAddress) && styles.disabledButton
        ]} 
        disabled={isLoading || !walletAddress}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.swapButtonText}>Swap</Text>
        )}
      </TouchableOpacity>
      <BottomNav />
    </View>
  );
};

const styles = {
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: "#121212" 
  },
  title: { 
    color: "#fff", 
    fontSize: 20, 
    textAlign: "center", 
    marginBottom: 20 
  },
  input: { 
    backgroundColor: "#222", 
    color: "#fff", 
    padding: 10, 
    marginBottom: 10, 
    borderRadius: 5 
  },
  picker: {
    backgroundColor: "#222",
    color: "#fff",
    marginBottom: 10
  },
  swapButton: { 
    backgroundColor: "#4CAF50", 
    padding: 15, 
    borderRadius: 5, 
    alignItems: "center" 
  },
  disabledButton: {
    backgroundColor: "#1f3320"
  },
  swapButtonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
  errorText: {
    color: "#ff4444",
    marginBottom: 10
  }
} as const;

export default SwapScreen; 