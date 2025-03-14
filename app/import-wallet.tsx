import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

export default function ImportWalletScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleAccountChange = (account: Account) => {
    // Handle account change if needed
  };

  return (
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#f87171" />
          <Text style={styles.warningText}>
            Never share your private keys or seed phrase. Anyone with access to them can control your wallet.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/create-password?mode=new&type=import-seed")}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="leaf" size={20} color="white" />
              <Text style={styles.buttonText}>Import with Seed Phrase</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/create-password?mode=new&type=import-key")}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="key" size={20} color="white" />
              <Text style={styles.buttonText}>Import with Private Key</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.securityBox}>
          <View style={styles.securityHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#facc15" />
            <Text style={styles.securityTitle}>Important Security Tips:</Text>
          </View>
          <View style={styles.securityList}>
            <View style={styles.securityItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.securityText}>Make sure no one is watching your screen</Text>
            </View>
            <View style={styles.securityItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.securityText}>Never enter your details on untrusted websites</Text>
            </View>
            <View style={styles.securityItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.securityText}>Store your backup phrase in a secure location</Text>
            </View>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#ef44441a",
    borderWidth: 1,
    borderColor: "#ef444433",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    color: "#f87171",
    fontSize: 14,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 24,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
  },
  secondaryButton: {
    backgroundColor: "#ffffff1a",
    padding: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  securityBox: {
    backgroundColor: "#facc151a",
    borderWidth: 1,
    borderColor: "#facc1533",
    borderRadius: 12,
    padding: 16,
  },
  securityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  securityTitle: {
    color: "#facc15",
    fontSize: 14,
    fontWeight: "500",
  },
  securityList: {
    gap: 4,
  },
  securityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  bulletPoint: {
    color: "#facc15",
    fontSize: 14,
    lineHeight: 20,
  },
  securityText: {
    flex: 1,
    color: "#facc15",
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: "#ef44441a",
    borderWidth: 1,
    borderColor: "#ef444433",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
  },
}); 