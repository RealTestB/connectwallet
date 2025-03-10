import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View
} from "react-native";

export default function ImportSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const successType = route.params?.type || "import";

  const [message, setMessage] = useState({
    title: "",
    description: "",
    icon: "check-circle",
    tips: true,
  });

  useEffect(() => {
    let updatedMessage = {};

    switch (successType) {
      case "creation":
        updatedMessage = {
          title: "Wallet Successfully Created",
          description: "Your wallet has been created and is ready to use.",
          icon: "account-balance-wallet",
          tips: true,
        };
        break;
      case "import":
        updatedMessage = {
          title: "Wallet Successfully Imported",
          description: "Your wallet has been imported and is ready to use.",
          icon: "check-circle",
          tips: true,
        };
        break;
      case "backup":
        updatedMessage = {
          title: "Backup Complete",
          description: "Your wallet has been successfully backed up.",
          icon: "shield",
          tips: false,
        };
        break;
      case "reset":
        updatedMessage = {
          title: "Wallet Reset Complete",
          description: "Your wallet has been reset to default settings.",
          icon: "restore",
          tips: false,
        };
        break;
      default:
        updatedMessage = {
          title: "Success",
          description: "Operation completed successfully.",
          icon: "check-circle",
          tips: false,
        };
    }

    setMessage(updatedMessage);

    // Redirect to Portfolio screen after a few seconds
    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: "Portfolio" }],
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Success Icon */}
      <View style={styles.iconContainer}>
        <MaterialIcons name={message.icon} size={48} color="green" />
      </View>

      {/* Title & Description */}
      <Text style={styles.title}>{message.title}</Text>
      <Text style={styles.description}>{message.description}</Text>

      {/* Security Tips */}
      {message.tips && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>🔹 Important Security Tips:</Text>
          <Text style={styles.tipText}>🔹 Never share your private key or seed phrase.</Text>
          <Text style={styles.tipText}>🔹 Store your recovery phrase securely.</Text>
          <Text style={styles.tipText}>🔹 Keep your password private and use a strong combination.</Text>
        </View>
      )}

      {/* Redirecting Message */}
      <Text style={styles.redirectText}>Redirecting to your wallet...</Text>
      <ActivityIndicator size="large" color="white" />
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
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(0, 255, 0, 0.2)",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#6A9EFF",
    textAlign: "center",
    marginBottom: 20,
  },
  tipsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6A9EFF",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: "#6A9EFF",
    marginBottom: 4,
  },
  redirectText: {
    fontSize: 16,
    color: "#6A9EFF",
    textAlign: "center",
    marginBottom: 10,
  },
});

