export interface ChainInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrls: string[];
  icon?: string;
}

export interface ChainContextType {
  currentChainId: number;
  setChainId: (chainId: number) => Promise<void>;
  supportedChains: ChainInfo[];
  getChainById: (chainId: number) => ChainInfo | undefined;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrls: string[];
  icon?: string;
  isTestnet: boolean;
  supported: boolean;
}

export interface ChainState {
  currentChainId: number;
  lastUsedNetwork: number;
  supportedChains: ChainInfo[];
  isLoading: boolean;
  error: string | null;
}

export type ChainId = 1 | 137 | 42161 | 10 | 56 | 43114 | 8453;

export const CHAIN_IDS = {
  ETHEREUM: 1,
  POLYGON: 137,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BSC: 56,
  AVALANCHE: 43114,
  BASE: 8453,
} as const;

export type ChainKey = keyof typeof CHAIN_IDS; 