import React, { useEffect, useState } from 'react';
import { useSegments, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';

// Define public routes that don't require authentication
const publicRoutes = ['welcome', 'signin', 'create-password'];
const setupRoutes = [
  'seed-phrase',
  'confirm-seed-phrase',
  'secure-wallet',
  'wallet-created',
  'import-wallet',
  'import-seed-phrase',
  'import-private-key',
  'import-success'
];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasWallet } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isInSetup, setIsInSetup] = useState(false);

  useEffect(() => {
    const checkSetupState = async () => {
      try {
        const setupState = await SecureStore.getItemAsync(STORAGE_KEYS.SETUP_STATE);
        setIsInSetup(setupState !== STORAGE_KEYS.SETUP_STEPS.COMPLETE);
      } catch (error) {
        console.error('[ProtectedRoute] Error checking setup state:', error);
        setIsInSetup(false);
      }
    };

    checkSetupState();
  }, []);

  useEffect(() => {
    console.log("[ProtectedRoute] Route check triggered with:", {
      segments,
      isAuthenticated,
      hasWallet,
      isInSetup,
      currentPath: segments.join('/')
    });

    const currentRoute = segments[0] || '';
    const inPublicGroup = publicRoutes.includes(currentRoute);
    const inSetupGroup = setupRoutes.includes(currentRoute);

    console.log("[ProtectedRoute] Route analysis:", {
      currentRoute,
      inPublicGroup,
      inSetupGroup,
      isInSetup
    });

    // If in setup flow, allow access to setup routes
    if (isInSetup && inSetupGroup) {
      console.log("[ProtectedRoute] In setup flow, allowing access to setup route");
      return;
    }

    // If no wallet and not in setup, redirect to welcome (except for public routes)
    if (!hasWallet && !inPublicGroup && !isInSetup) {
      console.log("[ProtectedRoute] No wallet found and not in setup, redirecting to welcome");
      router.replace('/welcome');
      return;
    }

    // If has wallet but not authenticated, redirect to signin
    // (except for public routes which includes signin)
    if (hasWallet && !isAuthenticated && !inPublicGroup) {
      console.log("[ProtectedRoute] Has wallet but not authenticated, redirecting to signin");
      router.replace('/signin');
      return;
    }

    // If has wallet and authenticated, redirect to portfolio if trying to access setup or public routes
    if (hasWallet && isAuthenticated && (inSetupGroup || currentRoute === 'signin')) {
      console.log("[ProtectedRoute] Authenticated with wallet, redirecting to portfolio");
      router.replace('/portfolio');
      return;
    }

    console.log("[ProtectedRoute] Access granted to current route");
  }, [segments, isAuthenticated, hasWallet, isInSetup]);

  return <>{children}</>;
} 