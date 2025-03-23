import '../src/crypto-polyfill';
import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { WalletProvider } from "../contexts/WalletProvider";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { View, ActivityIndicator } from "react-native";
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
  const [appIsReady, setAppIsReady] = useState(false);

  // Handle initial app setup
  useEffect(() => {
    async function prepare() {
      try {
        // Add a shorter timeout to prevent long black screen
        await new Promise(resolve => setTimeout(resolve, 500));

        // Hide splash screen once everything is ready
        await SplashScreen.hideAsync();
        setAppIsReady(true);
      } catch (e) {
        console.warn('[Layout] Preparation error:', e);
        setAppIsReady(true); // Still set app as ready to show something
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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


