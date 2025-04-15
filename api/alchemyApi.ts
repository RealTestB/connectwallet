import { Alchemy, Network, AlchemySettings } from 'alchemy-sdk';
import { ethers } from 'ethers';
import config from './config';
import { TokenBalance, TokenMetadata } from '../types/tokens';
import { NETWORKS } from './config';
import { CHAIN_TO_NETWORK } from './chainMappings';

// Update TokenBalance interface to match Alchemy's response structure
interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

interface AlchemyInstances {
  [key: string]: Alchemy;
}

const TIMEOUT_MS = 5000; // 5 second timeout for better UX

// Get the Alchemy URL for a specific network
const getAlchemyUrl = (chainId: number = 1): string => {
  const networkKey = CHAIN_TO_NETWORK[chainId];
  if (!networkKey) {
    throw new Error(`Chain ID ${chainId} not supported`);
  }
  return NETWORKS[networkKey]?.rpcUrl || '';
};

// Get the Alchemy NFT URL for a specific network
const getAlchemyNFTUrl = (chainId: number = 1): string => {
  const networkKey = CHAIN_TO_NETWORK[chainId];
  if (!networkKey) {
    throw new Error(`Chain ID ${chainId} not supported`);
  }
  const baseUrl = NETWORKS[networkKey]?.rpcUrl || '';
  return baseUrl.replace('/v2/', '/nft/v3/');
};

interface AlchemyResponse {
  jsonrpc: string;
  id: number;
  result: any;
}

interface AlchemyError {
  jsonrpc: string;
  id: number;
  error: {
    code: number;
    message: string;
  };
}

/**
 * Make a request to Alchemy API using XMLHttpRequest
 */
export function makeAlchemyRequest(method: string, params: any[], chainId: number = 1): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 30000; // 30 second timeout

    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState !== 4) return;

      // Handle network errors
      if (xhr.status === 0) {
        reject(new Error('Network error occurred'));
        return;
      }

      try {
        const response = xhr.responseText ? JSON.parse(xhr.responseText) : null;

        // Check for Alchemy API errors
        if (response?.error) {
          const alchemyError = response as AlchemyError;
          reject(new Error(alchemyError.error.message));
          return;
        }

        // Handle successful response
        if (xhr.status >= 200 && xhr.status < 300 && response) {
          const alchemyResponse = response as AlchemyResponse;
          resolve(alchemyResponse.result);
        } else {
          reject(new Error(`HTTP error! status: ${xhr.status}`));
        }
      } catch (error) {
        reject(new Error('Failed to parse response'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Request failed'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Request timed out'));
    });

    const url = getAlchemyUrl(chainId);
    console.log('[AlchemyAPI] Making request to:', { url, method, chainId });

    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');

    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    });

    xhr.send(body);
  });
}

/**
 * Make a request to Alchemy NFT API v3 using XMLHttpRequest
 */
export function makeAlchemyNFTRequest(endpoint: string, queryParams: Record<string, any> = {}, chainId: number = 1): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 30000; // 30 second timeout

    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState !== 4) return;

      // Handle network errors
      if (xhr.status === 0) {
        reject(new Error('Network error occurred'));
        return;
      }

      try {
        const response = xhr.responseText ? JSON.parse(xhr.responseText) : null;

        // Handle successful response
        if (xhr.status >= 200 && xhr.status < 300 && response) {
          resolve(response);
        } else {
          reject(new Error(response?.error || `HTTP error! status: ${xhr.status}`));
        }
      } catch (error) {
        reject(new Error('Failed to parse response'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Request failed'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Request timed out'));
    });

    // Construct query string from params
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    const baseUrl = getAlchemyNFTUrl(chainId);
    const url = `${baseUrl}/${endpoint}${queryString ? `?${queryString}` : ''}`;
    
    console.log('[AlchemyAPI] Making NFT request to:', { url, chainId });
    
    xhr.open('GET', url);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send();
  });
}

let alchemyInstances: AlchemyInstances = {};
let provider: ethers.JsonRpcProvider | null = null;

/**
 * Get or create Alchemy instance for a specific chain
 */
export function getAlchemyInstance(chainId: number = 1): Alchemy {
  const networkKey = CHAIN_TO_NETWORK[chainId];
  if (!networkKey) {
    throw new Error(`Chain ID ${chainId} not supported`);
  }

  if (!alchemyInstances[networkKey]) {
    const settings: AlchemySettings = {
      apiKey: config.apiKeys.alchemyKey,
      network: Network[networkKey.toUpperCase() as keyof typeof Network] || Network.ETH_MAINNET
    };
    alchemyInstances[networkKey] = new Alchemy(settings);
  }
  return alchemyInstances[networkKey];
}

/**
 * Get or create ethers provider instance for a specific chain
 */
export const getProvider = (chainId: number = 1): ethers.JsonRpcProvider => {
  const networkKey = CHAIN_TO_NETWORK[chainId];
  if (!networkKey) {
    throw new Error(`Chain ID ${chainId} not supported`);
  }

  if (!provider) {
    try {
      const url = getAlchemyUrl(chainId);
      provider = new ethers.JsonRpcProvider(url);
    } catch (error) {
      console.error('Failed to create provider:', error);
      throw new Error('Failed to initialize provider');
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
 * Get ETH balance for an address
 */
export async function getEthBalance(address: string): Promise<string> {
  const balanceHex = await makeAlchemyRequest('eth_getBalance', [address, 'latest']);
  // Convert hex balance to decimal string
  return BigInt(balanceHex).toString();
}

/**
 * Get token balances for an address
 */
export async function getTokenBalances(address: string): Promise<AlchemyTokenBalance[]> {
  return makeAlchemyRequest('alchemy_getTokenBalances', [address]);
}

/**
 * Get token metadata
 */
export async function getTokenMetadata(contractAddress: string): Promise<TokenMetadata> {
  return makeAlchemyRequest('alchemy_getTokenMetadata', [contractAddress]);
}

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

/**
 * Fetch all token balances and metadata for a wallet
 */
export async function fetchWalletTokens(address: string): Promise<{
  ethBalance: string;
  tokens: (AlchemyTokenBalance & TokenMetadata)[];
}> {
  try {
    // Get ETH balance and token balances in parallel
    const [ethBalance, tokenBalances] = await Promise.all([
      getEthBalance(address),
      getTokenBalances(address)
    ]);

    // Get metadata for all tokens with non-zero balance
    const tokensWithMetadata = await Promise.all(
      tokenBalances
        .filter(token => token.tokenBalance !== '0x0')
        .map(async token => {
          const metadata = await getTokenMetadata(token.contractAddress);
          return {
            ...token,
            ...metadata
          };
        })
    );

    return {
      ethBalance,
      tokens: tokensWithMetadata
    };
  } catch (error) {
    console.error('[AlchemyApi] Error fetching wallet tokens:', error);
    throw error;
  }
} 