import Constants from 'expo-constants';

/**
 * Central configuration module that provides access to all environment variables
 * Values are sourced from Expo's config system (app.json -> extra)
 * During development, these values come from .env
 * During production, they come from the built app.json
 */

interface ExpoManifest {
  extra?: {
    ALCHEMY_ETH_MAINNET_KEY?: string;
    ALCHEMY_ACCOUNT_KIT_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    CMC_API_KEY?: string;
    LIFI_API_KEY?: string;
    REOWN_PROJECT_ID?: string;
    WALLETCONNECT_PROJECT_ID?: string;
  };
  hostUri?: string;
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface WalletConfig {
  classic: {
    storageKeys: {
      privateKey: string;
      seedPhrase: string;
      addresses: string;
    };
    derivationPath: string;
  };
  smart: {
    storageKeys: {
      sessions: string;
      accounts: string;
    };
    metadata: {
      name: string;
      description: string;
      url: string;
      icons: string[];
      redirect: {
        native: string;
      };
    };
  };
}

const getExpoConfig = (): ExpoManifest['extra'] => {
  try {
    const manifest = Constants.expoConfig || Constants.manifest as ExpoManifest;
    return manifest?.extra || {};
  } catch (error) {
    console.error('Failed to load Expo config:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return {};
  }
};

const extra = getExpoConfig();

// Ethereum Mainnet configuration
export const CHAIN_CONFIG: ChainConfig = {
  chainId: 1,
  name: 'Ethereum Mainnet',
  rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${extra?.ALCHEMY_ETH_MAINNET_KEY || ''}`,
  blockExplorerUrl: 'https://etherscan.io',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18
  }
};

// Wallet configuration
export const WALLET_CONFIG: WalletConfig = {
  classic: {
    storageKeys: {
      privateKey: 'walletPrivateKey',
      seedPhrase: 'walletSeedPhrase',
      addresses: 'walletAddresses'
    },
    derivationPath: "m/44'/60'/0'/0"
  },
  smart: {
    storageKeys: {
      sessions: 'smartWalletSessions',
      accounts: 'smartWalletAccounts'
    },
    metadata: {
      name: 'Reown Wallet',
      description: 'Reown Smart Wallet',
      url: 'https://reown.com',
      icons: ['https://your_wallet_icon.png'],
      redirect: {
        native: 'reownwallet://'
      }
    }
  }
};

// Environment configuration object
const config = {
  // Alchemy API configuration
  alchemy: {
    mainnetKey: extra?.ALCHEMY_ETH_MAINNET_KEY || '',
    accountKitKey: extra?.ALCHEMY_ACCOUNT_KIT_KEY || '',
    rpcUrl: function(): string {
      if (!this.mainnetKey) {
        console.error('Alchemy mainnet key not found');
        throw new Error('Missing required Alchemy API key');
      }
      return `https://eth-mainnet.g.alchemy.com/v2/${this.mainnetKey}`;
    }
  },

  // Supabase configuration
  supabase: {
    url: extra?.SUPABASE_URL || '',
    anonKey: extra?.SUPABASE_ANON_KEY || ''
  },

  // API Keys
  apiKeys: {
    cmcKey: extra?.CMC_API_KEY || '',
    lifiKey: extra?.LIFI_API_KEY || ''
  },

  // Project IDs
  projectIds: {
    reown: extra?.REOWN_PROJECT_ID || '',
    walletConnect: extra?.WALLETCONNECT_PROJECT_ID || ''
  },

  // Chain configuration
  chain: CHAIN_CONFIG,

  // Wallet configuration
  wallet: WALLET_CONFIG
};

// Validate required configuration
const validateConfig = (): void => {
  const requiredKeys: [string, string][] = [
    ['alchemy.mainnetKey', config.alchemy.mainnetKey],
    ['supabase.url', config.supabase.url],
    ['supabase.anonKey', config.supabase.anonKey],
    ['projectIds.reown', config.projectIds.reown],
    ['projectIds.walletConnect', config.projectIds.walletConnect]
  ];

  const missingKeys = requiredKeys
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    const error = `Missing required configuration keys: ${missingKeys.join(', ')}`;
    console.error(error);
    throw new Error(error);
  }
};

// Run validation in development
if (__DEV__) {
  validateConfig();
}

export default config; 