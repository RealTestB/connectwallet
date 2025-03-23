import { ethers } from "ethers";
import { NETWORKS } from './config';

const providers: { [key: string]: ethers.JsonRpcProvider } = {};

// Configuration options with timeout
const providerOptions = {
  // Set a 10-second timeout instead of the default 30 seconds
  // This is important for mobile network conditions
  timeout: 10000,
  
  // Lower number of polling intervals
  polling: false,
  
  // Maximum connections in batch
  batchMaxCount: 5,
};

export const getProvider = (network: string = 'ethereum'): ethers.JsonRpcProvider => {
  if (!providers[network]) {
    const networkConfig = NETWORKS[network];
    if (!networkConfig) {
      throw new Error(`Network ${network} not supported`);
    }
    
    if (!networkConfig.rpcUrl) {
      throw new Error(`RPC URL not configured for network ${network}`);
    }

    console.log(`[Provider] Creating new provider for ${network}`);
    try {
      // Create provider with timeout options
      providers[network] = new ethers.JsonRpcProvider(
        networkConfig.rpcUrl,
        undefined,
        providerOptions
      );
      
      // Test the provider with a light-weight call
      providers[network].getNetwork().catch(error => {
        console.warn(`[Provider] Initial network check failed for ${network}:`, error);
        // Provider remains in the cache, but we've logged the initial failure
      });
    } catch (error) {
      console.error(`[Provider] Failed to create provider for ${network}:`, error);
      throw new Error(`Failed to connect to ${network} network`);
    }
  }
  return providers[network];
};

// Cached provider version that handles failures gracefully
export const getProviderSafe = async (network: string = 'ethereum'): Promise<ethers.JsonRpcProvider | null> => {
  try {
    const provider = getProvider(network);
    
    // Test the connection with a timeout
    const networkPromise = provider.getNetwork();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network request timeout')), 5000);
    });
    
    await Promise.race([networkPromise, timeoutPromise]);
    return provider;
  } catch (error) {
    console.error(`[Provider] Safe provider access failed for ${network}:`, error);
    return null;
  }
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
