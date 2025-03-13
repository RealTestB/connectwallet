import 'react-native-gesture-handler';
import { createSmartWallet } from "../api/walletApi";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

export default function WelcomeScreen(): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  const handleExistingUser = (): void => {
    Vibration.vibrate(50);
    router.push("/signin");
  };

  const handleCreateSmartWallet = async (): Promise<void> => {
    Vibration.vibrate(50);
    setLoading(true);
    try {
      console.log('[Welcome] Starting smart wallet creation...');
      const result = await createSmartWallet();
      
      if (!result || !result.address) {
        throw new Error("Smart wallet creation failed: No address returned");
      }

      const { address, type, chainId } = result;
      
      console.log('[Welcome] Smart wallet created successfully:', {
        address,
        type,
        chainId
      });

      // Small delay to ensure all state is properly saved
      await new Promise(resolve => setTimeout(resolve, 500));
      
      router.replace(`/portfolio?walletAddress=${address}&walletType=smart`);
    } catch (error) {
      console.error("[Welcome] Smart wallet creation failed:", {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      Alert.alert(
        "Wallet Creation Failed",
        error instanceof Error 
          ? error.message
          : "Failed to create smart wallet. Please check your internet connection and try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTraditional = (): void => {
    Vibration.vibrate(50);
    router.push('/create-password?mode=create');
  };

  const handleImportWallet = (): void => {
    Vibration.vibrate(50);
    router.push("/import-wallet");
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>⚡</Text>
        </View>
        <Text style={styles.title}>Welcome to NewWallet</Text>
        <Text style={styles.subtitle}>
          Your secure gateway to the world of digital assets
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.signInButton]}
          onPress={handleExistingUser}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.smartButton]}
          onPress={handleCreateSmartWallet}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Smart Wallet</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.traditionalButton]}
          onPress={handleCreateTraditional}
        >
          <Text style={styles.buttonText}>Create Traditional Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.importButton]}
          onPress={handleImportWallet}
        >
          <Text style={styles.buttonText}>Import Existing Wallet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    fontSize: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  signInButton: {
    backgroundColor: "#3b82f6",
  },
  smartButton: {
    backgroundColor: "#10b981",
  },
  traditionalButton: {
    backgroundColor: "#6366f1",
  },
  importButton: {
    backgroundColor: "#8b5cf6",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
}); 