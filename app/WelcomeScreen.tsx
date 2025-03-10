import 'react-native-gesture-handler';
import { authenticateUser } from "../api/authApi";
import { createSmartWallet } from "../api/walletService";
import { router } from "expo-router";
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

export default function WelcomeScreen() {
  const [loading, setLoading] = useState(false);

  const handleExistingUser = () => {
    Vibration.vibrate(50);
    router.push("/SignInScreen");
  };

  const handleCreateSmartWallet = async () => {
    Vibration.vibrate(50);
    setLoading(true);
    try {
      const { address } = await createSmartWallet();
      router.replace({
        pathname: "/portfolio",
        params: { 
          walletAddress: address,
          walletType: 'smart'
        }
      });
    } catch (error) {
      console.error("Smart wallet creation failed:", error);
      Alert.alert("Error", "Failed to create smart wallet. Please try again.");
    }
    setLoading(false);
  };

  const handleCreateTraditional = () => {
    Vibration.vibrate(50);
    router.push({
      pathname: "/CreatePasswordScreen",
      params: { mode: 'new', walletType: 'classic' }
    });
  };

  const handleImportWallet = () => {
    Vibration.vibrate(50);
    router.push("/ImportWalletScreen");
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