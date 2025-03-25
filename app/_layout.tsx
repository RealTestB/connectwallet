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

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[Layout] Starting app initialization...');
        
        // Initialize providers and services
        await Promise.all([
          // Add any async initialization here
          new Promise(resolve => setTimeout(resolve, 100)) // Small delay to ensure proper mounting
        ]);

        setIsInitialized(true);
        setIsReady(true);
        console.log('[Layout] App initialization complete');
      } catch (error) {
        console.error('[Layout] Error during initialization:', error);
      }
    };

    initializeApp();
  }, []);

  if (!isReady || !isInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1A2F6C' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
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


