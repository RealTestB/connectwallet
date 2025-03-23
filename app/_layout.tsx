import '../src/crypto-polyfill';
import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { WalletProvider } from "../contexts/WalletProvider";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { View, ActivityIndicator, Text, StyleSheet, Alert, Platform, TouchableOpacity } from "react-native";
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import config from '../api/config';
import { COLORS } from '../styles/shared';
import { configureHttpClient } from '../utils/httpClient';
import { testNetwork } from '../utils/networkTest';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Configure global HTTP client with timeouts
configureHttpClient();

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Handle initial app setup
  useEffect(() => {
    async function prepare() {
      try {
        console.log('[Layout] Starting app initialization...');
        
        // Add a shorter timeout to prevent long black screen
        await new Promise(resolve => setTimeout(resolve, 500));

        // Test the network first
        if (Platform.OS !== 'web') {
          console.log('[Layout] Testing network connectivity...');
          const networkTest = await testNetwork();
          if (!networkTest.success) {
            console.warn('[Layout] Network test failed:', networkTest);
            throw new Error('Network connectivity issue. Please check your internet connection.');
          }
          console.log('[Layout] Network test successful!');
        }

        // Hide splash screen once everything is ready
        await SplashScreen.hideAsync();
        setAppIsReady(true);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown initialization error';
        console.warn('[Layout] Preparation error:', errorMessage);
        setError(errorMessage);
        
        // Still set app as ready to show error screen
        setAppIsReady(true);
      }
    }

    prepare();
  }, [isRetrying]);

  const handleRetry = () => {
    setError(null);
    setIsRetrying(true);
    
    // Reset retrying state after a short delay
    setTimeout(() => {
      setIsRetrying(false);
    }, 100);
  };

  if (!appIsReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Initialization Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorHint}>
            This could be due to network connectivity issues or server problems.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <WalletProvider>
        <AuthProvider>
          <SettingsProvider>
            <ProtectedRoute>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  animationDuration: 200,
                }}
              >
                <Stack.Screen 
                  name="index"
                  options={{
                    headerShown: false,
                  }}
                />
                
                {/* Auth Group */}
                <Stack.Screen 
                  name="welcome"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="signin"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="create-password"
                  options={{
                    headerShown: false,
                  }}
                />

                {/* Wallet Setup Group */}
                <Stack.Screen 
                  name="seed-phrase"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="confirm-seed-phrase"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="secure-wallet"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="wallet-created"
                  options={{
                    headerShown: false,
                  }}
                />

                {/* Import Group */}
                <Stack.Screen 
                  name="import-wallet"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="import-seed-phrase"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="import-private-key"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="import-success"
                  options={{
                    headerShown: false,
                  }}
                />

                {/* Main App Group */}
                <Stack.Screen 
                  name="portfolio"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="receive"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="settings"
                  options={{
                    headerShown: false,
                  }}
                />
              </Stack>
            </ProtectedRoute>
          </SettingsProvider>
        </AuthProvider>
      </WalletProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorCard: {
    width: '80%',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF5252',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorHint: {
    fontSize: 14,
    color: '#93c5fd',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});


