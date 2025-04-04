import { NetworkConfig } from '../api/config';
import Constants from 'expo-constants';

export type ChainId = 1 | 137 | 42161 | 10 | 56 | 43114 | 8453;

export interface ChainInfo {
  chainId: number;
  name: string;
  key: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
  rpcUrl: string;
  isTestnet: boolean;
  // Additional metadata for UI and functionality
  logoURI?: string;
  tokenlistUrl?: string;
  multicallAddress?: string;
  metamask?: {
    chainId: string;
    blockExplorerUrls: string[];
    chainName: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls: string[];
  };
}

// Centralized chain configurations
export const CHAINS: { [key: string]: ChainInfo } = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    key: 'ethereum',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrl: 'https://etherscan.io',
    rpcUrl: Constants.expoConfig?.extra?.ETHEREUM_MAINNET_URL || '',
    isTestnet: false
  },
  polygon: {
    chainId: 137,
    name: 'Polygon PoS',
    key: 'polygon',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    blockExplorerUrl: 'https://polygonscan.com',
    rpcUrl: Constants.expoConfig?.extra?.POLYGON_POS_MAINNET_URL || '',
    isTestnet: false
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    key: 'arbitrum',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrl: 'https://arbiscan.io',
    rpcUrl: Constants.expoConfig?.extra?.ARBITRUM_MAINNET_URL || '',
    isTestnet: false
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    key: 'optimism',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrl: 'https://optimistic.etherscan.io',
    rpcUrl: Constants.expoConfig?.extra?.OPTIMISM_MAINNET_URL || '',
    isTestnet: false
  },
  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    key: 'bsc',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    blockExplorerUrl: 'https://bscscan.com',
    rpcUrl: Constants.expoConfig?.extra?.BNB_SMART_CHAIN_MAINNET_URL || '',
    isTestnet: false
  },
  avalanche: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    key: 'avalanche',
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18
    },
    blockExplorerUrl: 'https://snowtrace.io',
    rpcUrl: Constants.expoConfig?.extra?.AVALANCHE_MAINNET_URL || '',
    isTestnet: false
  },
  base: {
    chainId: 8453,
    name: 'Base',
    key: 'base',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrl: 'https://basescan.org',
    rpcUrl: Constants.expoConfig?.extra?.BASE_MAINNET_URL || '',
    isTestnet: false
  }
};

// Helper functions for chain management
export const getChainByKey = (key: string): ChainInfo | undefined => {
  return CHAINS[key.toLowerCase()];
};

export const getChainById = (chainId: number): ChainInfo | undefined => {
  return Object.values(CHAINS).find(chain => chain.chainId === chainId);
};

export const getAllChains = (): ChainInfo[] => {
  return Object.values(CHAINS);
};

export const getSupportedChainIds = (): number[] => {
  return Object.values(CHAINS).map(chain => chain.chainId);
};

// Convert ChainInfo to NetworkConfig for compatibility
export const chainToNetworkConfig = (chain: ChainInfo): NetworkConfig => {
  return {
    chainId: chain.chainId,
    name: chain.name,
    rpcUrl: chain.rpcUrl,
    blockExplorerUrl: chain.blockExplorerUrl,
    nativeCurrency: chain.nativeCurrency,
    isTestnet: chain.isTestnet
  };
};

export const getChainPath = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return 'ethereum';
    case 137:
      return 'polygon';
    case 42161:
      return 'arbitrum';
    case 10:
      return 'optimism';
    case 56:
      return 'smartchain';
    case 43114:
      return 'avalanche';
    default:
      return 'ethereum';
  }
}; 