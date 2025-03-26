import { ethers } from 'ethers';
import { Platform } from 'react-native';

type FetchDataFunction = (url: string, json?: string, processFunc?: (value: any) => any) => Promise<any>;

// Configure ethers.js for React Native environment
export function configureEthers() {
  try {
    console.log('[Ethers] Configuring ethers.js for React Native');
    
    // Modify the fetchJson function to add timeout
    const originalFetchJson = (ethers as any)._fetchData as FetchDataFunction;
    
    if (typeof originalFetchJson === 'function') {
      (ethers as any)._fetchData = async (url: string, json?: string, processFunc?: (value: any) => any) => {
        const fetchPromise = originalFetchJson(url, json, processFunc);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Ethereum RPC request timed out after 15s: ${url}`));
          }, 15000); // 15 second timeout
        });
        
        // Race the fetch against the timeout
        return Promise.race([fetchPromise, timeoutPromise]);
      };
      
      console.log('[Ethers] Successfully patched ethers.js fetch with timeout');
    } else {
      console.warn('[Ethers] Unable to patch ethers.js fetch - method not found');
    }
    
    // Configure additional ethers.js settings
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      // Reduce polling interval for mobile
      (ethers as any).defaultPollingInterval = 8000; // 8 seconds
      
      console.log('[Ethers] Set mobile-optimized polling interval');
    }
    
    return true;
  } catch (error) {
    console.error('[Ethers] Failed to configure ethers.js:', error);
    return false;
  }
}

// Create a more resilient provider with timeout and retry logic
export function createResilientProvider(
  rpcUrl: string,
  chainId?: number,
  options?: {
    timeout?: number;
    retries?: number;
  }
): ethers.JsonRpcProvider {
  const timeout = options?.timeout || 15000; // 15 seconds default
  const retries = options?.retries || 3;
  
  console.log(`[Ethers] Creating resilient provider for ${rpcUrl}`);
  
  // Create provider with network information to avoid detection
  const network = chainId ? { chainId, name: `chain-${chainId}` } : undefined;
  const provider = new ethers.JsonRpcProvider(rpcUrl, network);
  
  // Enhance the provider's send method with retries and timeout
  const originalSend = provider.send.bind(provider);
  provider.send = async (method: string, params: any[]) => {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[Ethers] RPC request ${method} (attempt ${attempt}/${retries})`);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Ethereum RPC request timed out after ${timeout}ms: ${method}`));
          }, timeout);
        });
        
        // Race the original send against the timeout
        const result = await Promise.race([
          originalSend(method, params),
          timeoutPromise
        ]);
        
        console.log(`[Ethers] RPC request ${method} successful`);
        return result;
      } catch (error: unknown) {
        const err = error as Error;
        lastError = err;
        console.warn(`[Ethers] RPC request failed (attempt ${attempt}/${retries}):`, err.message);
        
        // Only retry on timeout or network errors, not on RPC errors
        if (!err.message.includes('timeout') && 
            !err.message.includes('network') &&
            !err.message.includes('connection')) {
          throw err;
        }
        
        // Wait before retry with exponential backoff
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we've exhausted retries, throw the last error
    throw lastError;
  };
  
  return provider;
}