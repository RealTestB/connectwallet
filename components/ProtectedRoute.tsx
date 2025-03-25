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

    // Check if we have a password hash stored
    const checkPasswordHash = async () => {
      try {
        const passwordHash = await SecureStore.getItemAsync('passwordHash');
        if (!passwordHash && hasWallet) {
          console.log('[ProtectedRoute] No password hash found, redirecting to create-password');
          router.replace('/create-password');
          return true;
        }
        return false;
      } catch (error) {
        console.error('[ProtectedRoute] Error checking password hash:', error);
        return false;
      }
    };

    // Handle navigation based on auth state
    const handleNavigation = async () => {
      const hasNoPasswordHash = await checkPasswordHash();
      if (hasNoPasswordHash) return;

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
    };

    handleNavigation();
  }, [isAuthenticated, hasWallet, segments]);

  return <>{children}</>;
} 