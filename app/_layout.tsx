import '../src/crypto-polyfill';
import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { WalletProvider } from "../contexts/WalletProvider";
import { WalletAccountsProvider, useWalletAccounts } from "../contexts/WalletAccountsContext";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { View, ActivityIndicator, Text, StyleSheet, Alert, Platform, TouchableOpacity } from "react-native";
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import config from '../api/config';
import { COLORS } from '../styles/shared';
import { TransactionProvider } from '../contexts/TransactionContext';
import { clearSupabaseStorage } from '../lib/supabase';
import { ChainProvider } from '../contexts/ChainContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'index',
};

// Wrapper component to handle initialization
function InitializationWrapper({ children }: { children: React.ReactNode }) {
  const { loadAccounts, isLoading: accountsLoading, error: accountsError } = useWalletAccounts();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('[InitializationWrapper] Starting wallet initialization...', {
          authLoading,
          accountsLoading,
          isAuthenticated,
          isInitialized
        });

        // Only initialize if auth is ready and we haven't initialized yet
        if (!authLoading && !isInitialized) {
          if (isAuthenticated) {
            await loadAccounts();
          }
          console.log('[InitializationWrapper] Wallet initialization complete');
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('[InitializationWrapper] Error during wallet initialization:', err);
        setIsInitialized(true);
      }
    };

    initialize();
  }, [authLoading, isAuthenticated, loadAccounts, isInitialized]);

  // Add debug logging
  useEffect(() => {
    console.log('[InitializationWrapper] State:', {
      isInitialized,
      accountsLoading,
      authLoading,
      hasError: !!accountsError,
      isAuthenticated
    });
  }, [isInitialized, accountsLoading, authLoading, accountsError, isAuthenticated]);

  // If not authenticated, render children immediately
  if (!isAuthenticated) {
    console.log('[InitializationWrapper] Not authenticated, rendering children');
    return <>{children}</>;
  }

  // Show error state only if authenticated and there's an error
  if (isAuthenticated && accountsError) {
    console.log('[InitializationWrapper] Rendering error state:', accountsError);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to initialize wallet data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadAccounts()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading state only if authenticated and still loading
  if (isAuthenticated && (!isInitialized || authLoading || accountsLoading)) {
    console.log('[InitializationWrapper] Rendering loading state');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  console.log('[InitializationWrapper] Rendering children');
  return <>{children}</>;
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[Layout] Starting app initialization...');
        
        // Clear Supabase storage first
        await clearSupabaseStorage();
        
        // Initialize providers and services
        await Promise.all([
          // Add any async initialization here
          new Promise(resolve => setTimeout(resolve, 100)) // Small delay to ensure proper mounting
        ]);

        console.log('[Layout] App initialization complete');
        setIsInitialized(true);
        setIsReady(true);
      } catch (error) {
        console.error('[Layout] Error during initialization:', error);
        // Even if there's an error, we should still set initialized states
        // to prevent infinite loading
        setIsInitialized(true);
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!isReady || !isInitialized) {
    console.log('[Layout] Rendering initial loading state');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  console.log('[Layout] Rendering providers and router');
  return (
    <ChainProvider>
      <TransactionProvider>
        <AuthProvider>
          <SettingsProvider>
            <WalletProvider>
              <WalletAccountsProvider>
                <InitializationWrapper>
                  <ProtectedRoute routeType="public">
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
                      <Stack.Screen 
                        name="create-password-import"
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
                        name="creating-wallet"
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
                      <Stack.Screen 
                        name="manage-accounts"
                        options={{
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen 
                        name="nft"
                        options={{
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen 
                        name="nft-details"
                        options={{
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen 
                        name="send-nft"
                        options={{
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen 
                        name="transaction-history"
                        options={{
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen 
                        name="transaction-details"
                        options={{
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen 
                        name="confirm-transaction"
                        options={{
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen 
                        name="pay"
                        options={{
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen 
                        name="scan-qr"
                        options={{
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen 
                        name="swap"
                        options={{
                          headerShown: false,
                        }}
                      />
                    </Stack>
                  </ProtectedRoute>
                </InitializationWrapper>
              </WalletAccountsProvider>
            </WalletProvider>
          </SettingsProvider>
        </AuthProvider>
      </TransactionProvider>
    </ChainProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
  },
});


