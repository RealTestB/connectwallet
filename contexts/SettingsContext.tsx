import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';

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

  // 🔹 Load settings from SecureStore
  const loadSettings = async () => {
    try {
      const darkMode = (await SecureStore.getItemAsync(STORAGE_KEYS.SETTINGS.DARK_MODE)) === "true";
      const language = await SecureStore.getItemAsync(STORAGE_KEYS.SETTINGS.LANGUAGE) || "en";
      const currency = await SecureStore.getItemAsync(STORAGE_KEYS.SETTINGS.CURRENCY) || "USD";
      setSettings({ darkMode, language, currency, lastUsedNetwork: "ethereum" });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // 🔹 Update settings and store them securely
  const updateSetting = async (key: string, value: any) => {
    try {
      await SecureStore.setItemAsync(key, value.toString());
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  // 🔹 Save last-used network separately
  const saveLastUsedNetwork = async (network: string) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.SETTINGS.LAST_USED_NETWORK, network);
      setSettings(prev => ({ ...prev, lastUsedNetwork: network }));
    } catch (error) {
      console.error('Error updating network:', error);
    }
  };

  // 🔹 Get last-used network
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