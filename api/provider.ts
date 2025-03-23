import { ethers } from "ethers";
import { NETWORKS, NETWORK_SETTINGS } from './config';
import NetInfo from '@react-native-community/netinfo';

// Cache providers by network
const providers: { [key: string]: ethers.JsonRpcProvider } = {};

// Track failed URLs to avoid retrying them immediately
const failedUrls: { [key: string]: { url: string, timestamp: number }[] } = {};

// Configuration options for providers
const providerOptions = {
  // Use network settings for timeout
  timeout: NETWORK_SETTINGS.timeoutMs,
  
  // Disable continuous polling to reduce battery usage
  polling: false,
  
  // Max requests in a batch
  batchMaxCount: 5,
};

/**
 * Check if the device has network connectivity
 * @returns Promise<boolean> - true if connected, false otherwise
 */
const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true;
  } catch (error) {
    console.warn('[Provider] Error checking network connectivity:', error);
    return true; // Assume connected if we can't check
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
  const availableFallbacks = networkConfig.fallbackUrls.filter(
    url => !recentlyFailedUrls.includes(url)
  );

  if (availableFallbacks.length > 0) {
    return availableFallbacks[0]; // Use the first available fallback
  }

  // If all URLs have failed recently, reset and try primary again
  if (networkConfig.rpcUrl) {
    console.log(`[Provider] All RPC URLs for ${network} have failed recently, trying primary again`);
    return networkConfig.rpcUrl;
  }
  
  // If primary isn't available, try first fallback
  if (networkConfig.fallbackUrls.length > 0) {
    return networkConfig.fallbackUrls[0];
  }

  throw new Error(`No RPC URLs available for network ${network}`);
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
 * Create a provider with enhanced error handling and retries
 * @param network - Network identifier
 * @param url - RPC URL to connect to
 * @returns A JsonRpcProvider instance
 */
const createResilientProvider = (network: string, url: string): ethers.JsonRpcProvider => {
  console.log(`[Provider] Creating new provider for ${network} using ${url}`);
  
  // Create provider with network information
  const networkConfig = NETWORKS[network];
  const provider = new ethers.JsonRpcProvider(
    url,
    { chainId: networkConfig.chainId, name: networkConfig.name },
    providerOptions
  );
  
  // Enhance the provider's send method with retries
  const originalSend = provider.send.bind(provider);
  provider.send = async (method: string, params: Array<any>): Promise<any> => {
    let lastError = new Error('Unknown error');
    
    for (let attempt = 1; attempt <= NETWORK_SETTINGS.maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`[Provider] Retry attempt ${attempt}/${NETWORK_SETTINGS.maxRetries} for ${method}`);
        }
        
        // Create a timeout promise
        const sendPromise = originalSend(method, params);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`RPC request timeout after ${NETWORK_SETTINGS.timeoutMs}ms: ${method}`));
          }, NETWORK_SETTINGS.timeoutMs);
        });
        
        // Race the send against the timeout
        const result = await Promise.race([sendPromise, timeoutPromise]);
        return result;
      } catch (err: unknown) {
        const error = err as { message?: string };
        lastError = new Error(error?.message || 'Unknown RPC error');
        console.warn(`[Provider] RPC request failed (attempt ${attempt}/${NETWORK_SETTINGS.maxRetries}):`, error?.message);
        
        // Only retry on timeout or network errors, not on RPC errors
        if (error?.message && 
            !error.message.includes('timeout') && 
            !error.message.includes('network') &&
            !error.message.includes('connection')) {
          throw lastError;
        }
        
        // Wait before retry with exponential backoff
        if (attempt < NETWORK_SETTINGS.maxRetries) {
          const delay = Math.min(
            NETWORK_SETTINGS.retryDelayMs * Math.pow(2, attempt - 1),
            NETWORK_SETTINGS.maxRetryDelayMs
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we've exhausted retries, mark this URL as failed
    markUrlAsFailed(network, url);
    
    // Try to get a new provider (this will happen on the next call)
    delete providers[network];
    
    // Throw the last error
    throw lastError;
  };
  
  return provider;
};

/**
 * Get a provider for the specified network
 * Creates a new provider if one doesn't exist or if the current one is failing
 * @param network - Network identifier (ethereum, polygon, etc.)
 * @returns A JsonRpcProvider for the specified network
 */
export const getProvider = (network: string = 'ethereum'): ethers.JsonRpcProvider => {
  try {
    // If we don't have a provider for this network yet, create one
    if (!providers[network]) {
      const url = getBestRpcUrl(network);
      providers[network] = createResilientProvider(network, url);

      // Test the provider with a lightweight call
      setTimeout(() => {
        providers[network].getNetwork().catch(error => {
          console.warn(`[Provider] Initial network check failed for ${network}:`, error);
          // Mark this URL as failed
          markUrlAsFailed(network, url);
          // Delete the provider so it will be recreated with a different URL next time
          delete providers[network];
        });
      }, 100);
    }
    
    return providers[network];
  } catch (error) {
    console.error(`[Provider] Failed to create provider for ${network}:`, error);
    throw new Error(`Failed to connect to ${network} network. Please check your internet connection.`);
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
    const networkPromise = provider.getNetwork();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network request timeout')), NETWORK_SETTINGS.timeoutMs / 2);
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
 * Get all available providers for all networks
 * Useful for operations that need to check multiple networks
 * @returns Object mapping network names to providers
 */
export const getAllProviders = async (): Promise<{ [network: string]: ethers.JsonRpcProvider | null }> => {
  const result: { [network: string]: ethers.JsonRpcProvider | null } = {};
  
  // Check network connectivity first
  const isConnected = await checkNetworkConnectivity();
  if (!isConnected) {
    console.warn('[Provider] Device is offline, cannot get providers');
    return result;
  }
  
  // Try to get a provider for each network
  for (const network of Object.keys(NETWORKS)) {
    try {
      result[network] = await getProviderSafe(network);
    } catch (error) {
      console.warn(`[Provider] Failed to get provider for ${network}:`, error);
      result[network] = null;
    }
  }
  
  return result;
};

/**
 * Reset all providers to force new connections
 * Useful when network conditions change
 */
export const resetAllProviders = (): void => {
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

/**
 * Get a formatted transaction or address URL for a block explorer
 * @param network - Network identifier
 * @param type - Type of URL ('tx', 'address', 'token', or 'block')
 * @param value - Hash, address, or other identifier
 * @returns Full URL string
 */
export const getExplorerUrl = (
  network: string = 'ethereum',
  type: 'tx' | 'address' | 'token' | 'block',
  value: string
): string => {
  const baseUrl = getBlockExplorerUrl(network);
  return `${baseUrl}/${type}/${value}`;
};
