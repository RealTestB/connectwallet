import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { sharedStyles, COLORS, SPACING, FONTS } from "../styles/shared";
import { useWallet } from "../contexts/WalletProvider";
import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "../constants/storageKeys";

export default function WalletCreatedScreen(): JSX.Element {
  const router = useRouter();
  const { account, isLoading, error } = useWallet();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Cleanup function
    return () => {
      setIsNavigating(false);
    };
  }, []);

  const handleStartUsingWallet = async (): Promise<void> => {
    try {
      setIsNavigating(true);
      
      // Ensure we have an account
      if (!account) {
        throw new Error("No wallet account found");
      }

      // Store authentication state
      await SecureStore.setItemAsync(STORAGE_KEYS.IS_AUTHENTICATED, "true");

      // Navigate to portfolio
      router.replace("/portfolio");
    } catch (error) {
      console.error("Error starting wallet:", error);
      // Handle error appropriately
    } finally {
      setIsNavigating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[sharedStyles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Setting up your wallet...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[sharedStyles.container, styles.errorContainer]}>
        <Ionicons name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4, 5].map((step) => (
          <View key={step} style={[styles.dot, step === 5 && styles.activeDot]} />
        ))}
      </View>

      {/* Success Icon */}
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
      </View>

      {/* Title & Subtitle */}
      <Text style={[FONTS.h1, styles.title]}>Wallet Created Successfully</Text>
      <Text style={[FONTS.body, styles.subtitle]}>
        Your wallet is ready! Make sure to store your recovery phrase securely.
      </Text>

      {/* Start Using Wallet Button */}
      <TouchableOpacity
        style={[
          sharedStyles.button,
          isNavigating && { opacity: 0.7 }
        ]}
        onPress={handleStartUsingWallet}
        disabled={isNavigating}
      >
        {isNavigating ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={sharedStyles.buttonText}>Start Using Wallet</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.md,
  },
  loadingText: {
    ...FONTS.body,
    color: COLORS.white,
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.lg,
    padding: SPACING.xl,
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.error,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  retryButtonText: {
    ...FONTS.body,
    color: COLORS.white,
    fontWeight: "600",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: SPACING.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: `${COLORS.primary}33`,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
  },
  successIconContainer: {
    width: 96,
    height: 96,
    backgroundColor: `${COLORS.success}33`,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  title: {
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  subtitle: {
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
}); 