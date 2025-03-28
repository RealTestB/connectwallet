import { Alchemy, Network, TokenBalancesResponse } from 'alchemy-sdk';
import { getProvider } from './provider';
import { NETWORKS } from './config';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import config from './config';
import { STORAGE_KEYS } from '../constants/storageKeys';

// Map Alchemy networks to our network keys
const ALCHEMY_NETWORKS = {
  'ethereum': Network.ETH_MAINNET,
  'polygon': Network.MATIC_MAINNET,
  'arbitrum': Network.ARB_MAINNET,
  'optimism': Network.OPT_MAINNET
} as const;

export interface TokenMetadata {
  decimals: number;
  logo?: string;
  name?: string;
  symbol?: string;
}

export interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string | null;
  metadata?: TokenMetadata;
  formattedBalance?: string;
}

export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
  balance: string;
  balanceUSD?: number;
  price?: number;
  priceChange24h?: number;
  isSpam?: boolean;
}

type NetworkKey = keyof typeof ALCHEMY_NETWORKS;

export interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  rawBalance?: string;
  metadata?: TokenMetadata;
}

export interface TokenPrice {
  price: number;
  change24h?: number;
  marketCap?: number;
  volume24h?: number;
}

export interface TokenTransferRequest {
  tokenAddress: string;
  to: string;
  amount: string;
}

export interface TokenTransfer {
  tokenAddress: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
}

export interface TokenTransferParams {
  contractAddress: string;
  toAddress: string;
  amount: string;
  decimals: number;
}

export interface TokenBalanceResult {
  contractAddress: string;
  tokenBalance: string;
  formattedBalance: string;
  metadata?: {
    decimals: number;
    logo?: string;
    name?: string;
    symbol: string;
  };
  error?: string;
}

let alchemyInstance: Alchemy | null = null;

export function initializeAlchemy(networkKey: NetworkKey | string = 'ethereum'): Alchemy {
  try {
    if (alchemyInstance) {
      return alchemyInstance;
    }

    const network = networkKey in ALCHEMY_NETWORKS 
      ? ALCHEMY_NETWORKS[networkKey as NetworkKey]
      : Network.ETH_MAINNET;

    console.log('[TokensApi] Initializing Alchemy with settings:', {
      network,
      hasApiKey: !!config.alchemy.mainnetKey,
      timeout: 5000,
      maxRetries: 5
    });

    const settings = {
      apiKey: config.alchemy.mainnetKey,
      network,
      maxRetries: 5,
      requestTimeout: 5000,
      batchRequests: false
    };

    alchemyInstance = new Alchemy(settings);
    console.log('[TokensApi] Alchemy instance created successfully');
    return alchemyInstance;
  } catch (error) {
    console.error('[TokensApi] Error initializing Alchemy:', error);
    throw new Error('Failed to initialize Alchemy SDK');
  }
}

const MAX_RETRIES = 3;
const INITIAL_TIMEOUT = 30000; // 30 seconds

async function formatTokenBalance(balance: TokenBalance): Promise<TokenBalanceResult> {
  try {
    if (!balance.tokenBalance) {
      return {
        contractAddress: balance.contractAddress,
        tokenBalance: '0',
        formattedBalance: '0',
        error: 'No balance data'
      };
    }

    // Get token metadata
    const metadata = balance.metadata;
    const decimals = metadata?.decimals || 18;
    
    // Format the balance
    const rawBalance = BigInt(balance.tokenBalance);
    const divisor = BigInt(10 ** decimals);
    const formattedBalance = Number(rawBalance) / Number(divisor);

    return {
      contractAddress: balance.contractAddress,
      tokenBalance: balance.tokenBalance,
      formattedBalance: formattedBalance.toString(),
      metadata: {
        decimals: metadata?.decimals || 18,
        logo: metadata?.logo,
        name: metadata?.name,
        symbol: metadata?.symbol || 'Unknown'
      }
    };
  } catch (error) {
    console.error('[TokensApi] Error formatting token balance:', error);
    return {
      contractAddress: balance.contractAddress,
      tokenBalance: '0',
      formattedBalance: '0',
      error: 'Failed to format balance'
    };
  }
}

/**
 * Get token balances for an address
 */
export async function getTokenBalances(address: string, networkKey: string = 'ethereum'): Promise<TokenBalanceResult[] | { error: string }> {
  try {
    console.log('[TokensApi] Fetching token balances:', {
      address,
      networkKey
    });

    // Initialize or get Alchemy instance
    const alchemy = alchemyInstance || initializeAlchemy(networkKey);

    console.log('[TokensApi] Alchemy initialized, fetching balances...');
    
    // Get token balances
    const balances = await alchemy.core.getTokenBalances(address);

    // Remove tokens with zero balance
    const nonZeroBalances = balances.tokenBalances.filter((token) => {
      return token.tokenBalance !== "0";
    });

    console.log(`[TokensApi] Found ${nonZeroBalances.length} tokens with non-zero balance`);

    // Format the balances and fetch metadata
    const formattedBalances = await Promise.all(
      nonZeroBalances.map(async (token) => {
        try {
          // Get metadata of token
          const metadata = await alchemy.core.getTokenMetadata(token.contractAddress);

          // Compute token balance in human-readable format
          const balance = token.tokenBalance ? 
            (Number(token.tokenBalance) / Math.pow(10, metadata.decimals)).toFixed(4) : 
            "0";

          return {
            contractAddress: token.contractAddress,
            tokenBalance: token.tokenBalance || "0",
            formattedBalance: balance,
            metadata: {
              decimals: metadata.decimals,
              logo: metadata.logo || undefined,
              name: metadata.name || "Unknown",
              symbol: metadata.symbol || "Unknown"
            }
          };
        } catch (error) {
          console.error('[TokensApi] Error processing token:', token.contractAddress, error);
          return {
            contractAddress: token.contractAddress,
            tokenBalance: token.tokenBalance || "0",
            formattedBalance: "0",
            metadata: {
              decimals: 18,
              name: "Unknown Token",
              symbol: "UNKNOWN"
            }
          };
        }
      })
    );

    console.log('[TokensApi] Successfully formatted balances:', {
      count: formattedBalances.length
    });

    return formattedBalances;
  } catch (error) {
    console.error('[TokensApi] Error fetching token balances:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return { error: 'Failed to fetch token balances' };
  }
}

/**
 * Get token metadata
 */
export const getTokenMetadata = async (contractAddress: string): Promise<any> => {
  console.log('[TokensApi] Getting token metadata:', contractAddress);
  try {
    const alchemy = initializeAlchemy();
    const metadata = await alchemy.core.getTokenMetadata(contractAddress);
    console.log('[TokensApi] Token metadata:', metadata);
    return metadata;
  } catch (error) {
    console.error('[TokensApi] Error getting token metadata:', {
      contractAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to get token metadata');
  }
};

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = 'CG-VCXZAmb9rowc8iR9nmbeMvkE';

// Add retry logic for API calls
const fetchWithRetry = async (url: string, retries = 3): Promise<Response> => {
  try {
    // Add API key as query parameter
    const urlWithKey = `${url}${url.includes('?') ? '&' : '?'}x_cg_demo_api_key=${COINGECKO_API_KEY}`;
    const response = await fetch(urlWithKey);
    
    // Handle rate limiting
    if (response.status === 429) {
      if (retries > 0) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return fetchWithRetry(url, retries - 1);
      }
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
};

/**
 * Get historical token prices for charting from CoinGecko
 * @param address Token contract address
 * @param days Number of days of history to fetch
 * @returns Array of [timestamp, price] tuples
 */

const makeAlchemyRequest = (method: string, params: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 5000; // 5 second timeout

    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000),
      method,
      params
    });

    console.log('[TokensApi] Making Alchemy request:', { method, params });

    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState !== 4) return;
      
      console.log('[TokensApi] Response received:', {
        status: xhr.status,
        statusText: xhr.statusText,
        hasResponse: !!xhr.responseText
      });
      
      if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
        try {
          const response = JSON.parse(xhr.responseText);
          console.log('[TokensApi] Parsed response:', response);
          if (response.error) {
            console.error('[TokensApi] JSON-RPC error:', response.error);
            reject(new Error(response.error.message));
            return;
          }
          resolve(response.result);
        } catch (error) {
          console.error('[TokensApi] Failed to parse response:', error);
          reject(new Error('Failed to parse response'));
        }
      } else {
        const errorMsg = `Request failed with status ${xhr.status}`;
        console.error('[TokensApi]', errorMsg, {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText
        });
        reject(new Error(errorMsg));
      }
    });

    xhr.addEventListener('error', () => {
      console.error('[TokensApi] Network request failed');
      reject(new Error('Network request failed'));
    });

    xhr.addEventListener('timeout', () => {
      console.error('[TokensApi] Request timed out');
      reject(new Error('Request timed out'));
    });

    try {
      xhr.open('POST', `https://eth-mainnet.g.alchemy.com/v2/${config.alchemy.mainnetKey}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(body);
    } catch (error) {
      console.error('[TokensApi] Failed to send request:', error);
      reject(new Error('Failed to send request'));
    }
  });
};

export const getNativeBalance = async (address: string): Promise<string> => {
  try {
    console.log('[TokensApi] Fetching native balance for address:', address);
    
    const balance = await makeAlchemyRequest('eth_getBalance', [address, 'latest']);
    console.log('[TokensApi] Received balance:', balance);
    
    return balance;
  } catch (error) {
    console.error('[TokensApi] Failed to fetch native balance:', error);
    throw error;
  }
};

/**
 * Get token transfers for an address
 */
export const getTokenTransfers = async (
  address: string,
  tokenAddress?: string
): Promise<TokenTransfer[]> => {
  try {
    const alchemy = initializeAlchemy();
    const transfers = await alchemy.core.getAssetTransfers({
      fromAddress: address,
      category: ['erc20' as const],
      withMetadata: true,
      contractAddresses: tokenAddress ? [tokenAddress] : undefined
    });

    return transfers.transfers.map(transfer => ({
      tokenAddress: transfer.asset || '',
      from: transfer.from,
      to: transfer.to,
      value: transfer.value?.toString() || '0',
      timestamp: 0 // Timestamp not available in transfer data
    }));
  } catch (error) {
    console.error('Failed to fetch token transfers:', {
      address,
      tokenAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Estimate gas for token transfer
 */
export const estimateTokenTransferGas = async (
  tokenAddress: string,
  fromAddress: string,
  toAddress: string,
  amount: string
) => {
  try {
    const provider = getProvider();
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function transfer(address to, uint256 amount)'],
      provider
    );

    const gasEstimate = await tokenContract.transfer.estimateGas(
      toAddress,
      amount
    );

    return gasEstimate;
  } catch (error) {
    console.error('Failed to estimate token transfer gas:', {
      tokenAddress,
      fromAddress,
      toAddress,
      amount,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

/**
 * Transfer tokens
 */
export const transferToken = async (params: TokenTransferParams): Promise<string> => {
  console.log('[TokensApi] Starting token transfer:', params);
  const provider = getProvider();
  
  try {
    const privateKey = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY);
    if (!privateKey) {
      console.error('[TokensApi] Private key not found in secure storage');
      throw new Error('Private key not found');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('[TokensApi] Created wallet instance for address:', wallet.address);

    const contract = new ethers.Contract(params.contractAddress, ERC20_ABI, wallet);
    const amountInWei = ethers.parseUnits(params.amount, params.decimals);
    
    console.log('[TokensApi] Sending token transfer transaction');
    const tx = await contract.transfer(params.toAddress, amountInWei);
    console.log('[TokensApi] Transfer transaction sent:', tx.hash);
    
    return tx.hash;
  } catch (error) {
    console.error('[TokensApi] Transfer error:', {
      params,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to transfer tokens');
  }
};

/**
 * Get token balance
 */
export const getTokenBalance = async (contractAddress: string, ownerAddress: string): Promise<string> => {
  console.log('[TokensApi] Getting token balance:', { contractAddress, ownerAddress });
  try {
    // Make both requests concurrently
    const [metadata, data] = await Promise.all([
      makeAlchemyRequest('alchemy_getTokenMetadata', [contractAddress])
        .catch(error => {
          console.error('[TokensApi] Error getting token metadata:', {
            contractAddress,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Return default decimals of 18 if metadata fetch fails
          return { decimals: 18 };
        }),
      makeAlchemyRequest('alchemy_getTokenBalances', [ownerAddress, [contractAddress]])
        .catch(error => {
          console.error('[TokensApi] Error getting token balance:', {
            contractAddress,
            ownerAddress,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Return empty balance if balance fetch fails
          return { tokenBalances: [{ tokenBalance: '0x0' }] };
        })
    ]);
    
    if (!data.tokenBalances[0] || !data.tokenBalances[0].tokenBalance) {
      console.log('[TokensApi] No balance found, returning 0');
      return '0';
    }
    
    const rawBalance = data.tokenBalances[0].tokenBalance;
    const formattedBalance = ethers.formatUnits(rawBalance, metadata.decimals);
    
    console.log('[TokensApi] Token balance:', {
      contractAddress,
      ownerAddress,
      rawBalance,
      formattedBalance,
      decimals: metadata.decimals
    });
    return formattedBalance;
  } catch (error) {
    console.error('[TokensApi] Error getting token balance:', {
      contractAddress,
      ownerAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    // Return 0 for any errors to avoid breaking the UI
    return '0';
  }
};

/**
 * Store token balances in SecureStore
 */
export const storeTokenBalances = async (balances: TokenBalanceResult[]): Promise<void> => {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN_BALANCES, JSON.stringify(balances));
  } catch (error) {
    console.error('Error storing token balances:', error);
    throw error;
  }
};

/**
 * Get stored token balances from SecureStore
 */
export const getStoredTokenBalances = async (): Promise<TokenBalanceResult[] | null> => {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN_BALANCES);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting stored token balances:', error);
    return null;
  }
};

/**
 * Update stored balance for a specific token
 */
export const updateStoredTokenBalance = async (
  walletAddress: string,
  tokenAddress: string,
  newBalance: string
): Promise<void> => {
  try {
    const currentBalances = await getStoredTokenBalances();
    if (currentBalances) {
      const updatedBalances = currentBalances.map(balance =>
        balance.contractAddress === tokenAddress ? {
          ...balance,
          tokenBalance: newBalance
        } : balance
      );
      await storeTokenBalances(updatedBalances);
    }
    console.log('[TokensApi] Updated balance for token:', tokenAddress);
  } catch (error) {
    console.error('[TokensApi] Error updating token balance:', error);
    throw error;
  }
};

interface PendingTransaction {
  hash: string;
  to?: string;
  from: string;
  value: string;
}

/**
 * Set up transaction monitoring for a wallet
 */
export const setupTransactionMonitoring = async (
  walletAddress: string,
  networkKey: string = 'ethereum'
): Promise<void> => {
  try {
    const alchemy = initializeAlchemy(networkKey);
    const provider = getProvider();
    
    // Monitor for ETH transfers
    provider.on(
      {
        address: walletAddress,
        topics: [
          ethers.id("Transfer(address,address,uint256)")
        ]
      },
      async (log) => {
        console.log('[TokensApi] New transaction detected:', log.transactionHash);
        
        // Update ETH balance
        const newBalance = await alchemy.core.getBalance(walletAddress);
        await updateStoredTokenBalance(
          walletAddress,
          '0x0000000000000000000000000000000000000000',
          ethers.formatEther(newBalance)
        );
      }
    );

    // Monitor for token transfers
    provider.on(
      {
        address: walletAddress,
        topics: [
          ethers.id("Transfer(address,address,uint256)")
        ]
      },
      async (log) => {
        if (!log.address) return;
        
        // Get new token balance
        const contract = new ethers.Contract(log.address, ERC20_ABI, provider);
        const [balance, decimals] = await Promise.all([
          contract.balanceOf(walletAddress),
          contract.decimals()
        ]);
        
        await updateStoredTokenBalance(
          walletAddress,
          log.address.toLowerCase(),
          ethers.formatUnits(balance, decimals)
        );
      }
    );

    console.log('[TokensApi] Transaction monitoring set up for:', walletAddress);
  } catch (error) {
    console.error('[TokensApi] Error setting up transaction monitoring:', error);
    throw error;
  }
}; 