import Constants from 'expo-constants';

/**
 * Central configuration module that provides access to all environment variables
 * Values are sourced from Expo's config system (app.json -> extra)
 * During development, these values come from .env
 * During production, they come from the built app.json
 */

interface ExpoManifest {
  extra?: {
    ETHEREUM_MAINNET_URL?: string;
    ETHEREUM_SEPOLIA_URL?: string;
    POLYGON_POS_MAINNET_URL?: string;
    POLYGON_MUMBAI_URL?: string;
    ARBITRUM_MAINNET_URL?: string;
    ARBITRUM_SEPOLIA_URL?: string;
    OPTIMISM_MAINNET_URL?: string;
    OPTIMISM_SEPOLIA_URL?: string;
    AVALANCHE_MAINNET_URL?: string;
    AVALANCHE_FUJI_URL?: string;
    BASE_MAINNET_URL?: string;
    BASE_SEPOLIA_URL?: string;
    ALCHEMY_ETH_MAINNET_KEY?: string;
    ALCHEMY_ACCOUNT_KIT_KEY?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?: string;
    SUPABASE_S3_ACCESS_KEY?: string;
    SUPABASE_S3_SECRET_KEY?: string;
    CMC_API_KEY?: string;
    LIFI_API_KEY?: string;
  };
  hostUri?: string;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet: boolean;
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
}

const getExpoConfig = (): ExpoManifest['extra'] => {
  try {
    const manifest = Constants.expoConfig || Constants.manifest as ExpoManifest;
    console.log('[Config] Loading environment variables:', {
      alchemyKey: manifest?.extra?.ALCHEMY_ETH_MAINNET_KEY ? 'Set' : 'Missing',
      supabaseUrl: manifest?.extra?.EXPO_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      supabaseAnonKey: manifest?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      supabaseServiceRoleKey: manifest?.extra?.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
      cmcKey: manifest?.extra?.CMC_API_KEY ? 'Set' : 'Missing',
      lifiKey: manifest?.extra?.LIFI_API_KEY ? 'Set' : 'Missing'
    });
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
  }
};

// Environment configuration object
const config = {
  // Alchemy API configuration
  alchemy: {
    mainnetKey: extra?.ALCHEMY_ETH_MAINNET_KEY || '',
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
    url: extra?.EXPO_PUBLIC_SUPABASE_URL || '',
    anonKey: extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: extra?.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '',
    storage: {
      accessKey: extra?.SUPABASE_S3_ACCESS_KEY || '',
      secretKey: extra?.SUPABASE_S3_SECRET_KEY || ''
    }
  },

  // API Keys
  apiKeys: {
    cmcKey: extra?.CMC_API_KEY || '',
    lifiKey: extra?.LIFI_API_KEY || ''
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
    ['supabase.serviceRoleKey', config.supabase.serviceRoleKey]
  ];

  const missingKeys = requiredKeys
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    const error = `Missing required configuration keys: ${missingKeys.join(', ')}`;
    console.error('[Config] Validation Error:', error);
    console.error('[Config] Current configuration:', {
      alchemyKeys: {
        mainnet: config.alchemy.mainnetKey ? 'Set' : 'Missing',
      },
      supabase: {
        url: config.supabase.url ? 'Set' : 'Missing',
        anonKey: config.supabase.anonKey ? 'Set' : 'Missing',
        serviceRoleKey: config.supabase.serviceRoleKey ? 'Set' : 'Missing',
        storage: {
          accessKey: config.supabase.storage.accessKey ? 'Set' : 'Missing',
          secretKey: config.supabase.storage.secretKey ? 'Set' : 'Missing'
        }
      }
    });
    throw new Error(error);
  }
};

// Validate configuration immediately
validateConfig();

// Network configurations
export const NETWORKS: { [key: string]: NetworkConfig } = {
  'ethereum': {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: extra?.ETHEREUM_MAINNET_URL || '',
    blockExplorerUrl: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    isTestnet: false
  },
  'polygon': {
    chainId: 137,
    name: 'Polygon PoS',
    rpcUrl: extra?.POLYGON_POS_MAINNET_URL || '',
    blockExplorerUrl: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    isTestnet: false
  },
  'arbitrum': {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: extra?.ARBITRUM_MAINNET_URL || '',
    blockExplorerUrl: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    isTestnet: false
  },
  'optimism': {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: extra?.OPTIMISM_MAINNET_URL || '',
    blockExplorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    isTestnet: false
  },
  'avalanche': {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    rpcUrl: extra?.AVALANCHE_MAINNET_URL || '',
    blockExplorerUrl: 'https://snowtrace.io',
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18
    },
    isTestnet: false
  },
  'base': {
    chainId: 8453,
    name: 'Base',
    rpcUrl: extra?.BASE_MAINNET_URL || '',
    blockExplorerUrl: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    isTestnet: false
  }
};

export default config; 