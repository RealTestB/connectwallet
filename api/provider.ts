import { ethers } from "ethers";
import { NETWORKS, NETWORK_SETTINGS } from './config';

// Cache providers by network
const providers: { [key: string]: ethers.JsonRpcProvider } = {};

// Track failed URLs to avoid retrying them immediately
const failedUrls: { [key: string]: { url: string, timestamp: number }[] } = {};

// Configuration options for providers
const providerOptions = {
  // Increase timeout to 15 seconds for better reliability
  timeout: NETWORK_SETTINGS?.timeoutMs || 15000,
  
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://google.com', { 
      method: 'HEAD',
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('[Provider] Network connectivity test failed:', error);
    return false;
  }
};

/**
 * Get a working RPC URL for the specified network
 * @param network - Network identifier (ethereum, polygon, etc.)
 * @returns The best available RPC URL
 */
const getBestRpcUrl = (network: string): string => {
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    throw new Error(`Network ${network} not supported`);
  }

  // Get the list of failed URLs for this network
  const networkFailedUrls = failedUrls[network] || [];
  
  // Filter out URLs that failed recently (within the last 5 minutes)
  const recentlyFailedUrls = networkFailedUrls
    .filter(item => (Date.now() - item.timestamp) < 5 * 60 * 1000)
    .map(item => item.url);

  // Start with primary URL if it's not recently failed
  if (networkConfig.rpcUrl && !recentlyFailedUrls.includes(networkConfig.rpcUrl)) {
    return networkConfig.rpcUrl;
  }

  // Try fallback URLs that haven't recently failed
  const availableFallbacks = networkConfig.fallbackUrls?.filter(
    url => !recentlyFailedUrls.includes(url)
  ) || [];

  if (availableFallbacks.length > 0) {
    return availableFallbacks[0]; // Use the first available fallback
  }

  // If all URLs have failed recently, reset and try primary again
  if (networkConfig.rpcUrl) {
    console.log(`[Provider] All RPC URLs for ${network} have failed recently, trying primary again`);
    return networkConfig.rpcUrl;
  }
  
  // If primary isn't available, try first fallback
  const fallbackUrls = networkConfig.fallbackUrls || [];
  if (fallbackUrls.length > 0) {
    return fallbackUrls[0];
  }

  throw new Error(`No RPC URLs available for network ${network}`);
};

/**
 * Create a provider with enhanced error handling and retries
 * @param network - Network identifier
 * @param url - RPC URL to connect to
 * @returns A JsonRpcProvider instance
 */
const createResilientProvider = (network: string, url: string): ethers.JsonRpcProvider => {
  console.log(`[Provider] Creating new provider for ${network} using ${url}`);
  
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    throw new Error(`Network ${network} not supported`);
  }

  // Create provider with explicit network configuration
  const provider = new ethers.JsonRpcProvider(
    url,
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
    const maxRetries = 3;
    const timeoutMs = 15000; // Increased timeout
    const retryDelayMs = 2000; // Increased delay between retries
    
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
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`[Provider] Retry attempt ${attempt}/${maxRetries} for ${method}`);
          // Exponential backoff with jitter
          const backoffDelay = retryDelayMs * Math.pow(2, attempt - 1);
          const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
          await new Promise(resolve => setTimeout(resolve, backoffDelay + jitter));
        }
        
        // Create a timeout promise
        const sendPromise = originalSend(method, params);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`RPC request timeout after ${timeoutMs}ms: ${method}`));
          }, timeoutMs);
        });
        
        // Race the send against the timeout
        const result = await Promise.race([sendPromise, timeoutPromise]);

        // Handle insufficient funds error
        if (method === 'eth_estimateGas') {
          if (result?.error?.code === -32003) {
            const error = new Error('Insufficient funds for gas * price + value');
            error.name = 'InsufficientFundsError';
            console.log('[Provider] Gas estimation failed - insufficient funds:', {
              error: error.message,
              timestamp: new Date().toISOString()
            });
            
            // Emit insufficient funds event
            provider.emit('gasEstimationInsufficientFunds', {
              error: error.message,
              timestamp: Date.now()
            });
            
            throw error;
          }

          // Handle other common Alchemy error codes
          if (result?.error?.code) {
            const error = new Error(`Gas estimation failed: ${result.error.message}`);
            error.name = 'GasEstimationError';
            console.error('[Provider] Gas estimation error:', {
              code: result.error.code,
              message: result.error.message,
              timestamp: new Date().toISOString()
            });
            
            provider.emit('gasEstimationError', {
              error: error.message,
              code: result.error.code,
              timestamp: Date.now()
            });
            
            throw error;
          }
          
          // Log successful gas estimation
          console.log('[Provider] Gas estimation successful:', {
            method,
            result: result.toString(),
            params,
            timestamp: new Date().toISOString(),
            attempt
          });
          
          // Emit success event
          provider.emit('gasEstimationSuccess', {
            result: result.toString(),
            timestamp: Date.now()
          });
        }

        return result;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        lastError = error;
        
        // Log gas estimation errors
        if (method === 'eth_estimateGas') {
          console.error('[Provider] Gas estimation error:', {
            error: error.message,
            attempt,
            timestamp: new Date().toISOString(),
            params,
            network: provider._network?.name
          });
          
          // Emit error event
          provider.emit('gasEstimationError', {
            error: error.message,
            attempt,
            timestamp: Date.now()
          });
          
          // If we're on the last attempt, try fallback gas estimation
          if (attempt === maxRetries) {
            try {
              console.log('[Provider] Attempting fallback gas estimation');
              // Use a simpler gas estimation method with standard ETH transfer gas limit
              const fallbackResult = await originalSend('eth_estimateGas', [{
                ...params[0],
                gas: '0x5208', // Standard ETH transfer gas limit
                value: params[0].value || '0x0'
              }]);
              
              if (fallbackResult) {
                console.log('[Provider] Fallback gas estimation successful');
                provider.emit('gasEstimationFallbackSuccess', {
                  result: fallbackResult.toString(),
                  timestamp: Date.now()
                });
                return fallbackResult;
              }
            } catch (fallbackError) {
              console.error('[Provider] Fallback gas estimation failed:', fallbackError);
            }
          }
        } else {
          console.warn(`[Provider] RPC request failed (attempt ${attempt}/${maxRetries}):`, error.message);
        }
        
        // Don't retry insufficient funds errors
        if (error.name === 'InsufficientFundsError') {
          throw error;
        }
        
        // Only retry on timeout or network errors
        if (!error.message.includes('timeout') && 
            !error.message.includes('network') &&
            !error.message.includes('connection')) {
          throw error;
        }
      }
    }
    
    // If we've exhausted retries, mark this URL as failed
    markUrlAsFailed(network, url);
    delete providers[network];
    
    // Emit final failure event
    if (method === 'eth_estimateGas') {
      provider.emit('gasEstimationFinalFailure', {
        error: lastError.message,
        timestamp: Date.now()
      });
    }
    
    throw lastError;
  };
  
  return provider;
};

/**
 * Mark an RPC URL as failed
 * @param network - Network identifier
 * @param url - The URL that failed
 */
const markUrlAsFailed = (network: string, url: string): void => {
  if (!failedUrls[network]) {
    failedUrls[network] = [];
  }
  
  // Remove existing entry for this URL if present
  failedUrls[network] = failedUrls[network].filter(item => item.url !== url);
  
  // Add new entry with current timestamp
  failedUrls[network].push({
    url,
    timestamp: Date.now()
  });
  
  console.warn(`[Provider] Marked RPC URL as failed: ${url}`);
};

/**
 * Get a provider for the specified network
 * Creates a new provider if one doesn't exist or if the current one is failing
 * @param network - Network identifier (ethereum, polygon, etc.)
 * @returns A JsonRpcProvider for the specified network
 */
export const getProvider = (network: string = 'ethereum'): ethers.JsonRpcProvider => {
  try {
    if (!providers[network]) {
      const networkConfig = NETWORKS[network];
      if (!networkConfig?.rpcUrl) {
        throw new Error(`No RPC URL available for network ${network}`);
      }
      providers[network] = createResilientProvider(network, networkConfig.rpcUrl);
    }
    return providers[network];
  } catch (error) {
    console.error(`[Provider] Failed to create provider for ${network}:`, error);
    throw new Error(`Failed to connect to ${network} network`);
  }
};

/**
 * Get a provider safely with error handling
 * @param network - Network identifier
 * @returns Provider or null if unavailable
 */
export const getProviderSafe = async (network: string = 'ethereum'): Promise<ethers.JsonRpcProvider | null> => {
  try {
    // Check network connectivity first
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      console.warn('[Provider] Device is offline, cannot get provider');
      return null;
    }
    
    const provider = getProvider(network);
    
    // Test the connection with a timeout
    const timeoutMs = NETWORK_SETTINGS?.timeoutMs || 15000;
    const networkPromise = provider.getNetwork();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network request timeout')), timeoutMs / 2);
    });
    
    await Promise.race([networkPromise, timeoutPromise]);
    return provider;
  } catch (error) {
    console.error(`[Provider] Safe provider access failed for ${network}:`, error);
    
    // If we have a provider but it failed, try to reset it
    if (providers[network]) {
      delete providers[network];
    }
    
    return null;
  }
};

/**
 * Reset all providers to force new connections
 * Useful when network conditions change
 */
export const resetProviders = (): void => {
  Object.keys(providers).forEach(network => {
    delete providers[network];
  });
  console.log('[Provider] All providers have been reset');
};

/**
 * Get chain ID for a network
 * @param network - Network identifier
 * @returns Chain ID number
 */
export const getChainId = (network: string = 'ethereum'): number => {
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    throw new Error(`Network ${network} not supported`);
  }
  return networkConfig.chainId;
};

/**
 * Get block explorer URL for a network
 * @param network - Network identifier
 * @returns Block explorer URL string
 */
export const getBlockExplorerUrl = (network: string = 'ethereum'): string => {
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    throw new Error(`Network ${network} not supported`);
  }
  return networkConfig.blockExplorerUrl;
};