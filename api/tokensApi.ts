import { Alchemy, Network, TokenBalancesResponse } from 'alchemy-sdk';
import { getProvider } from './provider';
import { NETWORKS } from './config';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import config from './config';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { supabaseAdmin } from '../lib/supabase';
import { makeHttpRequest } from '../utils/httpClient';
import { ChainId } from '../constants/chains';
import { TokenMetadata, TokenBalance, TokenWithPrice, TokenBalanceResult } from '../types/tokens';
import { makeAlchemyRequest } from './alchemyApi';
import { CHAIN_TO_NETWORK } from './chainMappings';
import { estimateGas, TransactionType } from '../utils/gasUtils';
import { ERC20_ABI } from '../constants/abis';

// Map Alchemy networks to our network keys
const ALCHEMY_NETWORKS = {
  'ethereum': Network.ETH_MAINNET,
  'polygon': Network.MATIC_MAINNET,
  'arbitrum': Network.ARB_MAINNET,
  'optimism': Network.OPT_MAINNET,
  'bsc': Network.BNB_MAINNET,
  'avalanche': Network.AVALANCHE_MAINNET,
  'base': Network.BASE_MAINNET
} as const;

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
  gasPrice?: string;
  gasLimit?: string;
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

    // Get the correct RPC URL for the network
    const rpcUrl = NETWORKS[networkKey as keyof typeof NETWORKS]?.rpcUrl || NETWORKS.ethereum.rpcUrl;
    const apiKey = rpcUrl.split('/').pop() || '';

    console.log('[TokensApi] Initializing Alchemy with settings:', {
      network,
      networkKey,
      hasApiKey: !!apiKey,
      timeout: 5000,
      maxRetries: 5
    });

    const settings = {
      apiKey,
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

// Add a helper function to create TokenMetadata
const createTokenMetadata = (
  name: string,
  symbol: string,
  decimals: number,
  address: string,
  chainId: ChainId,
  logo?: string
): TokenMetadata => ({
  name,
  symbol,
  decimals,
  logo,
  address,
  chainId
});

// Update getTokenMetadata to include required fields
export const getTokenMetadata = async (contractAddress: string, chainId: number): Promise<TokenMetadata> => {
  console.log('[TokensApi] Getting token metadata:', { contractAddress, chainId });
  
  try {
    // Handle native token metadata based on chain
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      switch (chainId) {
        case 56: // BSC
          return createTokenMetadata('BNB', 'BNB', 18, contractAddress, chainId as ChainId);
        case 43114: // Avalanche
          return createTokenMetadata('AVAX', 'AVAX', 18, contractAddress, chainId as ChainId);
        case 8453: // Base
          return createTokenMetadata('Base ETH', 'ETH', 18, contractAddress, chainId as ChainId);
        case 1: // Ethereum
          return createTokenMetadata('Ethereum', 'ETH', 18, contractAddress, chainId as ChainId);
        case 137: // Polygon
          return createTokenMetadata('Polygon', 'MATIC', 18, contractAddress, chainId as ChainId);
        case 42161: // Arbitrum
          return createTokenMetadata('Arbitrum ETH', 'ETH', 18, contractAddress, chainId as ChainId);
        case 10: // Optimism
          return createTokenMetadata('Optimism ETH', 'ETH', 18, contractAddress, chainId as ChainId);
        default:
          return createTokenMetadata('Unknown', 'UNKNOWN', 18, contractAddress, chainId as ChainId);
      }
    }

    // For chains supported by Alchemy
    if (CHAIN_TO_NETWORK[chainId as ChainId]) {
      const metadata = await makeAlchemyRequest('alchemy_getTokenMetadata', [contractAddress], chainId);
      
      if (!metadata) {
        throw new Error('Failed to fetch token metadata');
      }

      return createTokenMetadata(
        metadata.name || 'Unknown',
        metadata.symbol || 'UNKNOWN',
        metadata.decimals,
        contractAddress,
        chainId as ChainId,
        metadata.logo
      );
    }

    // For other chains, use contract calls via makeAlchemyRequest
    const tokenContract = new ethers.Contract(contractAddress, ERC20_ABI);
    
    // Encode function calls
    const nameData = tokenContract.interface.encodeFunctionData('name', []);
    const symbolData = tokenContract.interface.encodeFunctionData('symbol', []);
    const decimalsData = tokenContract.interface.encodeFunctionData('decimals', []);

    // Make parallel requests using makeAlchemyRequest
    const [nameHex, symbolHex, decimalsHex] = await Promise.all([
      makeAlchemyRequest('eth_call', [{
        to: contractAddress,
        data: nameData
      }, 'latest']).catch(() => null),
      makeAlchemyRequest('eth_call', [{
        to: contractAddress,
        data: symbolData
      }, 'latest']).catch(() => null),
      makeAlchemyRequest('eth_call', [{
        to: contractAddress,
        data: decimalsData
      }, 'latest']).catch(() => null)
    ]);

    // Decode results
    const name = nameHex ? tokenContract.interface.decodeFunctionResult('name', nameHex)[0] : 'Unknown';
    const symbol = symbolHex ? tokenContract.interface.decodeFunctionResult('symbol', symbolHex)[0] : 'UNKNOWN';
    const decimals = decimalsHex ? parseInt(decimalsHex, 16) : 18;

    return createTokenMetadata(name, symbol, decimals, contractAddress, chainId as ChainId);
  } catch (error) {
    console.error('[TokensApi] Error getting token metadata:', error);
    return createTokenMetadata('Unknown Token', 'UNKNOWN', 18, contractAddress, chainId as ChainId);
  }
};

// Update formatTokenBalance to use the correct TokenBalance structure
async function formatTokenBalance(balance: { contractAddress: string; tokenBalance: string; metadata?: TokenMetadata }): Promise<TokenBalanceResult> {
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
      metadata: metadata || createTokenMetadata(
        'Unknown Token',
        'UNKNOWN',
        18,
        balance.contractAddress,
        1 // Default to Ethereum if no chain ID
      )
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

// Map chain IDs to Alchemy network types
export const CHAIN_TO_ALCHEMY: Record<ChainId, Network> = {
  1: Network.ETH_MAINNET,
  137: Network.MATIC_MAINNET,
  42161: Network.ARB_MAINNET,
  10: Network.OPT_MAINNET,
  56: Network.BNB_MAINNET,
  43114: Network.AVALANCHE_MAINNET,
  8453: Network.BASE_MAINNET
};

/**
 * Get provider for specific chain
 */
const getChainProvider = async (chainId: number): Promise<ethers.JsonRpcProvider> => {
  const networkKey = CHAIN_TO_NETWORK[chainId];
  if (!networkKey) {
    throw new Error(`Chain ID ${chainId} not supported`);
  }

  try {
    return getProvider(networkKey);
  } catch (error) {
    console.error(`[TokensApi] Failed to get provider for chain ${chainId}:`, error);
    throw error;
  }
};

/**
 * Get token balance for any chain
 */
export const getTokenBalance = async (contractAddress: string, ownerAddress: string, chainId: number): Promise<string> => {
  console.log('[TokensApi] Getting token balance:', { contractAddress, ownerAddress, chainId });
  
  try {
    // For native token
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      const balance = await makeAlchemyRequest('eth_getBalance', [ownerAddress, 'latest'], chainId);
      return ethers.formatEther(balance);
    }

    // For ERC20 tokens
    const tokenContract = new ethers.Contract(contractAddress, ERC20_ABI);
    const balanceData = tokenContract.interface.encodeFunctionData('balanceOf', [ownerAddress]);
    
    // Get decimals
    const decimalsData = tokenContract.interface.encodeFunctionData('decimals', []);
    
    // Make parallel requests for balance and decimals
    const [balanceHex, decimalsHex] = await Promise.all([
      makeAlchemyRequest('eth_call', [{
        to: contractAddress,
        data: balanceData
      }, 'latest'], chainId),
      makeAlchemyRequest('eth_call', [{
        to: contractAddress,
        data: decimalsData
      }, 'latest'], chainId)
    ]);

    const balance = ethers.toBigInt(balanceHex);
    const decimals = parseInt(decimalsHex, 16);

    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error('[TokensApi] Error getting token balance:', error);
    return '0';
  }
};

/**
 * Get all token balances for an address on a specific chain
 */
export const getTokenBalances = async (address: string, chainId: number): Promise<TokenBalanceResult[]> => {
  try {
    // Get native token balance
    const nativeBalance = await makeAlchemyRequest('eth_getBalance', [address, 'latest'], chainId);
    const nativeMetadata = await getTokenMetadata('0x0000000000000000000000000000000000000000', chainId);
    const nativeResult: TokenBalanceResult = {
      contractAddress: '0x0000000000000000000000000000000000000000',
      tokenBalance: nativeBalance,
      formattedBalance: ethers.formatEther(nativeBalance),
      metadata: nativeMetadata
    };

    // Get token balances from Alchemy
    const response = await makeAlchemyRequest('alchemy_getTokenBalances', [address], chainId);
    console.log('[TokensApi] Raw Alchemy response:', response);
    console.log('[TokensApi] Response structure:', {
      hasTokenBalances: response?.tokenBalances !== undefined,
      responseType: typeof response,
      keys: response ? Object.keys(response) : []
    });
    
    // The response has an address and tokenBalances array
    const alchemyBalances: AlchemyTokenBalance[] = response?.tokenBalances || [];
    console.log('[TokensApi] Processing token balances:', alchemyBalances);

    // Filter out zero balances and ensure tokenBalance exists
    const nonZeroBalances = alchemyBalances.filter((balance: AlchemyTokenBalance) => {
      if (!balance?.tokenBalance) return false;
      // Check if balance is non-zero (it's a hex string)
      return balance.tokenBalance !== '0x0' && balance.tokenBalance !== '0x' && balance.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    });

    // Process all tokens with balances
    const tokenResults = await Promise.all(
      nonZeroBalances.map(async (token: AlchemyTokenBalance) => {
        try {
          const metadata = await getTokenMetadata(token.contractAddress, chainId);
          const formattedBalance = await formatTokenBalance({
            contractAddress: token.contractAddress,
            tokenBalance: token.tokenBalance,
            metadata
          });
          return formattedBalance;
        } catch (error) {
          console.error(`[TokensApi] Error processing token ${token.contractAddress}:`, error);
          return {
            contractAddress: token.contractAddress,
            tokenBalance: token.tokenBalance,
            formattedBalance: '0',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    // Return both native token and other token balances
    return [nativeResult, ...tokenResults];
  } catch (error) {
    console.error('[TokensApi] Error getting token balances:', error);
    throw error;
  }
};

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = 'CG-VCXZAmb9rowc8iR9nmbeMvkE';

// Add retry logic for API calls
const fetchWithRetry = async (url: string, retries = 3): Promise<Response> => {
  try {
    // Add API key as query parameter
    const urlWithKey = `${url}${url.includes('?') ? '&' : '?'}x_cg_demo_api_key=${COINGECKO_API_KEY}`;
    
    return makeHttpRequest(urlWithKey, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
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
  from: string,
  to: string,
  tokenAddress: string,
  amount: string,
  chainId: number
): Promise<{
  gasLimit: string;
  gasPrice: string;
}> => {
  try {
    // Create the token transfer data
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI);
    const data = tokenContract.interface.encodeFunctionData('transfer', [to, amount]);

    // Estimate gas using the new gas utilities
    const { gasLimit, gasPrice } = await estimateGas(
      chainId as ChainId,
      TransactionType.TOKEN_TRANSFER,
      from,
      tokenAddress,
      data,
      '0x0' // No value for token transfers
    );

    return {
      gasLimit: gasLimit.toString(),
      gasPrice: gasPrice.toString()
    };
  } catch (error) {
    console.error('Error estimating token transfer gas:', error);
    throw error;
  }
};

/**
 * Transfer ETH or tokens
 */
export const transferToken = async ({
  contractAddress,
  toAddress,
  amount,
  decimals = 18,
  gasPrice,
  gasLimit
}: TokenTransferParams): Promise<string> => {
  try {
    console.log('[TokensApi] Starting transfer:', {
      contractAddress,
      toAddress,
      amount,
      decimals,
      gasPrice,
      gasLimit
    });

    // Get wallet data from secure storage
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (!walletDataStr) {
      throw new Error('No wallet data found');
    }

    const walletData = JSON.parse(walletDataStr);
    if (!walletData.privateKey) {
      throw new Error('No private key found in wallet data');
    }

    const chainId = walletData.chainId || 1; // Get chain ID from wallet data
    console.log('[TokensApi] Using chain ID:', chainId);

    // Create provider and wallet instance for the correct chain
    const provider = await getChainProvider(chainId);
    console.log('[TokensApi] Provider initialized for chain:', chainId);

    const wallet = new ethers.Wallet(walletData.privateKey, provider);
    console.log('[TokensApi] Wallet instance created for address:', wallet.address);

    // For native token transfer
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      console.log('[TokensApi] Sending native token transfer');
      
      if (!gasPrice) {
        throw new Error('Gas price is required for transfer');
      }

      // Convert gas price to Wei
      const gasPriceInWei = ethers.parseUnits(
        Math.floor(parseFloat(gasPrice)).toString(),
        'wei'
      );
      console.log('[TokensApi] Gas price in Wei:', gasPriceInWei.toString());

      // Get current nonce for the correct chain
      const nonce = await makeAlchemyRequest('eth_getTransactionCount', [wallet.address, 'latest'], chainId);
      
      // Estimate gas if not provided
      const txParams = {
        from: wallet.address,
        to: toAddress,
        value: ethers.toQuantity(ethers.parseEther(amount)),
        gasPrice: gasPriceInWei.toString(),
        gasLimit: gasLimit || (await estimateGas(
          chainId,
          TransactionType.NATIVE_TRANSFER,
          wallet.address,
          toAddress,
          undefined,
          ethers.toQuantity(ethers.parseEther(amount))
        )).gasLimit.toString(),
        chainId: chainId,
        nonce: nonce
      };

      console.log('[TokensApi] Transaction object created:', txParams);
      console.log('[TokensApi] Sending transaction...');

      // Sign and send the transaction
      const signedTx = await wallet.signTransaction(txParams);
      const txHash = await makeAlchemyRequest('eth_sendRawTransaction', [signedTx], chainId);
      
      if (!txHash) {
        throw new Error('Failed to get transaction hash');
      }

      console.log('[TokensApi] Transaction hash received:', txHash);
      return txHash;
    } else {
      // For ERC20 token transfer
      console.log('[TokensApi] Sending ERC20 token transfer');
      
      if (!gasPrice) {
        throw new Error('Gas price is required for transfer');
      }

      const contract = new ethers.Contract(contractAddress, ERC20_ABI, wallet);
      const amountInWei = ethers.parseUnits(amount, decimals);
      const gasPriceInWei = ethers.parseUnits(
        Math.floor(parseFloat(gasPrice)).toString(),
        'wei'
      );

      try {
        console.log('[TokensApi] Sending token transfer transaction...');
        const nonce = await makeAlchemyRequest('eth_getTransactionCount', [wallet.address, 'latest'], chainId);
        
        // Estimate gas if not provided
        const txParams = {
          from: wallet.address,
          to: contractAddress,
          data: contract.interface.encodeFunctionData('transfer', [toAddress, amountInWei.toString()]),
          value: '0x0',
          gasPrice: gasPriceInWei.toString(),
          gasLimit: gasLimit || (await estimateGas(
            chainId,
            TransactionType.TOKEN_TRANSFER,
            wallet.address,
            contractAddress,
            contract.interface.encodeFunctionData('transfer', [toAddress, amountInWei.toString()]),
            '0x0'
          )).gasLimit.toString(),
          chainId: chainId,
          nonce: nonce
        };

        console.log('[TokensApi] Transaction object created:', txParams);
        console.log('[TokensApi] Signing transaction...');
        const signedTx = await wallet.signTransaction(txParams);
        
        console.log('[TokensApi] Sending raw transaction...');
        const txHash = await makeAlchemyRequest('eth_sendRawTransaction', [signedTx], chainId);
        
        if (!txHash) {
          throw new Error('Failed to get transaction hash');
        }

        console.log('[TokensApi] Transaction hash received:', txHash);
        return txHash;
      } catch (txError) {
        console.error('[TokensApi] Token transfer failed:', txError);
        if (txError instanceof Error) {
          if (txError.message.includes('insufficient funds')) {
            throw new Error('Insufficient balance to cover gas fees');
          } else if (txError.message.includes('insufficient token balance')) {
            throw new Error('Insufficient token balance for transfer');
          } else if (txError.message.includes('nonce')) {
            throw new Error('Transaction nonce error. Please try again');
          } else if (txError.message.includes('gas required exceeds allowance')) {
            throw new Error('Gas estimation failed. The transaction may not succeed');
          } else if (txError.message.includes('1015')) {
            throw new Error('Network request blocked. Please check your internet connection');
          }
        }
        throw txError;
      }
    }
  } catch (error) {
    console.error('[TokensApi] Transfer failed:', error);
    throw error;
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
    const provider = await getProvider();
    
    interface TransferLog {
      transactionHash: string;
      address: string;
      topics: string[];
    }
    
    // Monitor for ETH transfers
    provider.on(
      {
        address: walletAddress,
        topics: [
          ethers.id("Transfer(address,address,uint256)")
        ]
      },
      async (log: TransferLog) => {
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
      async (log: TransferLog) => {
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

/**
 * Get token balances for a wallet
 */
export const getWalletTokenBalances = async (walletId: string) => {
  try {
    if (!walletId) {
      throw new Error("No wallet ID provided");
    }
    console.log("[TokensApi] Fetching token balances for wallet ID:", walletId);

    // Get token balances for the wallet
    const { data: existingTokens, error: tokenError } = await supabaseAdmin
      .from("token_balances")
      .select("*")
      .eq("wallet_id", walletId)
      .order("timestamp", { ascending: false });

    if (tokenError) {
      console.error("[TokensApi] Failed to fetch token balances:", tokenError);
      throw tokenError;
    }

    console.log("[TokensApi] Found token balances:", existingTokens?.length || 0);
    return existingTokens || [];
  } catch (error) {
    console.error("[TokensApi] Failed to fetch token balances:", error);
    throw error;
  }
}; 