import { useNavigation } from "@react-navigation/native";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/types";

type WalletCreatedScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WalletCreated'>;

export default function WalletCreatedScreen(): JSX.Element {
  const navigation = useNavigation<WalletCreatedScreenNavigationProp>();

  const handleStartUsingWallet = (): void => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Portfolio", params: { walletType: "smart", walletAddress: "" } }],
    });
  };

  return (
    <View style={styles.container}>
      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4, 5].map((step) => (
          <View key={step} style={[styles.dot, step === 5 && styles.activeDot]} />
        ))}
      </View>

      {/* Success Icon */}
      <View style={styles.successIconContainer}>
        <Text style={styles.successIcon}>✅</Text>
      </View>

      {/* Title & Subtitle */}
      <Text style={styles.title}>Wallet Created Successfully</Text>
      <Text style={styles.subtitle}>
        Your wallet is ready! Make sure to store your recovery phrase securely.
      </Text>

      {/* Start Using Wallet Button */}
      <TouchableOpacity
        style={styles.startButton}
        onPress={handleStartUsingWallet}
      >
        <Text style={styles.buttonText}>Start Using Wallet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1B3F",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(106, 158, 255, 0.3)",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#6A9EFF",
  },
  successIconContainer: {
    width: 96,
    height: 96,
    backgroundColor: "rgba(0, 255, 0, 0.2)",
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 40,
    color: "green",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#6A9EFF",
    textAlign: "center",
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: "#6A9EFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    maxWidth: 300,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
}); 