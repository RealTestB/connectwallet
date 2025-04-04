import Constants from 'expo-constants';
import { CHAINS, chainToNetworkConfig } from '../constants/chains';

/**
 * Central configuration module that provides access to all environment variables
 * Values are sourced from Expo's config system (app.config.js -> extra)
 */

interface ExpoManifest {
  extra?: {
    ETHEREUM_MAINNET_URL?: string;
    ETHEREUM_MAINNET_FALLBACK_URLS?: string[];
    ETHEREUM_SEPOLIA_URL?: string;
    POLYGON_POS_MAINNET_URL?: string;
    POLYGON_POS_FALLBACK_URLS?: string[];
    POLYGON_MUMBAI_URL?: string;
    ARBITRUM_MAINNET_URL?: string;
    ARBITRUM_FALLBACK_URLS?: string[];
    ARBITRUM_SEPOLIA_URL?: string;
    OPTIMISM_MAINNET_URL?: string;
    OPTIMISM_FALLBACK_URLS?: string[];
    OPTIMISM_SEPOLIA_URL?: string;
    AVALANCHE_MAINNET_URL?: string;
    AVALANCHE_FALLBACK_URLS?: string[];
    AVALANCHE_FUJI_URL?: string;
    BASE_MAINNET_URL?: string;
    BASE_FALLBACK_URLS?: string[];
    BASE_SEPOLIA_URL?: string;
    BNB_SMART_CHAIN_MAINNET_URL?: string;
    ALCHEMY_ETH_MAINNET_KEY?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?: string;
    SUPABASE_S3_ACCESS_KEY?: string;
    SUPABASE_S3_SECRET_KEY?: string;
    CMC_API_KEY?: string;
    LIFI_API_KEY?: string;
    ALCHEMY_API_KEY?: string;
    NETWORK_SETTINGS?: {
      timeoutMs: number;
      maxRetries: number;
      retryDelayMs: number;
      maxRetryDelayMs: number;
      pollingIntervalMs: number;
    };
  };
  hostUri?: string;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  fallbackUrls?: string[];
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
  fallbackUrls?: string[];
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
      lastActive: string;
    };
    derivationPath: string;
  };
}

export interface NetworkSettings {
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  pollingIntervalMs: number;
}

// Default network settings if not provided in config
export const NETWORK_SETTINGS: NetworkSettings = {
  timeoutMs: 15000,         // 15 seconds default timeout
  maxRetries: 3,            // Maximum retries for network requests
  retryDelayMs: 1000,       // Base delay between retries
  maxRetryDelayMs: 10000,   // Maximum delay between retries
  pollingIntervalMs: 8000   // Polling interval for network status
};

const getExpoConfig = (): ExpoManifest['extra'] => {
  try {
    const manifest = Constants.expoConfig || Constants.manifest as ExpoManifest;
    console.log('[Config] Loading environment variables');
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

// Get public fallback RPC endpoints for each network
const getPublicFallbacks = (network: string): string[] => {
  switch (network) {
    case 'ethereum':
      return [
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://ethereum.publicnode.com'
      ];
    case 'polygon':
      return [
        'https://polygon-rpc.com',
        'https://rpc-mainnet.matic.network',
        'https://rpc.ankr.com/polygon'
      ];
    case 'arbitrum':
      return [
        'https://arb1.arbitrum.io/rpc',
        'https://rpc.ankr.com/arbitrum'
      ];
    case 'optimism':
      return [
        'https://mainnet.optimism.io',
        'https://rpc.ankr.com/optimism'
      ];
    case 'avalanche':
      return [
        'https://api.avax.network/ext/bc/C/rpc',
        'https://rpc.ankr.com/avalanche'
      ];
    case 'base':
      return [
        'https://mainnet.base.org',
        'https://base.gateway.tenderly.co'
      ];
    default:
      return [];
  }
};

// Network configurations
export const NETWORKS: { [key: string]: NetworkConfig } = Object.entries(CHAINS).reduce(
  (acc, [key, chain]) => ({
    ...acc,
    [key]: chainToNetworkConfig(chain)
  }),
  {}
);

// Ethereum Mainnet configuration
export const CHAIN_CONFIG: ChainConfig = {
  chainId: 1,
  name: 'Ethereum Mainnet',
  rpcUrl: extra?.ETHEREUM_MAINNET_URL || '',
  fallbackUrls: extra?.ETHEREUM_MAINNET_FALLBACK_URLS || getPublicFallbacks('ethereum'),
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
      addresses: 'hasWallet',
      lastActive: 'lastActiveTimestamp'
    },
    derivationPath: "m/44'/60'/0'/0"
  }
};

// Environment configuration object
const config = {
  // Network settings
  network: NETWORK_SETTINGS,

  // Alchemy API configuration
  alchemy: {
    mainnetKey: extra?.ALCHEMY_ETH_MAINNET_KEY || '',
    rpcUrl: () => {
      const key = extra?.ALCHEMY_ETH_MAINNET_KEY || '';
      if (!key) {
        console.warn('[Config] Missing Alchemy mainnet key, using fallback');
        return getPublicFallbacks('ethereum')[0]; // Use public fallback instead of throwing
      }
      return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
    },
    settings: {
      maxRetries: NETWORK_SETTINGS.maxRetries,
      requestTimeout: NETWORK_SETTINGS.timeoutMs,
      batchRequests: true,
      network: 'mainnet'
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
    lifiKey: extra?.LIFI_API_KEY || '',
    alchemyKey: extra?.ALCHEMY_API_KEY || ''
  },

  // Chain configuration
  chain: CHAIN_CONFIG,

  // Wallet configuration
  wallet: WALLET_CONFIG,

  coingecko: {
    apiKey: 'CG-VCXZAmb9rowc8iR9nmbeMvkE',
    baseUrl: 'https://api.coingecko.com/api/v3'
  }
};

export default config;