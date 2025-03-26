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

    // Allow access to public routes
    if (inPublicGroup) {
      console.log("[ProtectedRoute] Allowing access to public route");
      return;
    }

    // Allow access to setup routes if not authenticated
    if (inSetupGroup && !isAuthenticated) {
      console.log("[ProtectedRoute] Allowing access to setup route while not authenticated");
      return;
    }

    // Redirect to welcome if no wallet
    if (!hasWallet && !inPublicGroup) {
      console.log("[ProtectedRoute] No wallet found, redirecting to welcome");
      console.log("[ProtectedRoute] Current auth state:", {
        isAuthenticated,
        hasWallet,
        currentPath: segments.join('/')
      });
      router.replace('/welcome');
      return;
    }

    // Redirect to portfolio if authenticated and trying to access setup routes
    if (isAuthenticated && inSetupGroup) {
      console.log("[ProtectedRoute] Authenticated user trying to access setup route, redirecting to portfolio");
      router.replace('/portfolio');
      return;
    }

    // If not authenticated and trying to access protected routes, redirect to welcome
    if (!isAuthenticated && !inPublicGroup && !inSetupGroup) {
      console.log("[ProtectedRoute] Unauthenticated user trying to access protected route, redirecting to welcome");
      router.replace('/welcome');
      return;
    }

    console.log("[ProtectedRoute] Access granted to protected route");
  }, [segments, isAuthenticated, hasWallet]);

  return <>{children}</>;
} 