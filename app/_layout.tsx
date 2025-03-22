import '../src/crypto-polyfill';
import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { WalletProvider } from "../contexts/WalletProvider";
import { ProtectedRoute } from "../components/ProtectedRoute";
import BottomNav from "../components/ui/BottomNav";
import { usePathname, useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const [navigationReady, setNavigationReady] = useState(false);
  const [showBottomNav, setShowBottomNav] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Handle initial app setup
  useEffect(() => {
    async function prepare() {
      try {
        // Add a shorter timeout to prevent long black screen
        await new Promise(resolve => setTimeout(resolve, 500));
        const route = pathname?.replace(/^\//, '') || 'index';
        setInitialRoute(route);
        setNavigationReady(true); // Set navigation ready here
        await SplashScreen.hideAsync(); // Hide splash screen immediately after setup
      } catch (e) {
        console.warn('[Layout] Preparation error:', e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  // Handle navigation state
  useEffect(() => {
    if (!appIsReady) return;

    const initializeNavigation = async () => {
      try {
        const excludedScreens = [
          "import-wallet",
          "import-private-key",
          "import-seed-phrase",
          "confirm-seed-phrase",
          "secure-wallet",
          "wallet-created",
          "create-password",
          "seed-phrase",
          "import-success",
          "signin",
          "welcome",
          "index"
        ];

        const routeName = pathname?.replace(/^\//, '') || '';
        const shouldShowNav = !excludedScreens.includes(routeName);
        setShowBottomNav(shouldShowNav);
      } catch (error) {
        console.error('[Layout] Error initializing navigation:', error);
      }
    };

    initializeNavigation();
  }, [appIsReady, pathname]);

  if (!appIsReady || !navigationReady || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A2F6C' }}>
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
                  name="pay"
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
                  name="swap"
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
                  name="transaction-history"
                  options={{
                    headerShown: false,
                  }}
                />
              </Stack>
              {showBottomNav && navigationReady && <BottomNav />}
            </ProtectedRoute>
          </SettingsProvider>
        </AuthProvider>
      </WalletProvider>
    </SafeAreaProvider>
  );
}


