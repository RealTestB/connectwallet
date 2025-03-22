import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { testReadWritePermissions } from "../api/supabaseApi";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testReadWritePermissions();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        canWrite: false,
        canRead: false,
        error: error instanceof Error ? error.message : "Connection failed"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const renderTestResult = () => {
    if (!testResult) return null;

    return (
      <View style={styles.testResultContainer}>
        <Text style={[styles.testResultText, { color: testResult.canWrite ? "#4ade80" : "#ef4444" }]}>
          Write: {testResult.canWrite ? "✅" : "❌"}
        </Text>
        <Text style={[styles.testResultText, { color: testResult.canRead ? "#4ade80" : "#ef4444" }]}>
          Read: {testResult.canRead ? "✅" : "❌"}
        </Text>
        {testResult.error && (
          <Text style={[styles.testResultText, { color: "#ef4444" }]}>
            Error: {testResult.error}
          </Text>
        )}
        {testResult.writeResponse && (
          <Text style={styles.testResultText}>
            Write ID: {testResult.writeResponse.id}
          </Text>
        )}
        {testResult.readResponses?.recent && (
          <Text style={styles.testResultText}>
            Found {testResult.readResponses.recent.length} recent records
          </Text>
        )}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
      <View 
        style={[
          styles.content,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to ConnectWallet</Text>
          <Text style={styles.subtitle}>Your Gateway to Web3</Text>
        </View>

        {/* Create Wallet Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create New Wallet</Text>
          <Text style={styles.cardDescription}>
            Start fresh with a new wallet. You'll get a seed phrase to keep safe.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/create-password")}
          >
            <Text style={styles.buttonText}>Create Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Import Wallet Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Import Existing Wallet</Text>
          <Text style={styles.cardDescription}>
            Already have a wallet? Import it using your seed phrase.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/import-wallet")}
          >
            <Text style={styles.buttonText}>Import Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Test Connection Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Test Database Connection</Text>
          <Text style={styles.cardDescription}>
            Test read/write permissions on the database.
          </Text>
          {renderTestResult()}
          <TouchableOpacity
            style={[styles.button, isTesting && styles.buttonDisabled]}
            onPress={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Test Connection</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: "center",
    marginVertical: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#93c5fd",
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#93c5fd",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  testResultContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  testResultText: {
    color: "#93c5fd",
    fontSize: 14,
    marginBottom: 4,
  }
}); 