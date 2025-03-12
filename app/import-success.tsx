import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

type SuccessType = "creation" | "import" | "backup" | "reset";

type RootStackParamList = {
  Portfolio: undefined;
  ImportSuccess: { type: SuccessType };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SuccessMessage {
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tips: boolean;
}

export default function ImportSuccessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const successType = (route.params as { type: SuccessType })?.type || "import";
  const [timeLeft, setTimeLeft] = useState(3);

  const [message, setMessage] = useState<SuccessMessage>({
    title: "",
    description: "",
    icon: "check-circle",
    tips: true,
  });

  useEffect(() => {
    let updatedMessage: SuccessMessage = {
      title: "",
      description: "",
      icon: "check-circle",
      tips: true,
    };

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

    // Countdown timer
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleNavigateToPortfolio();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [successType]);

  const handleNavigateToPortfolio = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Portfolio" }],
    });
  };

  const securityTips = [
    {
      icon: "🔒",
      text: "Never share your private key or seed phrase with anyone.",
    },
    {
      icon: "📝",
      text: "Store your recovery phrase in a secure, offline location.",
    },
    {
      icon: "🔐",
      text: "Use a strong password and enable biometric authentication if available.",
    },
    {
      icon: "⚠️",
      text: "Be cautious of phishing attempts and verify all transactions.",
    },
  ];

  return (
    <View style={styles.container}>
      {/* Success Icon */}
      <View style={styles.iconContainer}>
        <MaterialIcons name={message.icon} size={48} color="#4CAF50" />
      </View>

      {/* Title & Description */}
      <Text style={styles.title}>{message.title}</Text>
      <Text style={styles.description}>{message.description}</Text>

      {/* Security Tips */}
      {message.tips && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Important Security Tips:</Text>
          {securityTips.map((tip, index) => (
            <View key={index} style={styles.tipRow}>
              <Text style={styles.tipIcon}>{tip.icon}</Text>
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Navigation Options */}
      <View style={styles.navigationContainer}>
        <Text style={styles.redirectText}>
          Redirecting to your wallet in {timeLeft}s...
        </Text>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleNavigateToPortfolio}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
      <ActivityIndicator size="large" color="#6A9EFF" />
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
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#6A9EFF",
    textAlign: "center",
    marginBottom: 24,
  },
  tipsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: "100%",
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6A9EFF",
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  tipIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 24,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#6A9EFF",
    lineHeight: 20,
  },
  navigationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  redirectText: {
    fontSize: 16,
    color: "#6A9EFF",
    marginRight: 12,
  },
  skipButton: {
    backgroundColor: "rgba(106, 158, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  skipButtonText: {
    color: "#6A9EFF",
    fontWeight: "600",
  },
}); 