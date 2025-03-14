import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const SETUP_STEPS = {
  PASSWORD_CREATED: 'password_created',
  SEED_PHRASE_GENERATED: 'seed_phrase_generated',
  SEED_PHRASE_CONFIRMED: 'seed_phrase_confirmed',
  SETUP_COMPLETED: 'setup_completed'
};

const PUBLIC_PATHS = ['welcome', 'signin', ''];
const SETUP_PATHS = ['create-password', 'seed-phrase', 'confirm-seed-phrase'];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname?.replace(/^\//, '') || '';

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Add a small delay to ensure root layout is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!mounted) return;

        const setupState = await SecureStore.getItemAsync('walletSetupState');
        const hasPassword = await SecureStore.getItemAsync('passwordHash');
        
        // Always allow public paths
        if (PUBLIC_PATHS.includes(currentPath)) {
          setIsLoading(false);
          return;
        }

        // If we're on a setup path, allow it
        if (SETUP_PATHS.includes(currentPath)) {
          setIsLoading(false);
          return;
        }

        // If we're on a non-public path and have no password
        if (!hasPassword && !PUBLIC_PATHS.includes(currentPath)) {
          if (currentPath !== 'welcome') {
            await router.replace('/welcome');
          }
          return;
        }

        // Handle incomplete setup
        if (setupState !== SETUP_STEPS.SETUP_COMPLETED) {
          // Navigate to appropriate setup step only if we're not already there
          let targetPath = '/create-password';
          if (setupState === SETUP_STEPS.PASSWORD_CREATED) {
            targetPath = '/seed-phrase';
          } else if (setupState === SETUP_STEPS.SEED_PHRASE_GENERATED) {
            targetPath = '/confirm-seed-phrase';
          }

          if (currentPath !== targetPath.replace('/', '')) {
            await router.replace(targetPath);
          }
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        if (currentPath !== 'welcome') {
          await router.replace('/welcome');
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  if (isLoading) {
    return null;
  }

  return <>{children}</>;
} 