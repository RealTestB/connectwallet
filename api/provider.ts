import { ethers } from "ethers";
import { NETWORKS, NETWORK_SETTINGS } from './config';
import { NetworkConfig } from '../types/chains';

// Cache providers by network
const providers: { [key: string]: ethers.JsonRpcProvider } = {};

// Configuration options for providers
const providerOptions = {
  // Increase timeout to 30 seconds for better reliability
  timeout: NETWORK_SETTINGS?.timeoutMs || 30000,
  
  // Enable polling with a reasonable interval
  polling: true,
  pollingInterval: 4000,
  
  // Reduce batch size to improve reliability
  batchMaxCount: 1,
  
  // Add static network configuration
  staticNetwork: true
};

/**
 * Simple network check without using NetInfo
 * @returns Promise<boolean> - true if connected, false otherwise
 */
const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = 5000; // 5 second timeout

      xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState !== 4) return;

        // Handle network errors
        if (xhr.status === 0) {
          console.warn('[Provider] Network connectivity test failed: No response');
          resolve(false);
          return;
        }

        // Check if we got a successful response
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(true);
        } else {
          console.warn('[Provider] Network connectivity test failed: Bad status', xhr.status);
          resolve(false);
        }
      });

      xhr.addEventListener('error', () => {
        console.warn('[Provider] Network connectivity test failed: Request error');
        resolve(false);
      });

      xhr.addEventListener('timeout', () => {
        console.warn('[Provider] Network connectivity test failed: Timeout');
        resolve(false);
      });

      xhr.open('HEAD', 'https://google.com');
      xhr.send();
    });
  } catch (error) {
    console.warn('[Provider] Network connectivity test failed:', error);
    return false;
  }
};

/**
 * Create a provider with enhanced error handling and retries
 * @param network - Network identifier
 * @returns A JsonRpcProvider instance
 */
const createResilientProvider = (network: string): ethers.JsonRpcProvider => {
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    throw new Error(`Network ${network} not supported`);
  }

  if (!networkConfig.rpcUrl) {
    throw new Error(`No RPC URL configured for network ${network}`);
  }

  console.log(`[Provider] Creating new provider for ${network}`);
  
  // Create provider with explicit network configuration
  const provider = new ethers.JsonRpcProvider(
    networkConfig.rpcUrl,
    {
      chainId: networkConfig.chainId,
      name: networkConfig.name
    },
    providerOptions
  );

  // Add event listeners for debugging and error handling
  provider.on('error', (error) => {
    console.error('[Provider] Provider error:', error);
    // Reset provider on error
    delete providers[network];
  });

  provider.on('network', (newNetwork, oldNetwork) => {
    console.log('[Provider] Network changed:', {
      old: oldNetwork?.name,
      new: newNetwork?.name
    });
  });

  // Enhance the provider's send method with retries
  const originalSend = provider.send.bind(provider);
  provider.send = async (method: string, params: Array<any>): Promise<any> => {
    const maxRetries = 5;
    const timeoutMs = 30000;
    const retryDelayMs = 1000;
    
    let lastError = new Error('Unknown error');
    
    // Add event listener for gas estimation
    if (method === 'eth_estimateGas') {
      console.log('[Provider] Starting gas estimation:', {
        method,
        params,
        timestamp: new Date().toISOString(),
        network: provider._network?.name
      });

      // Emit gas estimation start event
      provider.emit('gasEstimationStart', {
        method,
        params,
        timestamp: Date.now()
      });

      // Validate transaction parameters
      const tx = params[0];
      if (!tx || !tx.to) {
        const error = new Error('Invalid transaction parameters: missing required fields');
        provider.emit('gasEstimationError', {
          error: error.message,
          timestamp: Date.now()
        });
        throw error;
      }
    }

    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await Promise.race([
          originalSend(method, params),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
          )
        ]);

        // Emit success event for gas estimation
        if (method === 'eth_estimateGas') {
          provider.emit('gasEstimationSuccess', {
            result,
            timestamp: Date.now()
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[Provider] Attempt ${i + 1} failed:`, error);
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    // Emit error event for gas estimation
    if (method === 'eth_estimateGas') {
      provider.emit('gasEstimationError', {
        error: lastError.message,
        timestamp: Date.now()
      });
    }

    throw lastError;
  };

  return provider;
};

export const getProvider = (network: string = 'ethereum'): ethers.JsonRpcProvider => {
  if (!providers[network]) {
    providers[network] = createResilientProvider(network);
  }
  return providers[network];
};

export const getProviderSafe = async (network: string = 'ethereum'): Promise<ethers.JsonRpcProvider | null> => {
  try {
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      console.warn('[Provider] No network connectivity');
      return null;
    }
    return getProvider(network);
  } catch (error) {
    console.error('[Provider] Failed to get provider:', error);
    return null;
  }
};

export const resetProviders = (): void => {
  Object.keys(providers).forEach(key => delete providers[key]);
};

export const getChainId = (network: string = 'ethereum'): number => {
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    throw new Error(`Network ${network} not supported`);
  }
  return networkConfig.chainId;
};

export function getBlockExplorerUrl(network: string): string {
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    throw new Error(`Network ${network} not supported`);
  }
  return networkConfig.blockExplorerUrl;
}