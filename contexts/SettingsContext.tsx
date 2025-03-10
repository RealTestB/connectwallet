import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

// Define types for our settings
interface Settings {
  darkMode: boolean;
  language: string;
  currency: string;
}

type SettingsContextType = {
  settings: Settings;
  updateSetting: (key: keyof Settings, value: string | boolean) => Promise<void>;
  saveLastUsedNetwork: (network: string) => Promise<void>;
  getLastUsedNetwork: () => Promise<string>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    darkMode: true,
    language: "en",
    currency: "USD",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  // 🔹 Load settings from SecureStore
  const loadSettings = async () => {
    try {
      const darkMode = (await SecureStore.getItemAsync("darkMode")) === "true";
      const language = await SecureStore.getItemAsync("language") || "en";
      const currency = await SecureStore.getItemAsync("currency") || "USD";

      setSettings({ darkMode, language, currency });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // 🔹 Update settings and store them securely
  const updateSetting = async (key: keyof Settings, value: string | boolean) => {
    try {
      await SecureStore.setItemAsync(key, value.toString());
      setSettings((prev) => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  // 🔹 Save last-used network separately
  const saveLastUsedNetwork = async (network: string) => {
    try {
      await SecureStore.setItemAsync('lastUsedNetwork', network);
    } catch (error) {
      console.error('Failed to save network:', error);
    }
  };

  // 🔹 Get last-used network
  const getLastUsedNetwork = async () => {
    try {
      const network = await SecureStore.getItemAsync('lastUsedNetwork');
      return network || 'ethereum';
    } catch (error) {
      console.error('Failed to get network:', error);
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