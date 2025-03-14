import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import WalletHeader from "../components/ui/WalletHeader";

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

export default function ConfirmSeedPhraseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const [selectedWords, setSelectedWords] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const requiredWordIndices = [2, 5, 8, 11];
  const totalWords = 12;
  const mockPhrase = [
    "abandon",
    "ability",
    "able",
    "about",
    "above",
    "absent",
    "absorb",
    "abstract",
    "absurd",
    "abuse",
    "access",
    "accident",
  ];

  const handleWordInput = (index: number, value: string) => {
    setSelectedWords((prev) => ({
      ...prev,
      [index]: value.toLowerCase().trim(),
    }));
    setError(null);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      // Here you would make your API call
      // For now, we'll just simulate success
      router.push("/secure-wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
      <WalletHeader pageName="Verify Recovery Phrase" onAccountChange={() => {}} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.stepsContainer}>
          <View style={styles.steps}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.stepDot,
                  step === 3 ? styles.activeStep : styles.inactiveStep,
                ]}
              />
            ))}
          </View>
        </View>

        <Text style={styles.title}>Verify Recovery Phrase</Text>
        <Text style={styles.subtitle}>
          Please enter the following words from your recovery phrase to verify you have saved it correctly
        </Text>

        <View style={styles.wordsGrid}>
          {Array.from({ length: totalWords }, (_, i) => (
            <View key={i} style={styles.wordContainer}>
              <Text style={styles.wordNumber}>#{i + 1}</Text>
              {requiredWordIndices.includes(i) ? (
                <TextInput
                  style={styles.wordInput}
                  placeholder="Enter word"
                  placeholderTextColor="rgba(147, 197, 253, 0.5)"
                  value={selectedWords[i] || ""}
                  onChangeText={(value) => handleWordInput(i, value)}
                />
              ) : (
                <Text style={styles.wordText}>{mockPhrase[i]}</Text>
              )}
            </View>
          ))}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.verifyButton,
            (isVerifying || requiredWordIndices.some((i) => !selectedWords[i])) && styles.verifyButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={isVerifying || requiredWordIndices.some((i) => !selectedWords[i])}
        >
          {isVerifying ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>
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
  stepsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 32,
  },
  steps: {
    flexDirection: "row",
    gap: 4,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeStep: {
    backgroundColor: "#3b82f6",
  },
  inactiveStep: {
    backgroundColor: "#3b82f680",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 24,
  },
  subtitle: {
    color: "#93c5fd",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  wordsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  wordContainer: {
    width: "48%",
    backgroundColor: "#ffffff1a",
    borderRadius: 12,
    padding: 12,
  },
  wordNumber: {
    color: "#93c5fd",
    fontSize: 12,
    marginBottom: 4,
  },
  wordInput: {
    color: "white",
    fontSize: 16,
    padding: 0,
  },
  wordText: {
    color: "white",
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: "#ef44441a",
    borderWidth: 1,
    borderColor: "#ef444433",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
  },
  verifyButton: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
}); 