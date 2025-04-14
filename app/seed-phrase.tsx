import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { ethers } from "ethers";
import config from "../api/config";
import { createClassicWallet } from "../api/walletApi";
import { sharedStyles, COLORS, SPACING } from '../styles/shared';
import OnboardingLayout from '../components/ui/OnboardingLayout';
import { STORAGE_KEYS } from '../constants/storageKeys';

export default function Page(): JSX.Element {
  const router = useRouter();
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only clean up if we haven't completed the flow
      SecureStore.getItemAsync(STORAGE_KEYS.IS_AUTHENTICATED).then(state => {
        if (state !== 'true') {
          console.log('[SeedPhrase] Cleaning up incomplete flow');
          SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE);
          SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_ADDRESS);
          SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ID);
        }
      });
    };
  }, []);

  useEffect(() => {
    generateSeedPhrase();
  }, []);

  const generateSeedPhrase = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("=== 🚀 Starting seed phrase generation ===");
      const startTime = Date.now();

      // Generate a random wallet with unique words
      let wallet: ethers.HDNodeWallet;
      let words: string[];
      
      do {
        wallet = ethers.Wallet.createRandom() as ethers.HDNodeWallet;
        if (!wallet.mnemonic?.phrase) {
          throw new Error("Failed to generate seed phrase");
        }
        words = wallet.mnemonic.phrase.split(" ");
        // Check for duplicates by converting to Set and comparing lengths
      } while (new Set(words).size !== words.length);
      
      setSeedPhrase(words);
      console.log("Generated seed phrase with", words.length, "words");

      // Create wallet using walletApi
      const walletData = await createClassicWallet();
      console.log("✅ Wallet created and stored securely");

      // Store the seed phrase
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_SEED_PHRASE, words.join(" "));
      console.log("✅ Stored seed phrase");

    } catch (error) {
      console.error("Error generating seed phrase:", error);
      setError(error instanceof Error ? error.message : "Failed to generate seed phrase. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    router.push("/confirm-seed-phrase");
  };

  return (
    <OnboardingLayout
      progress={0.5}
      title="Your Seed Phrase"
      subtitle="Write down these 12 words in order and keep them safe"
      icon="key"
    >
      <View style={styles.warningBox}>
        <Ionicons name="warning" size={20} color="#facc15" />
        <Text style={styles.warningText}>
          Never share your seed phrase with anyone. Anyone with these words can access your wallet.
        </Text>
      </View>

      <ScrollView style={styles.seedPhraseContainer}>
        <View style={styles.seedPhraseGrid}>
          {seedPhrase.map((word, index) => (
            <View key={index} style={styles.seedPhraseItem}>
              <Text style={styles.seedPhraseNumber}>{index + 1}</Text>
              <Text style={styles.seedPhraseWord}>{word}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            <Text style={styles.buttonText}>I've Written It Down</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </>
        )}
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(250, 204, 21, 0.1)",
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  warningText: {
    color: "#facc15",
    fontSize: 14,
    flex: 1,
  },
  seedPhraseContainer: {
    flex: 1,
  },
  seedPhraseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  seedPhraseItem: {
    width: '30%',
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.xs,
  },
  seedPhraseNumber: {
    color: COLORS.primary,
    fontSize: 12,
    marginBottom: 2,
  },
  seedPhraseWord: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    marginTop: SPACING.lg,
    gap: SPACING.xs,
  },
  buttonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "500",
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: "center",
    marginTop: SPACING.lg,
  },
}); 