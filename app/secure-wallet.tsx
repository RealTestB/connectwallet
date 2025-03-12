import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/types";

type SecureWalletScreenNavigationProp = StackNavigationProp<RootStackParamList, 'secure-wallet'>;

interface SecurityTip {
  icon: string;
  title: string;
  description: string;
}

export default function SecureWalletScreen(): JSX.Element {
  const navigation = useNavigation<SecureWalletScreenNavigationProp>();
  const [confirmed, setConfirmed] = useState<boolean>(false);

  const securityTips: SecurityTip[] = [
    {
      icon: "🛡️",
      title: "Never Share Your Secret Recovery Phrase",
      description:
        "Your recovery phrase is the only way to restore your wallet. Never share it with anyone.",
    },
    {
      icon: "🔒",
      title: "Keep Your Password Safe",
      description:
        "Use a strong password and store it securely. Don't reuse passwords from other accounts.",
    },
    {
      icon: "🚫",
      title: "Beware of Phishing",
      description:
        "Always verify website URLs. Never click on suspicious links or connect to unknown sites.",
    },
    {
      icon: "📝",
      title: "Review All Transactions",
      description:
        "Always check transaction details before signing. Make sure the amount and recipient are correct.",
    },
  ];

  const handleCompleteSetup = (): void => {
    if (confirmed) {
      navigation.replace('wallet-created', {
        walletAddress: '', // This should be populated with the actual wallet address
        walletType: 'classic'
      });
    }
  };

  const renderTip = ({ item }: { item: SecurityTip }): JSX.Element => (
    <View style={styles.tipBox}>
      <View style={styles.tipIcon}>
        <Text style={styles.tipIconText}>{item.icon}</Text>
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>{item.title}</Text>
        <Text style={styles.tipDescription}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4, 5].map((step) => (
          <View key={step} style={[styles.dot, step === 4 && styles.activeDot]} />
        ))}
      </View>

      {/* Title & Subtitle */}
      <Text style={styles.title}>Secure Your Wallet</Text>
      <Text style={styles.subtitle}>Follow these security tips to keep your wallet safe</Text>

      {/* Security Tips List */}
      <FlatList
        data={securityTips}
        keyExtractor={(item) => item.title}
        renderItem={renderTip}
      />

      {/* Confirmation Checkbox */}
      <View style={styles.confirmBox}>
        <Switch
          value={confirmed}
          onValueChange={setConfirmed}
          thumbColor={confirmed ? "#6A9EFF" : "#ccc"}
        />
        <Text style={styles.confirmText}>
          I understand that I am responsible for keeping my wallet secure and that lost recovery phrases cannot be recovered.
        </Text>
      </View>

      {/* Complete Setup Button */}
      <TouchableOpacity
        style={[styles.completeButton, !confirmed && styles.disabledButton]}
        onPress={handleCompleteSetup}
        disabled={!confirmed}
      >
        <Text style={styles.buttonText}>Complete Setup</Text>
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
  tipBox: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(106, 158, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tipIconText: {
    fontSize: 20,
    color: "#6A9EFF",
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  tipDescription: {
    fontSize: 14,
    color: "#6A9EFF",
  },
  confirmBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  confirmText: {
    fontSize: 14,
    color: "#6A9EFF",
    flex: 1,
    marginLeft: 12,
  },
  completeButton: {
    backgroundColor: "#6A9EFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "rgba(106, 158, 255, 0.3)",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
}); 