import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { ProtectedRoute } from "../components/ProtectedRoute";
import BottomNav from "../components/ui/BottomNav";
import { usePathname } from "expo-router";
import { View } from "react-native";
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const pathname = usePathname();
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        // You can add more async initialization here
        
        // Artificially delay for two seconds to simulate a slow loading
        // Remove this in production
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately
      // If we call this after `setAppIsReady`, then we may see a blank screen
      // while the app is loading its initial state and rendering its first pixels
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  useEffect(() => {
    // Define which screens should NOT show BottomNav
    const excludedScreens = [
      "ImportWalletScreen",
      "ImportPrivateKeyScreen",
      "ImportSeedPhraseScreen",
      "ConfirmSeedPhraseScreen",
      "SecureWalletScreen",
      "WalletCreatedScreen",
      "ImportWalletSuccessScreen",
      "CreatePasswordScreen",
      "SeedPhraseScreen",
      "ImportSuccessScreen",
      "SignInScreen",
      "WelcomeScreen"
    ];

    // Hide BottomNav for excluded screens
    setShowBottomNav(!excludedScreens.includes(pathname));
  }, [pathname]);

  if (!appIsReady) {
    return null;
  }

  return (
    <AuthProvider>
      <SettingsProvider>
        <ProtectedRoute>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="WelcomeScreen" />
            <Stack.Screen name="SignInScreen" />
            <Stack.Screen name="CreatePasswordScreen" />
            <Stack.Screen name="SeedPhraseScreen" />
            <Stack.Screen name="ConfirmSeedPhraseScreen" />
            <Stack.Screen name="SecureWalletScreen" />
            <Stack.Screen name="WalletCreatedScreen" />
            <Stack.Screen name="ImportWalletScreen" />
            <Stack.Screen name="ImportSeedPhraseScreen" />
            <Stack.Screen name="ImportPrivateKeyScreen" />
            <Stack.Screen name="ImportSuccessScreen" />
            <Stack.Screen name="ImportWalletSuccessScreen" />
            <Stack.Screen name="portfolio" />
            <Stack.Screen name="nft" />
            <Stack.Screen name="NFTDetailsScreen" />
            <Stack.Screen name="pay" />
            <Stack.Screen name="receive" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="SwapScreen" />
            <Stack.Screen name="TransactionDetailsScreen" />
            <Stack.Screen name="TransactionHistoryScreen" />
          </Stack>

          {/* Only show BottomNav on selected screens */}
          {showBottomNav && <BottomNav />}
        </ProtectedRoute>
      </SettingsProvider>
    </AuthProvider>
  );
}



