import React, { useEffect } from 'react';
import { useSegments, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

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

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, hasWallet } = useAuth();

  useEffect(() => {
    const inPublicGroup = segments[0] === '(public)';
    const inSetupGroup = segments[0] === '(setup)';
    const path = segments.join('/');
    const isPublicPath = publicRoutes.some(route => path.startsWith(route));
    const isSetupPath = setupRoutes.some(route => path.startsWith(route));

    console.log('[ProtectedRoute] Checking route access:', {
      hasWallet,
      inPublicGroup,
      inSetupGroup,
      isAuthenticated,
      isPublicPath,
      isSetupPath,
      segments
    });

    // Handle navigation based on auth state
    if (!hasWallet && !isPublicPath && !isSetupPath && segments.length > 0) {
      console.log('[ProtectedRoute] No wallet, redirecting to welcome');
      router.replace('/welcome');
      return;
    }

    if (hasWallet && !isAuthenticated && !isPublicPath && segments.length > 0) {
      console.log('[ProtectedRoute] Not authenticated, redirecting to signin');
      router.replace('/signin');
      return;
    }

    if (hasWallet && isAuthenticated && isPublicPath && segments.length > 0) {
      console.log('[ProtectedRoute] Authenticated, redirecting to portfolio');
      router.replace('/portfolio');
      return;
    }
  }, [isAuthenticated, hasWallet, segments]);

  return <>{children}</>;
} 