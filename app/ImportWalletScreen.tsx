import { createSmartWallet } from "../api/walletApi";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/types";

type ImportWalletScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ImportWallet'>;

export default function ImportWalletScreen(): JSX.Element {
  const navigation = useNavigation<ImportWalletScreenNavigationProp>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImportSmartWallet = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { address } = await createSmartWallet();
      navigation.replace("Portfolio", { 
        walletAddress: address, 
        walletType: "smart" 
      });
    } catch (err) {
      console.error("Smart Wallet import failed:", err);
      setError("Failed to create Smart Wallet. Please try again.");
      Alert.alert("Error", "Could not create a Smart Wallet.");
    }
    setLoading(false);
  };

  const handleImportSeedPhrase = (): void => {
    navigation.navigate("CreatePassword", {
      mode: "import",
      type: "seed-phrase"
    });
  };

  const handleImportPrivateKey = (): void => {
    navigation.navigate("CreatePassword", {
      mode: "import",
      type: "private-key"
    });
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Import Wallet</Text>
      </View>

      {/* Security Warning */}
      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          ⚠ Never share your private keys or seed phrase. Anyone with access to them can control your wallet.
        </Text>
      </View>

      {/* Import Options */}
      <TouchableOpacity
        style={styles.importOption}
        onPress={handleImportSeedPhrase}
      >
        <Text style={styles.importText}>🌱 Import with Seed Phrase</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.importOptionSecondary}
        onPress={handleImportPrivateKey}
      >
        <Text style={styles.importText}>🔑 Import with Private Key</Text>
      </TouchableOpacity>

      {/* One-Tap Wallet Import */}
      <TouchableOpacity
        style={styles.importButton}
        onPress={handleImportSmartWallet}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>🚀 One-Tap Import Smart Wallet</Text>
        )}
      </TouchableOpacity>

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1B3F",
    padding: 20,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    fontSize: 24,
    color: "#6A9EFF",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    flex: 1,
  },
  warningBox: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  warningText: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
  },
  importOption: {
    backgroundColor: "#1A2F6C",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  importOptionSecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  importButton: {
    backgroundColor: "#4ADE80",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  importText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  errorText: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 10,
  },
}); 