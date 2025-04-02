import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';
import config from '../api/config';

// Define types for our settings
interface Settings {
  darkMode: boolean;
  language: string;
  currency: string;
  lastUsedNetwork: string;
}

type SettingsContextType = {
  settings: Settings;
  updateSetting: (key: string, value: any) => Promise<void>;
  saveLastUsedNetwork: (network: string) => Promise<void>;
  getLastUsedNetwork: () => Promise<string>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Helper function to make Supabase requests
const makeSupabaseRequest = (url: string, method: string, body?: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 30000; // 30 second timeout

    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState !== 4) return;

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const responseText = xhr.status === 201 && !xhr.responseText ? '[]' : xhr.responseText;
          const data = responseText ? JSON.parse(responseText) : null;
          resolve(data);
        } catch (error) {
          console.error('Failed to parse response:', error);
          reject(new Error('Failed to parse response'));
        }
      } else {
        let errorMessage = `Request failed with status ${xhr.status}`;
        try {
          if (xhr.responseText) {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } catch (e) {
          // Ignore JSON parse error
        }
        reject(new Error(errorMessage));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network request failed'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Request timed out'));
    });

    xhr.open(method, `${config.supabase.url}${url}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('apikey', config.supabase.serviceRoleKey);
    xhr.setRequestHeader('Prefer', 'return=representation');

    xhr.send(body ? JSON.stringify(body) : null);
  });
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    darkMode: true,
    language: "en",
    currency: "USD",
    lastUsedNetwork: "ethereum",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  // Load settings from SecureStore and database
  const loadSettings = async () => {
    try {
      // Get user ID from SecureStore
      const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
      if (!userId) {
        console.log('[Settings] No user ID found - normal for initial onboarding');
        return;
      }

      // Load settings from SecureStore
      const darkMode = (await SecureStore.getItemAsync(STORAGE_KEYS.SETTINGS.DARK_MODE)) === "true";
      const language = await SecureStore.getItemAsync(STORAGE_KEYS.SETTINGS.LANGUAGE) || "en";
      const currency = await SecureStore.getItemAsync(STORAGE_KEYS.SETTINGS.CURRENCY) || "USD";
      const lastUsedNetwork = await SecureStore.getItemAsync(STORAGE_KEYS.SETTINGS.LAST_USED_NETWORK) || "ethereum";

      // Load settings from database
      const userPreferences = await makeSupabaseRequest(
        `/rest/v1/user_preferences?select=*&user_id=eq.${userId}`,
        'GET'
      );

      // Use database values if available, otherwise use SecureStore values
      setSettings({
        darkMode: userPreferences?.[0]?.theme === 'dark' || darkMode,
        language: userPreferences?.[0]?.language || language,
        currency: userPreferences?.[0]?.selected_currency || currency,
        lastUsedNetwork: lastUsedNetwork,
      });
    } catch (error) {
      console.error('[Settings] Error loading settings:', error);
    }
  };

  // Update settings and store them securely
  const updateSetting = async (key: string, value: any) => {
    try {
      // Get user ID from SecureStore
      const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
      if (!userId) {
        console.error('[Settings] No user ID found');
        return;
      }

      // Update SecureStore
      await SecureStore.setItemAsync(key, value.toString());

      // Update database based on setting type
      const updates: any = {
        updated_at: new Date().toISOString()
      };

      if (key === STORAGE_KEYS.SETTINGS.DARK_MODE) {
        updates.theme = value ? 'dark' : 'light';
      } else if (key === STORAGE_KEYS.SETTINGS.LANGUAGE) {
        updates.language = value;
      } else if (key === STORAGE_KEYS.SETTINGS.CURRENCY) {
        updates.selected_currency = value;
      }

      // Update preferences using PATCH
      await makeSupabaseRequest(
        `/rest/v1/user_preferences?user_id=eq.${userId}`,
        'PATCH',
        updates
      );

      // If no row exists, create one
      const checkExisting = await makeSupabaseRequest(
        `/rest/v1/user_preferences?user_id=eq.${userId}`,
        'GET'
      );

      if (!checkExisting || checkExisting.length === 0) {
        await makeSupabaseRequest(
          '/rest/v1/user_preferences',
          'POST',
          {
            ...updates,
            user_id: userId
          }
        );
      }

      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('[Settings] Error updating setting:', error);
    }
  };

  // Save last-used network separately
  const saveLastUsedNetwork = async (network: string) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.SETTINGS.LAST_USED_NETWORK, network);
      setSettings(prev => ({ ...prev, lastUsedNetwork: network }));
    } catch (error) {
      console.error('Error updating network:', error);
    }
  };

  // Get last-used network
  const getLastUsedNetwork = async () => {
    try {
      const network = await SecureStore.getItemAsync(STORAGE_KEYS.SETTINGS.LAST_USED_NETWORK);
      return network || 'ethereum';
    } catch (error) {
      console.error('Error getting last used network:', error);
      return 'ethereum';
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      updateSetting, 
      saveLastUsedNetwork, 
      getLastUsedNetwork 
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 