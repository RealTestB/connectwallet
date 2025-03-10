import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { ProtectedRoute } from "../components/ProtectedRoute";
import BottomNav from "../components/ui/BottomNav";
import { usePathname } from "expo-router";
import { useEffect, useState } from "react";

// Required crypto polyfills
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

export default function RootLayout() {
  const pathname = usePathname();
  const [showBottomNav, setShowBottomNav] = useState(true);

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



