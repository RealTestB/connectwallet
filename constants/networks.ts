import { NetworkConfig, ChainId } from '../types/chains';

export const NETWORKS: Record<ChainId, NetworkConfig> = {
  1: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: process.env.ETH_RPC_URL || '',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrls: ['https://etherscan.io'],
    icon: 'https://raw.githubusercontent.com/ethereum-optimism/brand-kit/main/assets/svg/ETH.svg',
    isTestnet: false,
    supported: true,
  },
  137: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || '',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    blockExplorerUrls: ['https://polygonscan.com'],
    icon: 'https://raw.githubusercontent.com/maticnetwork/polygon-brand-assets/main/svg/polygon-logo.svg',
    isTestnet: false,
    supported: true,
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrl: process.env.ARBITRUM_RPC_URL || '',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrls: ['https://arbiscan.io'],
    icon: 'https://raw.githubusercontent.com/arbitrum/brand-kit/main/assets/svg/arbitrum-logo.svg',
    isTestnet: false,
    supported: true,
  },
  10: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || '',
    explorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    icon: 'https://raw.githubusercontent.com/ethereum-optimism/brand-kit/main/assets/svg/optimism-logo.svg',
    isTestnet: false,
    supported: true,
  },
  56: {
    chainId: 56,
    name: 'BSC',
    rpcUrl: process.env.BSC_RPC_URL || '',
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    blockExplorerUrls: ['https://bscscan.com'],
    icon: 'https://raw.githubusercontent.com/bnb-chain/brand-assets/main/svg/bnb-chain-logo.svg',
    isTestnet: false,
    supported: true,
  },
  43114: {
    chainId: 43114,
    name: 'Avalanche',
    rpcUrl: process.env.AVALANCHE_RPC_URL || '',
    explorerUrl: 'https://snowtrace.io',
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18,
    },
    blockExplorerUrls: ['https://snowtrace.io'],
    icon: 'https://raw.githubusercontent.com/avalanche-labs/brand-kit/main/assets/svg/avalanche-logo.svg',
    isTestnet: false,
    supported: true,
  },
  8453: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: process.env.BASE_RPC_URL || '',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrls: ['https://basescan.org'],
    icon: 'https://raw.githubusercontent.com/base-org/brand-kit/main/assets/svg/base-logo.svg',
    isTestnet: false,
    supported: true,
  },
};

export const getNetworkByChainId = (chainId: ChainId): NetworkConfig => {
  const network = NETWORKS[chainId];
  if (!network) {
    throw new Error(`Network not found for chain ID: ${chainId}`);
  }
  return network;
};

export const getSupportedNetworks = (): NetworkConfig[] => {
  return Object.values(NETWORKS).filter(network => network.supported);
}; 