import { ethers } from "ethers";
import { NETWORKS } from './config';

const providers: { [key: string]: ethers.JsonRpcProvider } = {};

export const getProvider = (network: string = 'ethereum'): ethers.JsonRpcProvider => {
  if (!providers[network]) {
    const networkConfig = NETWORKS[network];
    if (!networkConfig) {
      throw new Error(`Network ${network} not supported`);
    }
    
    if (!networkConfig.rpcUrl) {
      throw new Error(`RPC URL not configured for network ${network}`);
    }

    providers[network] = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
  }
  return providers[network];
};

// Helper function to get chain ID for a network
export const getChainId = (network: string = 'ethereum'): number => {
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    throw new Error(`Network ${network} not supported`);
  }
  return networkConfig.chainId;
};

// Helper function to get block explorer URL for a network
export const getBlockExplorerUrl = (network: string = 'ethereum'): string => {
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    throw new Error(`Network ${network} not supported`);
  }
  return networkConfig.blockExplorerUrl;
}; 
