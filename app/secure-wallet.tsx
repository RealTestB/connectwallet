import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, sharedStyles } from '../styles/shared';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';
import OnboardingLayout from '../components/ui/OnboardingLayout';

export default function SecureWallet() {
  const router = useRouter();
  const { updateLastActive, checkAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeWallet = async () => {
      try {
        if (!mounted) return;
        setIsLoading(true);
        console.log("[SecureWallet] Initializing wallet...");
        
        // Set authenticated state
        await SecureStore.setItemAsync(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
        
        // Update auth state
        await checkAuth();
        
        // Update last active timestamp
        await updateLastActive();
        
        if (!mounted) return;
        
        // Navigate to portfolio
        router.replace("/portfolio");
      } catch (error) {
        console.error("[SecureWallet] Error initializing wallet:", error);
        if (mounted) {
          setError(error instanceof Error ? error.message : "Failed to initialize wallet");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeWallet();

    return () => {
      mounted = false;
    };
  }, []);

  const handleGoToPortfolio = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Verify authentication
      const isAuthenticated = await SecureStore.getItemAsync(STORAGE_KEYS.IS_AUTHENTICATED);
      if (isAuthenticated !== 'true') {
        setError("Please complete the wallet setup first");
        return;
      }

      // Update auth state and last active
      await checkAuth();
      await updateLastActive();

      // Navigate to portfolio
      router.replace("/portfolio");
    } catch (error) {
      console.error("[SecureWallet] Error navigating to portfolio:", error);
      setError(error instanceof Error ? error.message : "Failed to navigate to portfolio");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingLayout
      progress={1}
      title="Wallet Secured!"
      subtitle="Your wallet has been created and secured. You're ready to start using your wallet!"
      icon="verified"
    >
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        disabled={isLoading}
        onPress={handleGoToPortfolio}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>Go to Portfolio</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </View>
        )}
      </TouchableOpacity>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: `${COLORS.error}20`,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    fontSize: 14,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    width: '100%',
    marginTop: SPACING.xl,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 