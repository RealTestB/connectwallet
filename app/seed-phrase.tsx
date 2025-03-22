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
import { resolveTempUserId } from "../api/supabaseApi";

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

      // Try to resolve temp user ID in the background without awaiting
      const tempUserId = await SecureStore.getItemAsync('tempUserId');
      if (tempUserId) {
        // Don't await this - let it run in the background
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
      }
      
      // Generate seed phrase using ethers
      const wallet = ethers.Wallet.createRandom();
      if (!wallet.mnemonic?.phrase) {
        throw new Error("Failed to generate seed phrase");
      }
      const words = wallet.mnemonic.phrase.split(" ");
      setSeedPhrase(words);
      console.log("Generated seed phrase with", words.length, "words");

      // Store the seed phrase temporarily without encryption first
      await SecureStore.setItemAsync("tempSeedPhrase", words.join(" "));
      console.log("Stored unencrypted seed phrase temporarily");
      
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Generating your wallet...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={generateSeedPhrase}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        {/* Back Button & Progress Dots */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#6A9EFF" />
          </TouchableOpacity>
          <View style={styles.progressDots}>
            {[1, 2, 3, 4, 5].map((step) => (
              <View key={step} style={[styles.dot, step === 2 && styles.activeDot]} />
            ))}
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollContent}>
          {/* Title & Instructions */}
          <Text style={styles.title}>Secret Recovery Phrase</Text>
          <Text style={styles.subtitle}>
            Write down these 12 words in order and store them securely.
          </Text>

          {/* Warning Message */}
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              <Text style={styles.warningIcon}>⚠</Text>
              {" Never share your recovery phrase. Anyone with these words can access your wallet."}
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
              style={styles.showButton} 
              onPress={() => setRevealed(true)}
            >
              <Text style={styles.buttonText}>
                <Text>👁️ </Text>
                <Text>Show Recovery Phrase</Text>
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.securityBox}>
                <Text style={styles.securityText}>
                  <Text>🛡️ </Text>
                  <Text>Make sure no one is watching your screen.</Text>
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.continueButton]}
                onPress={handleContinue}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
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
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A1B3F",
  },
  loadingText: {
    color: "white",
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A1B3F",
    padding: 20,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  progressDots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(106, 158, 255, 0.3)",
  },
  activeDot: {
    backgroundColor: "#6A9EFF",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#93c5fd",
    textAlign: "center",
    marginBottom: 24,
  },
  warningBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    color: "#ef4444",
    fontSize: 14,
    textAlign: "center",
  },
  warningIcon: {
    fontSize: 16,
  },
  seedContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  hiddenSeed: {
    opacity: 0.2,
  },
  seedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  seedWordBox: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  seedIndex: {
    color: "#93c5fd",
    fontSize: 12,
    marginBottom: 4,
  },
  seedWord: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  showButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  securityBox: {
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.2)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  securityText: {
    color: "#eab308",
    fontSize: 14,
    textAlign: "center",
  },
  continueButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
}); 