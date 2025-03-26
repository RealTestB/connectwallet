import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, sharedStyles } from '../styles/shared';
import { useAuth } from '../contexts/AuthContext';
import { completeWalletSetup } from '../api/walletApi';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';

export default function SecureWallet() {
  const router = useRouter();
  const { updateLastActive, checkAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSetupState = async () => {
      try {
        setIsLoading(true);
        console.log("[SecureWallet] Checking wallet setup state...");
        
        // Get current setup state
        const setupState = await SecureStore.getItemAsync(STORAGE_KEYS.SETUP_STATE);
        
        if (setupState !== STORAGE_KEYS.SETUP_STEPS.COMPLETE) {
          console.error("[SecureWallet] Setup not complete");
          setError("Wallet setup was not completed properly");
          return;
        }

        // Update auth state
        await checkAuth();
        
        // Wait a moment to ensure auth state is updated
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Navigate to portfolio
        router.replace("/portfolio");

      } catch (error) {
        console.error("[SecureWallet] Error checking setup state:", error);
        setError(error instanceof Error ? error.message : "Failed to verify wallet setup");
      } finally {
        setIsLoading(false);
      }
    };

    checkSetupState();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(10, 27, 63, 0.9)', 'rgba(26, 47, 108, 0.9)']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={64} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Wallet Secured!</Text>
          <Text style={styles.description}>
            Your wallet has been created and secured. You're ready to start using your wallet!
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            disabled={isLoading}
            onPress={() => router.replace("/portfolio")}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Go to Portfolio</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    opacity: 0.8,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    fontSize: 14,
  },
}); 