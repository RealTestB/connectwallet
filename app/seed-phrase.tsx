import { useRouter } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator } from "react-native";
import { encryptSeedPhrase } from "../api/securityApi";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ethers } from "ethers";
import * as Crypto from 'expo-crypto';
import { resolveTempUserId, createWallet } from "../api/supabaseApi";
import { sharedStyles, COLORS, SPACING } from '../styles/shared';
import OnboardingLayout from '../components/ui/OnboardingLayout';
import config from '../api/config';

const SETUP_STEPS = {
  PASSWORD_CREATED: 'password_created',
  SEED_PHRASE_GENERATED: 'seed_phrase_generated',
  SEED_PHRASE_CONFIRMED: 'seed_phrase_confirmed',
  SETUP_COMPLETED: 'setup_completed'
};

export default function Page(): JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [revealed, setRevealed] = useState<boolean>(false);
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    disableScreenCapture();
    generateSeedPhrase();
  }, []);

  const disableScreenCapture = async (): Promise<void> => {
    await ScreenCapture.preventScreenCaptureAsync();
  };

  const generateSeedPhrase = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Check setup state
      const setupState = await SecureStore.getItemAsync("walletSetupState");
      console.log("Current setup state:", setupState);
      
      if (setupState !== SETUP_STEPS.PASSWORD_CREATED) {
        throw new Error("Please complete password setup first");
      }

      // Get temp user ID
      const tempUserId = await SecureStore.getItemAsync('tempUserId');
      if (!tempUserId) {
        throw new Error("No temporary user ID found");
      }

      // Try to resolve temp user ID in the background without awaiting
      resolveTempUserId(tempUserId)
        .then(realUserId => {
          if (realUserId && realUserId !== tempUserId) {
            console.log("Successfully resolved user ID:", realUserId);
            // Update the stored ID in the background
            SecureStore.setItemAsync('userId', realUserId)
              .catch(error => console.error("Error updating userId:", error));
          }
        })
        .catch(error => {
          // Just log the error but don't block the flow
          console.warn("Failed to resolve user ID:", error);
        });
      
      // Generate seed phrase using ethers
      const wallet = ethers.Wallet.createRandom();
      if (!wallet.mnemonic?.phrase) {
        throw new Error("Failed to generate seed phrase");
      }
      const words = wallet.mnemonic.phrase.split(" ");
      setSeedPhrase(words);
      console.log("Generated seed phrase with", words.length, "words");

      // Store wallet data securely
      await SecureStore.setItemAsync(config.wallet.classic.storageKeys.privateKey, wallet.privateKey);
      await SecureStore.setItemAsync(config.wallet.classic.storageKeys.seedPhrase, wallet.mnemonic.phrase);
      await SecureStore.setItemAsync(config.wallet.classic.storageKeys.addresses, wallet.address);
      console.log("Stored wallet data securely");

      // Store the seed phrase temporarily without encryption first (for confirmation step)
      await SecureStore.setItemAsync("tempSeedPhrase", words.join(" "));
      console.log("Stored unencrypted seed phrase temporarily");
      
      // Create wallet in database
      await createWallet({
        public_address: wallet.address,
        temp_user_id: tempUserId,
        name: 'My Wallet',
        chain_name: 'ethereum'
      });
      console.log("Created wallet in database");
      
      // Update setup state
      await SecureStore.setItemAsync("walletSetupState", SETUP_STEPS.SEED_PHRASE_GENERATED);
      console.log("Updated setup state to SEED_PHRASE_GENERATED");

    } catch (error) {
      console.error("Error generating seed phrase:", error);
      setError(error instanceof Error ? error.message : "Failed to generate seed phrase. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async (): Promise<void> => {
    try {
      // Navigate directly to confirmation
      router.push("/confirm-seed-phrase");
    } catch (error) {
      console.error("Error proceeding to confirmation:", error);
      setError("Failed to proceed. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <OnboardingLayout
        progress={0.5}
        title="Creating Your Wallet"
        subtitle="Please wait while we securely generate your wallet"
        icon="wallet"
      >
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Generating your secure recovery phrase...</Text>
          <Text style={styles.loadingSubtext}>This may take a few moments</Text>
        </View>
      </OnboardingLayout>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={['#0A1B3F', '#1A2F6C']}
        style={styles.errorContainer}
      >
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={generateSeedPhrase}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <OnboardingLayout
      progress={0.5}
      title="Secret Recovery Phrase"
      subtitle="Write down these 12 words in order and store them securely"
      icon="key"
    >
      <ScrollView style={styles.scrollContent}>
        {/* Warning Message */}
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={20} color="#facc15" />
          <Text style={styles.warningText}>
            Never share your recovery phrase. Anyone with these words can access your wallet.
          </Text>
        </View>

        {/* Seed Phrase Grid */}
        <View style={[styles.seedContainer, !revealed && styles.hiddenSeed]}>
          <View style={styles.seedGrid}>
            {seedPhrase.map((word, index) => (
              <View key={index} style={styles.seedWordBox}>
                <Text style={styles.seedIndex}>#{index + 1}</Text>
                <Text style={styles.seedWord}>{word}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Show/Continue Button */}
        {!revealed ? (
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setRevealed(true)}
          >
            <Ionicons name="eye-outline" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Show Recovery Phrase</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.securityBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#4ade80" />
              <Text style={styles.securityText}>
                Make sure no one is watching your screen
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.button}
              onPress={handleContinue}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  loadingSubtext: {
    color: COLORS.primary,
    fontSize: 14,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "500",
  },
  scrollContent: {
    flex: 1,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(250, 204, 21, 0.1)",
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.xl,
    gap: SPACING.xs,
  },
  warningText: {
    color: "#facc15",
    fontSize: 14,
    flex: 1,
  },
  seedContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  hiddenSeed: {
    display: 'none',
  },
  seedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  seedWordBox: {
    width: '30%',
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  seedIndex: {
    color: COLORS.primary,
    fontSize: 12,
    marginBottom: 2,
  },
  seedWord: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "500",
  },
  securityBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  securityText: {
    color: "#4ade80",
    fontSize: 14,
    flex: 1,
  },
  button: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  buttonIcon: {
    marginRight: SPACING.xs,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "500",
  },
}); 