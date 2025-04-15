import { NetworkConfig, ChainId } from '../types/chains';
import { ethers } from 'ethers';

export const NETWORKS: Record<ChainId, NetworkConfig> = {
  1: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2',
    explorerUrl: 'https://etherscan.io',
    symbol: 'ETH',
    decimals: 18,
    isTestnet: false,
    iconUrl: 'https://ethereum.org/static/eth-diamond.svg',
    isEnabled: true,
    gasTokenSymbol: 'ETH',
    supportsEIP1559: true
  },
  137: {
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2',
    explorerUrl: 'https://polygonscan.com',
    symbol: 'MATIC',
    decimals: 18,
    isTestnet: false,
    iconUrl: 'https://polygon.technology/static/polygon-logo.svg',
    isEnabled: true,
    gasTokenSymbol: 'MATIC',
    supportsEIP1559: true
  },
  42161: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2',
    explorerUrl: 'https://arbiscan.io',
    symbol: 'ETH',
    decimals: 18,
    isTestnet: false,
    iconUrl: 'https://arbitrum.io/static/arbitrum-logo.svg',
    isEnabled: true,
    gasTokenSymbol: 'ETH',
    supportsEIP1559: false
  },
  10: {
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2',
    explorerUrl: 'https://optimistic.etherscan.io',
    symbol: 'ETH',
    decimals: 18,
    isTestnet: false,
    iconUrl: 'https://optimism.io/static/optimism-logo.svg',
    isEnabled: true,
    gasTokenSymbol: 'ETH',
    supportsEIP1559: false
  },
  56: {
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    symbol: 'BNB',
    decimals: 18,
    isTestnet: false,
    iconUrl: 'https://bnbchain.org/static/bnb-logo.svg',
    isEnabled: true,
    gasTokenSymbol: 'BNB',
    supportsEIP1559: false
  },
  43114: {
    name: 'Avalanche',
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    symbol: 'AVAX',
    decimals: 18,
    isTestnet: false,
    iconUrl: 'https://avax.network/static/avax-logo.svg',
    isEnabled: true,
    gasTokenSymbol: 'AVAX',
    supportsEIP1559: true
  },
  8453: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    symbol: 'ETH',
    decimals: 18,
    isTestnet: false,
    iconUrl: 'https://base.org/static/base-logo.svg',
    isEnabled: true,
    gasTokenSymbol: 'ETH',
    supportsEIP1559: true
  }
};

export const getNetworkByChainId = (chainId: ChainId): NetworkConfig => {
  const network = NETWORKS[chainId];
  if (!network) {
    throw new Error(`Network not found for chain ID: ${chainId}`);
  }
  return network;
};

export const getSupportedNetworks = (): NetworkConfig[] => {
  return Object.values(NETWORKS).filter(network => network.isEnabled);
}; 