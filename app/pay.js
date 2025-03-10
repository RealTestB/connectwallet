import { getTokenBalances } from "../api/tokensApi";
import { sendTransaction } from "../api/transactionsApi";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { validateEthereumAddress } from "../utils/validators";
import * as SecureStore from "expo-secure-store";
import { ethers } from 'ethers';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Picker,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import config from "../api/config";

const pay = () => {
  const [selectedToken, setSelectedToken] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [usdValue, setUsdValue] = useState("0.00");
  const [gasEstimate, setGasEstimate] = useState("0.00");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [networkId, setNetworkId] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    loadWalletData();
    // Initialize provider
    const initProvider = async () => {
      try {
        const ethProvider = new ethers.JsonRpcProvider(config.alchemy.rpcUrl());
        setProvider(ethProvider);
      } catch (error) {
        console.error('Failed to initialize provider:', error);
      }
    };
    initProvider();
  }, []);

  const loadWalletData = async () => {
    try {
      const storedWallet = await SecureStore.getItemAsync("walletAddress");
      const storedNetwork = await SecureStore.getItemAsync("networkId");
      const storedWalletType = await SecureStore.getItemAsync("walletType");

      if (storedWallet) setWalletAddress(storedWallet);
      if (storedNetwork) setNetworkId(parseInt(storedNetwork));
      if (storedWalletType) setWalletType(storedWalletType);

      if (storedWallet) {
        const balances = await getTokenBalances(storedWallet, storedWalletType);
        setTokens(balances);
      }
    } catch (err) {
      setError("Failed to load wallet data.");
    }
  };

  const handleAmountChange = (value) => {
    setAmount(value);
    const token = tokens.find((t) => t.symbol === selectedToken);
    if (token && !isNaN(value)) {
      setUsdValue((value * token.price).toFixed(2));
    } else {
      setUsdValue("0.00");
    }
  };

  const handleSend = async () => {
    if (!walletAddress) {
      setError("No connected wallet found.");
      return;
    }

    if (!provider) {
      setError("Network provider not initialized.");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const validationResult = await validateEthereumAddress(recipient, provider);
      
      if (!validationResult.isValid) {
        setError(validationResult.error);
        return;
      }

      // If address was corrected (checksum), update the display
      if (validationResult.address !== recipient) {
        setRecipient(validationResult.address);
      }

      // Show warning if present
      if (validationResult.warning) {
        console.warn(validationResult.warning);
      }

      const txHash = await sendTransaction({
        from: walletAddress,
        to: validationResult.address, // Use the validated/corrected address
        amount,
        token: selectedToken,
        networkId,
        walletType,
      });

      console.log("Transaction Successful:", txHash);
    } catch (err) {
      setError("Transaction failed. Please try again.");
      console.error('Transaction error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <WalletHeader pageName="Send Token" />

      <View style={styles.innerContainer}>
        {/* Token Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Token</Text>
          <Picker
            selectedValue={selectedToken}
            onValueChange={(itemValue) => setSelectedToken(itemValue)}
            style={styles.picker}
          >
            {tokens.map((token) => (
              <Picker.Item key={token.symbol} label={`${token.symbol} - Balance: ${token.balance}`} value={token.symbol} />
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
        <TouchableOpacity onPress={handleSend} style={styles.sendButton} disabled={isLoading || !amount || !recipient}>
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
};

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
    color: "#FFF",
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
    color: "red",
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
  sendButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default pay;

