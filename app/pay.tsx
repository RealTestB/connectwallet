import { getTokenBalances, Token } from "../api/tokensApi";
import { sendTransaction, TransactionRequest, estimateGas } from "../api/transactionsApi";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { validateEthereumAddress } from "../utils/validators";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import config from "../api/config";
import { Alchemy, Network } from "alchemy-sdk";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/types";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ethers } from "ethers";

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

interface ValidationResult {
  isValid: boolean;
  address?: string;
  error?: string;
  warning?: string;
}

interface TransactionParams {
  from: string;
  to: string;
  amount: string;
  token: string;
  networkId: number;
}

export interface ExtendedTransactionRequest extends TransactionRequest {
  from?: string;
  chainId?: number;
}

type NavigationProp = StackNavigationProp<RootStackParamList, 'pay'>;

export default function PayScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedToken, setSelectedToken] = useState<string>("ETH");
  const [amount, setAmount] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [usdValue, setUsdValue] = useState<string>("0.00");
  const [gasEstimate, setGasEstimate] = useState<string>("0.00");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<Network>(Network.ETH_MAINNET);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [alchemy, setAlchemy] = useState<Alchemy | null>(null);
  const [showTokenPicker, setShowTokenPicker] = useState(false);

  useEffect(() => {
    loadWalletData();
    // Initialize Alchemy
    const initAlchemy = () => {
      try {
        const alchemyInstance = new Alchemy({
          apiKey: config.alchemy.mainnetKey,
          network: Network.ETH_MAINNET
        });
        setAlchemy(alchemyInstance);
      } catch (error) {
        console.error('Failed to initialize Alchemy:', error);
      }
    };
    initAlchemy();
  }, []);

  const loadWalletData = async (): Promise<void> => {
    try {
      const storedWallet = await SecureStore.getItemAsync("walletAddress");
      const storedNetwork = await SecureStore.getItemAsync("networkId");

      if (storedWallet) setWalletAddress(storedWallet);
      if (storedNetwork) {
        // Convert network ID to Alchemy Network enum
        const networkMap: { [key: string]: Network } = {
          "1": Network.ETH_MAINNET,
          "5": Network.ETH_GOERLI,
          "137": Network.MATIC_MAINNET,
          "80001": Network.MATIC_MUMBAI,
        };
        setNetworkId(networkMap[storedNetwork] || Network.ETH_MAINNET);
      }

      if (storedWallet) {
        const balances = await getTokenBalances(storedWallet);
        if (!balances || 'error' in balances) {
          throw new Error(balances?.error?.toString() || "Failed to fetch token balances");
        }
        setTokens(balances);
      }
    } catch (err) {
      console.error("Failed to load wallet data:", err);
      setError("Failed to load wallet data.");
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    const token = tokens.find((t) => t.symbol === selectedToken);
    if (token?.price && !isNaN(Number(value))) {
      setUsdValue((Number(value) * token.price).toFixed(2));
    } else {
      setUsdValue("0.00");
    }
  };

  const handleSend = async (): Promise<void> => {
    if (!walletAddress) {
      setError("No connected wallet found.");
      return;
    }

    if (!alchemy) {
      setError("Alchemy not initialized.");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Validate recipient address
      const validationResult = await validateEthereumAddress(recipient, alchemy);
      
      if (!validationResult.isValid) {
        setError(validationResult.error || "Invalid recipient address");
        setIsLoading(false);
        return;
      }

      // If address was corrected (checksum), update the display
      if (validationResult.address && validationResult.address !== recipient) {
        setRecipient(validationResult.address);
      }

      // Show warning if present
      if (validationResult.warning) {
        console.warn(validationResult.warning);
      }

      // Create transaction request
      const transactionRequest: ExtendedTransactionRequest = {
        to: validationResult.address || recipient,
        value: amount, // Amount in ETH
        chainId: networkId as unknown as number,
        from: walletAddress
      };

      // Get gas estimate
      const gasEstimate = await estimateGas(transactionRequest);
      const totalGasCost = (gasEstimate.gasLimit * gasEstimate.gasPrice);
      setGasEstimate(ethers.formatEther(totalGasCost));

      // Send transaction
      const txHash = await sendTransaction(transactionRequest);

      console.log("Transaction Successful:", txHash);
    } catch (err) {
      setError("Transaction failed. Please try again.");
      console.error('Transaction error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountChange = (account: Account): void => {
    setWalletAddress(account.address);
    if (account.chainId) {
      // Convert chain ID to Alchemy Network enum
      const networkMap: { [key: number]: Network } = {
        1: Network.ETH_MAINNET,
        5: Network.ETH_GOERLI,
        137: Network.MATIC_MAINNET,
        80001: Network.MATIC_MUMBAI,
      };
      setNetworkId(networkMap[account.chainId] || Network.ETH_MAINNET);
    }
  };

  const selectedTokenData = tokens.find(t => t.symbol === selectedToken);

  return (
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
      <WalletHeader 
        pageName="Send Token"
        onAccountChange={handleAccountChange}
      />

      <ScrollView 
        style={[
          styles.content,
          {
            paddingBottom: 64 + insets.bottom,
          }
        ]}
      >
        <View style={styles.card}>
          {/* Token Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Token</Text>
            <TouchableOpacity
              style={styles.select}
              onPress={() => setShowTokenPicker(!showTokenPicker)}
            >
              <Text style={styles.selectText}>
                {selectedToken} - Balance: {selectedTokenData?.balance}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#93c5fd" />
            </TouchableOpacity>
            {showTokenPicker && (
              <View style={styles.tokenList}>
                {tokens.map((token) => (
                  <TouchableOpacity
                    key={token.symbol}
                    style={styles.tokenOption}
                    onPress={() => {
                      setSelectedToken(token.symbol);
                      setShowTokenPicker(false);
                    }}
                  >
                    <Text style={styles.tokenOptionText}>
                      {token.symbol} - Balance: {token.balance}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Recipient Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Recipient Address</Text>
            <TextInput
              style={styles.input}
              value={recipient}
              onChangeText={setRecipient}
              placeholder="Enter wallet address"
              placeholderTextColor="#93c5fd"
            />
          </View>

          {/* Amount */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountContainer}>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor="#93c5fd"
                keyboardType="decimal-pad"
              />
              <Text style={styles.usdValue}>≈ ${usdValue}</Text>
            </View>
          </View>

          {/* Gas Estimate */}
          <View style={styles.gasContainer}>
            <Text style={styles.gasLabel}>Estimated Gas Fee</Text>
            <View style={styles.gasValue}>
              <Text style={styles.gasAmount}>{gasEstimate} ETH</Text>
              <Text style={styles.gasUsd}>(≈ $15.00)</Text>
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!amount || !recipient || isLoading) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!amount || !recipient || isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" />
              <Text style={styles.buttonText}>Sending...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Send Token</Text>
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
    paddingHorizontal: 16,
    paddingTop: 100, // Adjust based on WalletHeader height
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 24,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#93c5fd",
  },
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
  },
  selectText: {
    color: "white",
    fontSize: 16,
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
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    color: "white",
    fontSize: 16,
  },
  amountContainer: {
    position: "relative",
  },
  usdValue: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -10 }],
    color: "#93c5fd",
    fontSize: 14,
  },
  gasContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gasLabel: {
    color: "#93c5fd",
    fontSize: 14,
  },
  gasValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gasAmount: {
    color: "white",
    fontSize: 14,
  },
  gasUsd: {
    color: "#93c5fd",
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
  sendButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  sendButtonDisabled: {
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