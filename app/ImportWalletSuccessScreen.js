import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function ImportWalletSuccessScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Success Icon */}
      <View style={styles.successIconContainer}>
        <Text style={styles.successIcon}>✅</Text>
      </View>

      {/* Title & Subtitle */}
      <Text style={styles.title}>Wallet Successfully Imported</Text>
      <Text style={styles.subtitle}>
        Your wallet has been imported and is ready to use.
      </Text>

      {/* Security Tips */}
      <View style={styles.securityBox}>
        <Text style={styles.securityTitle}>🔐 Important Security Tips:</Text>
        <Text style={styles.securityTip}>• Never share your private key or seed phrase.</Text>
        <Text style={styles.securityTip}>• Store your recovery phrase in a secure location.</Text>
        <Text style={styles.securityTip}>• Keep your password private and use a strong combination.</Text>
      </View>

      {/* Start Using Wallet Button */}
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => navigation.navigate("Home")}
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
  successIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(0, 255, 0, 0.2)",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 36,
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
  securityBox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    width: "100%",
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "yellow",
    marginBottom: 6,
  },
  securityTip: {
    color: "#6A9EFF",
    fontSize: 14,
    marginBottom: 4,
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
