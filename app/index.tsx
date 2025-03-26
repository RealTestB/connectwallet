import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../styles/shared';
import * as SecureStore from 'expo-secure-store';
import config from '../api/config';
import { STORAGE_KEYS } from '../constants/storageKeys';

export default function Index() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeout: NodeJS.Timeout;

    async function checkInitialRoute() {
      try {
        console.log('[Index] Checking wallet status...');
        
        // Check if we have wallet data with a timeout
        const walletDataPromise = SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
        
        // Add a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          timeout = setTimeout(() => {
            reject(new Error('Storage access timed out'));
          }, 5000); // 5 second timeout
        });
        
        // Race the promises
        const walletDataStr = await Promise.race([walletDataPromise, timeoutPromise]);
        
        if (!mounted) return;
        clearTimeout(timeout);

        console.log('[Index] Wallet check complete, has wallet data:', !!walletDataStr);
        
        // Navigate based on wallet status
        timeout = setTimeout(() => {
          if (walletDataStr) {
            router.replace('/signin');
          } else {
            router.replace('/welcome');
          }
        }, 100);
      } catch (error) {
        console.error('[Index] Error checking initial route:', error);
        if (!mounted) return;
        
        // Show error to user
        setError(`${error}`);
        
        // Default to welcome on error
        timeout = setTimeout(() => {
          router.replace('/welcome');
        }, 3000);
      }
    }

    checkInitialRoute();

    return () => {
      mounted = false;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Text style={styles.errorHint}>Redirecting to welcome screen...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    maxWidth: '80%',
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    color: '#757575',
    textAlign: 'center',
    fontSize: 12,
  },
});