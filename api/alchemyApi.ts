import { Alchemy, Network, AlchemySettings } from 'alchemy-sdk';
import { ethers } from 'ethers';
import config from './config';

interface AlchemyInstances {
  [key: string]: Alchemy;
}

const TIMEOUT_MS = 5000; // 5 second timeout for better UX

const makeAlchemyRequest = (method: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    const url = `https://eth-mainnet.g.alchemy.com/v2/${config.alchemy.mainnetKey}`;
    console.log('[AlchemyAPI] Making request:', { method, url });
    
    const xhr = new XMLHttpRequest();
    xhr.timeout = TIMEOUT_MS;
    
    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState !== 4) return;
      
      console.log('[AlchemyAPI] Response received:', {
        status: xhr.status,
        statusText: xhr.statusText,
        hasResponse: !!xhr.responseText,
        method
      });
      
      if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.error) {
            console.error('[AlchemyAPI] JSON-RPC error:', { method, error: response.error });
            reject(new Error(`${method} failed: ${response.error.message}`));
            return;
          }
          console.log('[AlchemyAPI] Successfully parsed response for', method);
          resolve(response.result);
        } catch (error) {
          const errorMsg = `Failed to parse response for ${method}`;
          console.error('[AlchemyAPI]', errorMsg, error);
          reject(new Error(errorMsg));
        }
      } else {
        const errorMsg = `${method} request failed with status ${xhr.status}`;
        console.error('[AlchemyAPI]', errorMsg, {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText
        });
        reject(new Error(errorMsg));
      }
    });

    xhr.addEventListener('error', () => {
      const errorMsg = `Network request failed for ${method}`;
      console.error('[AlchemyAPI]', errorMsg);
      reject(new Error(errorMsg));
    });

    xhr.addEventListener('timeout', () => {
      const errorMsg = `${method} request timed out after ${TIMEOUT_MS}ms`;
      console.error('[AlchemyAPI]', errorMsg);
      reject(new Error(errorMsg));
    });

    try {
      xhr.open('POST', url);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      const body = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params
      });
      
      xhr.send(body);
    } catch (error) {
      const errorMsg = `Failed to send ${method} request`;
      console.error('[AlchemyAPI]', errorMsg, error);
      reject(new Error(errorMsg));
    }
  });
};

let alchemyInstances: AlchemyInstances = {};
let provider: ethers.JsonRpcProvider | null = null;

/**
 * Get or create Alchemy instance
 */
export const getAlchemyInstance = (network: Network = Network.ETH_MAINNET): Alchemy => {
  const networkKey = network.toString();
  if (!alchemyInstances[networkKey]) {
    try {
      const settings: AlchemySettings = {
        apiKey: config.alchemy.mainnetKey,
        network: network
      };
      alchemyInstances[networkKey] = new Alchemy(settings);
    } catch (error) {
      console.error('Failed to create Alchemy instance:', error);
      throw new Error('Failed to initialize Alchemy SDK');
    }
  }
  return alchemyInstances[networkKey];
};

/**
 * Get or create ethers provider instance
 */
export const getProvider = (): ethers.JsonRpcProvider => {
  if (!provider) {
    try {
      provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${config.alchemy.mainnetKey}`);
    } catch (error) {
      console.error('Failed to create provider:', error);
      throw new Error('Failed to initialize Ethereum provider');
    }
  }
  return provider;
};

/**
 * Check if address is a contract
 */
export const isContract = async (address: string): Promise<boolean> => {
  try {
    console.log('[AlchemyAPI] Checking if address is contract:', address);
    const code = await makeAlchemyRequest('eth_getCode', [address, 'latest']);
    const isContract = code !== '0x';
    console.log('[AlchemyAPI] Contract check result:', { address, isContract });
    return isContract;
  } catch (error) {
    console.error('[AlchemyAPI] Error checking contract:', {
      address,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Get NFTs for owner address
 */
export const getNFTsForOwner = async (address: string): Promise<any> => {
  try {
    console.log('[AlchemyAPI] Getting NFTs for owner:', address);
    const nfts = await makeAlchemyRequest('alchemy_getNfts', [{ owner: address }]);
    console.log('[AlchemyAPI] NFTs response:', {
      address,
      nftCount: nfts?.ownedNfts?.length ?? 0
    });
    return nfts?.ownedNfts ?? [];
  } catch (error) {
    console.error('[AlchemyAPI] Error getting NFTs:', {
      address,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Get NFT metadata
 */
export const getNFTMetadata = async (contractAddress: string, tokenId: string): Promise<any> => {
  try {
    console.log('[AlchemyAPI] Getting NFT metadata:', { contractAddress, tokenId });
    const metadata = await makeAlchemyRequest('alchemy_getNftMetadata', [{
      contractAddress,
      tokenId,
      tokenType: 'erc721'  // Default to ERC721, can be made configurable if needed
    }]);
    console.log('[AlchemyAPI] NFT metadata response:', {
      contractAddress,
      tokenId,
      hasMetadata: !!metadata
    });
    return metadata;
  } catch (error) {
    console.error('[AlchemyAPI] Error getting NFT metadata:', {
      contractAddress,
      tokenId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Get token balances for address
 */
export const getTokenBalances = async (address: string): Promise<any[]> => {
  try {
    console.log('[AlchemyAPI] Getting token balances for:', address);
    const balances = await makeAlchemyRequest('alchemy_getTokenBalances', [address]);
    console.log('[AlchemyAPI] Token balances response:', {
      address,
      tokenCount: balances?.tokenBalances?.length ?? 0
    });
    return balances?.tokenBalances ?? [];
  } catch (error) {
    console.error('[AlchemyAPI] Error getting token balances:', {
      address,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Get token metadata
 */
export const getTokenMetadata = async (contractAddress: string): Promise<any> => {
  try {
    console.log('[AlchemyAPI] Getting token metadata for:', contractAddress);
    const metadata = await makeAlchemyRequest('alchemy_getTokenMetadata', [contractAddress]);
    console.log('[AlchemyAPI] Token metadata response:', {
      contractAddress,
      hasMetadata: !!metadata
    });
    return metadata;
  } catch (error) {
    console.error('[AlchemyAPI] Error getting token metadata:', {
      contractAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Get ETH balance for address
 */
export const getEthBalance = async (address: string) => {
  try {
    const alchemy = getAlchemyInstance();
    return await alchemy.core.getBalance(address);
  } catch (error) {
    console.error('Error getting ETH balance:', {
      address,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Get native balance for address
 */
export const getNativeBalance = async (address: string): Promise<string> => {
  try {
    console.log('[AlchemyAPI] Getting native balance for:', address);
    const balance = await makeAlchemyRequest('eth_getBalance', [address, 'latest']);
    console.log('[AlchemyAPI] Native balance response:', balance);
    return balance;
  } catch (error) {
    console.error('[AlchemyAPI] Error getting native balance:', {
      address,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

// Reset instances (useful for testing or when changing networks)
export const resetInstances = () => {
  alchemyInstances = {};
  provider = null;
}; 