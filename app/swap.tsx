import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WalletHeader from "../components/ui/WalletHeader";
import BottomNav from "../components/ui/BottomNav";

interface Token {
  symbol: string;
  name: string;
  balance: string;
  price: number;
}

export default function SwapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fromToken, setFromToken] = useState("ETH");
  const [toToken, setToToken] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [estimatedOutput, setEstimatedOutput] = useState("0.00");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFromTokenPicker, setShowFromTokenPicker] = useState(false);
  const [showToTokenPicker, setShowToTokenPicker] = useState(false);

  const tokens: Token[] = [
    { symbol: "ETH", name: "Ethereum", balance: "1.234", price: 2000 },
    { symbol: "USDC", name: "USD Coin", balance: "1500.00", price: 1 },
    { symbol: "MATIC", name: "Polygon", balance: "2500.00", price: 0.8 },
  ];

  const handleAmountChange = (value: string) => {
    setAmount(value);
    const fromTokenData = tokens.find(t => t.symbol === fromToken);
    const toTokenData = tokens.find(t => t.symbol === toToken);
    if (fromTokenData && toTokenData && !isNaN(Number(value))) {
      const output = (Number(value) * fromTokenData.price / toTokenData.price).toFixed(6);
      setEstimatedOutput(output);
    } else {
      setEstimatedOutput("0.00");
    }
  };

  const handleSwap = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Here you would make the actual swap
    } catch (err) {
      setError("Swap failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountChange = (account: { address: string; chainId?: number }) => {
    // Handle account change
  };

  const fromTokenData = tokens.find(t => t.symbol === fromToken);
  const toTokenData = tokens.find(t => t.symbol === toToken);

  return (
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
      <WalletHeader 
        pageName="Swap"
        onAccountChange={handleAccountChange}
      />

      <ScrollView 
        style={[
          styles.content,
          {
            paddingTop: insets.top + 80,
            paddingBottom: insets.bottom + 24,
          }
        ]}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.card}>
          {/* From Token */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>From</Text>
            <TouchableOpacity
              style={styles.tokenSelect}
              onPress={() => setShowFromTokenPicker(!showFromTokenPicker)}
            >
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenSymbol}>{fromToken}</Text>
                <Text style={styles.tokenBalance}>
                  Balance: {fromTokenData?.balance || "0.00"}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#93c5fd" />
            </TouchableOpacity>
            {showFromTokenPicker && (
              <View style={styles.tokenList}>
                {tokens.map((token) => (
                  <TouchableOpacity
                    key={token.symbol}
                    style={styles.tokenOption}
                    onPress={() => {
                      setFromToken(token.symbol);
                      setShowFromTokenPicker(false);
                      handleAmountChange(amount);
                    }}
                  >
                    <Text style={styles.tokenOptionText}>
                      {token.symbol} - Balance: {token.balance}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.amountContainer}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor="#93c5fd"
                keyboardType="decimal-pad"
              />
              <Text style={styles.usdValue}>
                ≈ ${(Number(amount) * (fromTokenData?.price || 0)).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Swap Icon */}
          <View style={styles.swapIconContainer}>
            <TouchableOpacity
              style={styles.swapIcon}
              onPress={() => {
                const temp = fromToken;
                setFromToken(toToken);
                setToToken(temp);
                handleAmountChange(amount);
              }}
            >
              <Ionicons name="swap-vertical" size={24} color="#93c5fd" />
            </TouchableOpacity>
          </View>

          {/* To Token */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>To</Text>
            <TouchableOpacity
              style={styles.tokenSelect}
              onPress={() => setShowToTokenPicker(!showToTokenPicker)}
            >
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenSymbol}>{toToken}</Text>
                <Text style={styles.tokenBalance}>
                  Balance: {toTokenData?.balance || "0.00"}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#93c5fd" />
            </TouchableOpacity>
            {showToTokenPicker && (
              <View style={styles.tokenList}>
                {tokens.map((token) => (
                  <TouchableOpacity
                    key={token.symbol}
                    style={styles.tokenOption}
                    onPress={() => {
                      setToToken(token.symbol);
                      setShowToTokenPicker(false);
                      handleAmountChange(amount);
                    }}
                  >
                    <Text style={styles.tokenOptionText}>
                      {token.symbol} - Balance: {token.balance}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.amountContainer}>
              <Text style={styles.estimatedOutput}>{estimatedOutput}</Text>
              <Text style={styles.usdValue}>
                ≈ ${(Number(estimatedOutput) * (toTokenData?.price || 0)).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Price Info */}
          <View style={styles.priceInfo}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.priceValue}>
              1 {fromToken} = {(fromTokenData?.price || 0) / (toTokenData?.price || 1)} {toToken}
            </Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.swapButton,
            (!amount || isLoading) && styles.swapButtonDisabled
          ]}
          onPress={handleSwap}
          disabled={!amount || isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" />
              <Text style={styles.buttonText}>Swapping...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Swap Tokens</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <BottomNav activeTab="pay" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 24,
    gap: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#93c5fd",
  },
  tokenSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
  },
  tokenInfo: {
    gap: 4,
  },
  tokenSymbol: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  tokenBalance: {
    color: "#93c5fd",
    fontSize: 14,
  },
  tokenList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "rgba(30, 58, 138, 0.95)",
    borderRadius: 12,
    marginTop: 4,
    zIndex: 10,
  },
  tokenOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  tokenOptionText: {
    color: "white",
    fontSize: 16,
  },
  amountContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
  },
  amountInput: {
    color: "white",
    fontSize: 24,
    fontWeight: "500",
  },
  estimatedOutput: {
    color: "white",
    fontSize: 24,
    fontWeight: "500",
  },
  usdValue: {
    color: "#93c5fd",
    fontSize: 14,
    marginTop: 4,
  },
  swapIconContainer: {
    alignItems: "center",
  },
  swapIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  priceInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
  },
  priceLabel: {
    color: "#93c5fd",
    fontSize: 14,
  },
  priceValue: {
    color: "white",
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 12,
    padding: 16,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
  },
  swapButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  swapButtonDisabled: {
    backgroundColor: "rgba(59, 130, 246, 0.5)",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
}); 