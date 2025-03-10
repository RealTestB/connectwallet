import Constants from 'expo-constants';

/**
 * Central configuration module that provides access to all environment variables
 * Values are sourced from Expo's config system (app.json -> extra)
 * During development, these values come from .env
 * During production, they come from the built app.json
 */

const getExpoConfig = () => {
  try {
    return (Constants.expoConfig || Constants.manifest)?.extra || {};
  } catch (error) {
    console.warn('Failed to load Expo config:', error);
    return {};
  }
};

const extra = getExpoConfig();

// Environment configuration object
const config = {
  // Alchemy API configuration
  alchemy: {
    mainnetKey: extra.ALCHEMY_ETH_MAINNET_KEY || '',
    accountKitKey: extra.ALCHEMY_ACCOUNT_KIT_KEY || '',
    rpcUrl: function() {
      if (!this.mainnetKey) {
        console.warn('Alchemy mainnet key not found, using public RPC');
        return 'https://eth-mainnet.public.blastapi.io';
      }
      return `https://eth-mainnet.g.alchemy.com/v2/${this.mainnetKey}`;
    }
  },

  // Supabase configuration
  supabase: {
    url: extra.SUPABASE_URL || '',
    anonKey: extra.SUPABASE_ANON_KEY || ''
  },

  // API Keys
  apiKeys: {
    cmcKey: extra.CMC_API_KEY || '',
    lifiKey: extra.LIFI_API_KEY || ''
  },

  // Project IDs
  projectIds: {
    reown: extra.REOWN_PROJECT_ID || '',
    walletConnect: extra.WALLETCONNECT_PROJECT_ID || ''
  }
};

// Validate required configuration
const validateConfig = () => {
  const requiredKeys = [
    ['alchemy.mainnetKey', config.alchemy.mainnetKey],
    ['supabase.url', config.supabase.url],
    ['supabase.anonKey', config.supabase.anonKey]
  ];

  const missingKeys = requiredKeys
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    console.warn('Missing required configuration keys:', missingKeys.join(', '));
  }
};

// Run validation in development
if (__DEV__) {
  validateConfig();
}

export default config; 