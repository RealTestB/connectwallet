import { useNavigation } from "@react-navigation/native";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { LiFi, getTokens, getTokenBalance, getTokenAllowance, setTokenAllowance, getRoutes, executeRoute } from "@lifi/sdk";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View, Picker, Alert } from "react-native";

const SwapScreen = () => {
  const navigation = useNavigation();
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [fromChain, setFromChain] = useState(1); // Default: Ethereum
  const [toChain, setToChain] = useState(56); // Default: BSC
  const [fromToken, setFromToken] = useState(null);
  const [toToken, setToToken] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quote, setQuote] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [networkId, setNetworkId] = useState(null);
  
  useEffect(() => {
    loadWalletData();
    fetchTokens();
  }, []);

  useEffect(() => {
    if (fromAmount && fromToken && toToken && fromChain && toChain) {
      fetchQuote();
    }
  }, [fromAmount, fromToken, toToken, fromChain, toChain]);

  const loadWalletData = async () => {
    try {
      const [storedAddress, storedNetworkId] = await Promise.all([
        SecureStore.getItemAsync("walletAddress"),
        SecureStore.getItemAsync("networkId"),
      ]);
      
      if (storedAddress) setWalletAddress(storedAddress);
      if (storedNetworkId) setNetworkId(parseInt(storedNetworkId));
    } catch (error) {
      console.error("Failed to load wallet data:", error);
      setError("Failed to load wallet data. Please try again.");
    }
  };

  const fetchTokens = async () => {
    try {
      const tokenList = await getTokens({ chains: [fromChain, toChain] });
      setTokens(tokenList);
      setFromToken(tokenList[0]?.address || null);
      setToToken(tokenList[1]?.address || null);
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
      setError("Failed to fetch token list. Please check your connection.");
    }
  };

  const fetchQuote = async () => {
    if (!walletAddress) {
      setError("Wallet not connected. Please connect your wallet first.");
      return;
    }
    if (!checkNetworkBeforeSwap()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const routes = await getRoutes({
        fromChain,
        fromToken,
        toChain,
        toToken,
        fromAmount,
        fromAddress: walletAddress
      });
      
      if (!routes || routes.length === 0) {
        throw new Error("No routes available for this swap");
      }
      
      setQuote(routes[0]); // Select the best route
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch swap route";
      setError(errorMessage);
      console.error("Failed to fetch quote:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!quote || !walletAddress) {
      Alert.alert("Error", "Please get a quote first");
      return;
    }
    if (!checkNetworkBeforeSwap()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const allowance = await getTokenAllowance({
        chain: fromChain,
        token: fromToken,
        owner: walletAddress,
      });

      if (allowance < fromAmount) {
        await setTokenAllowance({
          chain: fromChain,
          token: fromToken,
          owner: walletAddress,
          amount: fromAmount,
        });
      }
      
      const step = await executeRoute(quote, { 
        signer: walletAddress
      });
      
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

  const checkNetworkBeforeSwap = () => {
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
      <WalletHeader />
      <Text style={styles.title}>Swap Tokens</Text>
      <Picker 
        selectedValue={fromToken} 
        onValueChange={setFromToken}
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
};

export default SwapScreen;



