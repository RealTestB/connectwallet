import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { decryptSeedPhrase } from "../api/securityApi";
import { createClassicWallet } from "../api/walletApi";
import { addWallet, createAnonymousUser } from "../api/supabaseApi";
import { useAuth } from "../contexts/AuthContext";

const SETUP_STEPS = {
  PASSWORD_CREATED: 'password_created',
  SEED_PHRASE_GENERATED: 'seed_phrase_generated',
  SEED_PHRASE_CONFIRMED: 'seed_phrase_confirmed',
  SETUP_COMPLETED: 'setup_completed'
};

export default function ConfirmSeedPhraseScreen() {
  const router = useRouter();
  const [selectedWords, setSelectedWords] = useState<Record<number, string>>({});
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Randomly select 4 indices that need to be verified
  const [requiredWordIndices] = useState(() => {
    const indices: number[] = [];
    while (indices.length < 4) {
      const index = Math.floor(Math.random() * 12);
      if (!indices.includes(index)) {
        indices.push(index);
      }
    }
    return indices.sort((a, b) => a - b);
  });

  useEffect(() => {
    loadSeedPhrase();
  }, []);

  const loadSeedPhrase = async () => {
    try {
      console.log("Loading seed phrase...");
      
      // Get the temporary seed phrase
      const tempSeedPhrase = await SecureStore.getItemAsync('tempSeedPhrase');
      console.log("Retrieved temporary seed phrase:", tempSeedPhrase ? "found" : "not found");
      
      if (!tempSeedPhrase) {
        throw new Error('No seed phrase found');
      }

      // Split the phrase into words
      const words = tempSeedPhrase.split(' ');
      console.log("Split seed phrase into", words.length, "words");
      
      setSeedPhrase(words);
    } catch (error) {
      console.error('Error loading seed phrase:', error);
      setError('Failed to load seed phrase');
    }
  };

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
      console.log("Verifying seed phrase...");
      console.log("Required indices:", requiredWordIndices);
      console.log("Selected words:", selectedWords);
      
      // Verify each required word matches the original seed phrase
      const isCorrect = requiredWordIndices.every(
        (index) => selectedWords[index]?.toLowerCase() === seedPhrase[index]?.toLowerCase()
      );

      if (!isCorrect) {
        throw new Error('Some words do not match. Please check and try again.');
      }

      console.log("Words verified successfully");

      try {
        // Create an anonymous user first
        console.log("Creating anonymous user...");
        const user = await createAnonymousUser();
        if (!user?.id) {
          throw new Error('Failed to create user in Supabase');
        }
        console.log("Created anonymous user:", user.id);

        // Store the user ID
        await SecureStore.setItemAsync('userId', user.id);
        console.log("Stored user ID in SecureStore");

        // First update setup state
        await SecureStore.setItemAsync('walletSetupState', SETUP_STEPS.SEED_PHRASE_CONFIRMED);
        console.log("Updated setup state to SEED_PHRASE_CONFIRMED");

        // Create the wallet in SecureStore
        const walletData = await createClassicWallet();
        console.log("Created wallet in SecureStore:", walletData.address);

        // Add wallet to database
        console.log("Adding wallet to database...");
        const dbWallet = await addWallet({
          user_id: user.id,
          address: walletData.address,
          chain_id: walletData.chainId || 1,
          is_primary: true,
          name: 'My Wallet'
        });

        if (!dbWallet) {
          throw new Error('Failed to add wallet to database');
        }
        console.log("Added wallet to database:", dbWallet.id);

        // Clean up the temporary seed phrase
        await SecureStore.deleteItemAsync('tempSeedPhrase');
        console.log("Cleaned up temporary seed phrase");

        // Update to completed state
        await SecureStore.setItemAsync('walletSetupState', SETUP_STEPS.SETUP_COMPLETED);
        console.log("Updated setup state to SETUP_COMPLETED");

        // Navigate to next screen using replace to prevent back navigation
        router.replace('/secure-wallet');
      } catch (dbError) {
        console.error("Database error:", dbError);
        // If we hit a database error, we should clean up
        await SecureStore.deleteItemAsync('userId');
        await SecureStore.deleteItemAsync('walletSetupState');
        throw new Error(dbError instanceof Error ? dbError.message : 'Failed to create wallet. Please try again.');
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
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
          {seedPhrase.map((word, i) => (
            <View key={i} style={styles.wordContainer}>
              <Text style={styles.wordNumber}>#{i + 1}</Text>
              {requiredWordIndices.includes(i) ? (
                <TextInput
                  style={styles.wordInput}
                  placeholder="Enter word"
                  placeholderTextColor="rgba(147, 197, 253, 0.5)"
                  value={selectedWords[i] || ""}
                  onChangeText={(value) => handleWordInput(i, value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              ) : (
                <Text style={styles.wordText}>{word}</Text>
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