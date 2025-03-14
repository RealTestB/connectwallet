import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Checkbox from 'expo-checkbox';

interface SecurityTip {
  icon: string;
  title: string;
  description: string;
}

export default function SecureWalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isConfirmed, setIsConfirmed] = useState(false);

  const securityTips: SecurityTip[] = [
    {
      icon: "shield",
      title: "Never Share Your Secret Recovery Phrase",
      description:
        "Your recovery phrase is the key to your wallet. Never share it with anyone or store it digitally.",
    },
    {
      icon: "lock-closed",
      title: "Keep Your Password Strong",
      description:
        "Use a unique password with mixed characters. Never reuse passwords from other accounts.",
    },
    {
      icon: "person-circle",
      title: "Be Careful of Scams",
      description:
        "Never give out your wallet credentials. Legitimate services will never ask for your private keys.",
    },
    {
      icon: "document-text",
      title: "Verify All Transactions",
      description:
        "Always double-check transaction details before confirming. Make sure the amount and address are correct.",
    },
  ];

  return (
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
      <ScrollView 
        style={[
          styles.content,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          }
        ]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[
                styles.progressStep,
                step === 4 ? styles.progressStepActive : styles.progressStepInactive
              ]}
            />
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Secure Your Wallet</Text>
          <Text style={styles.subtitle}>
            Review these security tips to keep your assets safe
          </Text>
        </View>

        {/* Security Tips */}
        <View style={styles.tipsContainer}>
          {securityTips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <View style={styles.tipContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name={tip.icon} size={20} color="#93c5fd" />
                </View>
                <View style={styles.tipTextContainer}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Text style={styles.tipDescription}>{tip.description}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Confirmation Section */}
        <View style={styles.confirmationContainer}>
          <Pressable 
            style={styles.checkboxContainer}
            onPress={() => setIsConfirmed(!isConfirmed)}
          >
            <Checkbox
              value={isConfirmed}
              onValueChange={setIsConfirmed}
              color={isConfirmed ? '#3b82f6' : undefined}
              style={styles.checkbox}
            />
            <Text style={styles.checkboxLabel}>
              I understand that I am responsible for keeping my wallet secure
              and that lost credentials cannot be recovered
            </Text>
          </Pressable>

          <TouchableOpacity
            style={[
              styles.completeButton,
              !isConfirmed && styles.completeButtonDisabled
            ]}
            onPress={() => isConfirmed && router.push("/wallet-created")}
            disabled={!isConfirmed}
          >
            <Text style={styles.completeButtonText}>Complete Setup</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
  },
  progressContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 32,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: "#3b82f6",
  },
  progressStepInactive: {
    backgroundColor: "rgba(59, 130, 246, 0.3)",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#93c5fd",
    textAlign: "center",
  },
  tipsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  tipCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
  },
  tipContent: {
    flexDirection: "row",
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  tipDescription: {
    color: "#93c5fd",
    fontSize: 14,
  },
  confirmationContainer: {
    gap: 24,
  },
  checkboxContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  checkbox: {
    marginTop: 4,
  },
  checkboxLabel: {
    flex: 1,
    color: "#93c5fd",
    fontSize: 14,
  },
  completeButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
}); 