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
  'create-password-import',
  'import-seed-phrase',
  'import-private-key',
  'import-success'
];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasWallet } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isInSetup, setIsInSetup] = useState(false);
  const currentRoute = segments[0] || '';

  // Only check setup state for setup-related routes
  useEffect(() => {
    const checkSetupState = async () => {
      // Only check setup state if we're on a setup route
      if (!setupRoutes.includes(currentRoute)) {
        setIsInSetup(false);
        return;
      }

      try {
        const setupState = await SecureStore.getItemAsync(STORAGE_KEYS.SETUP_STATE);
        const isStillInSetup = setupState !== null && setupState !== STORAGE_KEYS.SETUP_STEPS.COMPLETE;
        setIsInSetup(isStillInSetup);
      } catch (error) {
        console.error('[ProtectedRoute] Error checking setup state:', error);
        setIsInSetup(false);
      }
    };

    checkSetupState();
  }, [currentRoute]);

  useEffect(() => {
    const inPublicGroup = publicRoutes.includes(currentRoute);
    const inSetupGroup = setupRoutes.includes(currentRoute);

    // If no wallet and not in setup/public routes, redirect to welcome
    if (!hasWallet && !inPublicGroup && !inSetupGroup) {
      router.replace('/welcome');
      return;
    }

    // If has wallet but not authenticated and not in public routes, redirect to signin
    if (hasWallet && !isAuthenticated && !inPublicGroup) {
      router.replace('/signin');
      return;
    }

    // If has wallet and authenticated, redirect to portfolio if trying to access setup or public routes
    if (hasWallet && isAuthenticated && (inSetupGroup || currentRoute === 'signin')) {
      router.replace('/portfolio');
      return;
    }
  }, [segments, isAuthenticated, hasWallet, isInSetup]);

  return <>{children}</>;
} 