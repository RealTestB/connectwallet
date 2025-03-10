import React from "react";
import { Stack } from "expo-router";
import BottomNav from "../components/ui/BottomNav"; // ✅ Import your custom BottomNav
import { useEffect, useState } from "react";
import { usePathname } from "expo-router"; // ✅ Detect which page is currently active

export default function RootLayout() {
  const pathname = usePathname(); // ✅ Get the current route
  const [showBottomNav, setShowBottomNav] = useState(true);

  useEffect(() => {
    // ✅ Define which screens should NOT show BottomNav
    const excludedScreens = [
      "ImportWalletScreen",
      "ImportPrivateKeyScreen",
      "ImportSeedPhraseScreen",
      "ConfirmSeedPhraseScreen",
      "SecureWalletScreen",
      "WalletCreatedScreen",
      "ImportWalletSuccessScreen",
      "Import_CreatePasswordScreen",
      "CreatePasswordScreen",
      "SeedPhraseScreen",
      "ImportSuccessScreen",
      "SignInScreen",
    ];

    // ✅ Hide BottomNav for excluded screens
    setShowBottomNav(!excludedScreens.includes(pathname));
  }, [pathname]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="portfolio" />
        <Stack.Screen name="pay" />
        <Stack.Screen name="receive" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="nft" />
        <Stack.Screen name="NFTDetailsScreen" />
        <Stack.Screen name="SwapScreen" />
        <Stack.Screen name="TransactionHistoryScreen" />
        <Stack.Screen name="TransactionDetailsScreen" />
        <Stack.Screen name="ImportWalletScreen" />
        <Stack.Screen name="ImportPrivateKeyScreen" />
        <Stack.Screen name="ImportSeedPhraseScreen" />
        <Stack.Screen name="ConfirmSeedPhraseScreen" />
        <Stack.Screen name="SecureWalletScreen" />
        <Stack.Screen name="WalletCreatedScreen" />
        <Stack.Screen name="ImportWalletSuccessScreen" />
        <Stack.Screen name="Import_CreatePasswordScreen" />
        <Stack.Screen name="CreatePasswordScreen" />
        <Stack.Screen name="SeedPhraseScreen" />
        <Stack.Screen name="ImportSuccessScreen" />
        <Stack.Screen name="SignInScreen" />
      </Stack>

      {/* ✅ Only show BottomNav on selected screens */}
      {showBottomNav && <BottomNav />}
    </>
  );
}



