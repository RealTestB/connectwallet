import React, { useEffect } from 'react';
import { useSegments, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';

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

  useEffect(() => {
    console.log("[ProtectedRoute] Route check triggered with:", {
      segments,
      isAuthenticated,
      hasWallet,
      currentPath: segments.join('/')
    });

    const currentRoute = segments[0] || '';
    const inPublicGroup = publicRoutes.includes(currentRoute);
    const inSetupGroup = setupRoutes.includes(currentRoute);

    console.log("[ProtectedRoute] Route analysis:", {
      currentRoute,
      inPublicGroup,
      inSetupGroup
    });

    // If no wallet, redirect to welcome (except for public routes)
    if (!hasWallet && !inPublicGroup) {
      console.log("[ProtectedRoute] No wallet found, redirecting to welcome");
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
  }, [segments, isAuthenticated, hasWallet]);

  return <>{children}</>;
} 