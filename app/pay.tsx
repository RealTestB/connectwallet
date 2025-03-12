import { getTokenBalances, Token } from "../api/tokensApi";
import { sendTransaction, TransactionRequest, estimateGas } from "../api/transactionsApi";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { validateEthereumAddress } from "../utils/validators";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import config from "../api/config";
import { Alchemy, Network } from "alchemy-sdk";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/types";

interface Account {
  address: string;
  name?: string;
  type: 'classic' | 'smart';
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
  walletType: 'classic' | 'smart';
}

export interface ExtendedTransactionRequest extends TransactionRequest {
  from?: string;
}

type NavigationProp = StackNavigationProp<RootStackParamList, 'pay'>;

export default function Pay(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const [selectedToken, setSelectedToken] = useState<string>("ETH");
  const [amount, setAmount] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [usdValue, setUsdValue] = useState<string>("0.00");
  const [gasEstimate, setGasEstimate] = useState<string>("0.00");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<Network>(Network.ETH_MAINNET);
  const [walletType, setWalletType] = useState<'classic' | 'smart' | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [alchemy, setAlchemy] = useState<Alchemy | null>(null);

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
      const storedWalletType = await SecureStore.getItemAsync("walletType") as 'classic' | 'smart' | null;

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
      if (storedWalletType) setWalletType(storedWalletType);

      if (storedWallet && storedWalletType) {
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
    if (token?.price) {
      const usdValue = parseFloat(value) * token.price;
      setUsdValue(usdValue.toFixed(2));
    } else {
      setUsdValue('0.00');
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

    if (!walletType) {
      setError("Wallet type not found.");
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
        from: walletAddress,
        walletType
      };

      // Get gas estimate
      const gasEstimate = await estimateGas(transactionRequest);
      setGasEstimate(gasEstimate.estimatedCost);

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

  return (
    <View style={styles.container}>
      <WalletHeader 
        pageName="pay"
        onAccountChange={handleAccountChange}
      />

      <View style={styles.innerContainer}>
        {/* Token Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Token</Text>
          <Picker
            selectedValue={selectedToken}
            onValueChange={(itemValue: string) => setSelectedToken(itemValue)}
            style={styles.picker}
          >
            {tokens.map((token) => (
              <Picker.Item 
                key={token.symbol} 
                label={`${token.symbol} - Balance: ${token.balance}`} 
                value={token.symbol}
                color="#FFF"
              />
            ))}
          </Picker>
        </View>

        {/* Recipient Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recipient Address</Text>
          <TextInput
            style={styles.input}
            value={recipient}
            onChangeText={setRecipient}
            placeholder="Enter wallet address"
            placeholderTextColor="#93C5FD"
          />
        </View>

        {/* Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0.00"
            placeholderTextColor="#93C5FD"
          />
          <Text style={styles.usdText}>≈ ${usdValue}</Text>
        </View>

        {/* Estimated Gas Fee */}
        <View style={styles.gasFeeContainer}>
          <Text style={styles.gasLabel}>Estimated Gas Fee</Text>
          <Text style={styles.gasValue}>
            {gasEstimate} ETH <Text style={styles.gasUsd}>(≈ $15.00)</Text>
          </Text>
        </View>

        {/* Error Message */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Send Button */}
        <TouchableOpacity 
          onPress={handleSend} 
          style={[
            styles.sendButton,
            (!amount || !recipient || isLoading) && styles.sendButtonDisabled
          ]} 
          disabled={isLoading || !amount || !recipient}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.sendButtonText}>Send Token</Text>
          )}
        </TouchableOpacity>
      </View>

      <BottomNav activeTab="pay" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1B3F",
  },
  innerContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: "#93C5FD",
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 12,
    color: "#FFF",
  },
  usdText: {
    marginTop: 5,
    color: "#93C5FD",
    fontSize: 12,
  },
  picker: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
  },
  gasFeeContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gasLabel: {
    color: "#93C5FD",
  },
  gasValue: {
    color: "#FFF",
  },
  gasUsd: {
    color: "#93C5FD",
    marginLeft: 8,
  },
  errorText: {
    color: "#FF4D4D",
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
  },
  sendButton: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#2563EB80",
  },
  sendButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
}); 