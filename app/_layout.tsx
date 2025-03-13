import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { ProtectedRoute } from "../components/ProtectedRoute";
import BottomNav from "../components/ui/BottomNav";
import { usePathname, useRouter } from "expo-router";
import { View } from "react-native";
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [navigationReady, setNavigationReady] = useState(false);
  const [showBottomNav, setShowBottomNav] = useState(false); // Start with false by default
  const [appIsReady, setAppIsReady] = useState(false);
  const router = useRouter();

  // Handle initial app setup
  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate loading
      } catch (e) {
        console.warn('[Layout] Preparation error:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Handle splash screen
  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(e => {
        console.warn('[Layout] Error hiding splash screen:', e);
      });
    }
  }, [appIsReady]);

  // Handle navigation state
  useEffect(() => {
    let mounted = true;

    const initializeNavigation = async () => {
      try {
        const pathname = usePathname();
        console.log('[Layout] Initializing navigation with pathname:', pathname);
        console.log('[Layout] Router state:', router);

        if (!pathname || !router) {
          console.log('[Layout] Navigation not ready yet');
          return;
        }

        const excludedScreens = [
          "import-wallet",
          "import-private-key",
          "import-seed-phrase",
          "confirm-seed-phrase",
          "secure-wallet",
          "wallet-created",
          "import-wallet-success",
          "create-password",
          "seed-phrase",
          "import-success",
          "signin",
          "welcome"
        ];

        const routeName = pathname.startsWith('/') ? pathname.slice(1) : pathname;
        
        if (mounted) {
          setShowBottomNav(!excludedScreens.includes(routeName));
          setNavigationReady(true);
          console.log('[Layout] Navigation ready, bottom nav:', !excludedScreens.includes(routeName));
        }
      } catch (error) {
        console.error('[Layout] Error processing navigation:', error);
        if (mounted) {
          setShowBottomNav(false);
          setNavigationReady(true); // Still set navigation as ready to not block rendering
        }
      }
    };

    initializeNavigation();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Don't render anything until both app and navigation are ready
  if (!appIsReady || !navigationReady) {
    console.log('[Layout] Waiting for initialization...', { appIsReady, navigationReady });
    return null;
  }

  return (
    <AuthProvider>
      <SettingsProvider>
        <ProtectedRoute>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="signin" />
            <Stack.Screen name="create-password" />
            <Stack.Screen name="seed-phrase" />
            <Stack.Screen name="confirm-seed-phrase" />
            <Stack.Screen name="secure-wallet" />
            <Stack.Screen name="wallet-created" />
            <Stack.Screen name="import-wallet" />
            <Stack.Screen name="import-seed-phrase" />
            <Stack.Screen name="import-private-key" />
            <Stack.Screen name="import-success" />
            <Stack.Screen name="import-wallet-success" />
            <Stack.Screen name="portfolio" />
            <Stack.Screen name="nft" />
            <Stack.Screen name="nft-details" />
            <Stack.Screen name="pay" />
            <Stack.Screen name="receive" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="swap" />
            <Stack.Screen name="transaction-details" />
            <Stack.Screen name="transaction-history" />
          </Stack>
          {showBottomNav && <BottomNav />}
        </ProtectedRoute>
      </SettingsProvider>
    </AuthProvider>
  );
}


