import { getTokenBalance, getQuote, executeRoute, type Token, type QuoteRequest, type Route, type RoutesResponse, getToken, type ChainId, type ChainKey, getConnections, type ConnectionsRequest, ChainType } from '@lifi/sdk';
import config from './config';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';

export interface SwapQuote {
  route: Route;
  transactionRequest?: ethers.TransactionRequest;
  estimate: {
    fromAmount: string;
    toAmount: string;
    approvalAddress?: string;
    executionDuration: number;
    gasCosts: {
      limit: string;
      price: string;
    };
  };
}

export interface SwapParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  fromAddress: string;
  toAddress: string;
  slippage?: number;
  order?: 'RECOMMENDED' | 'FASTEST' | 'CHEAPEST' | 'SAFEST';
  allowBridges?: string[];
  allowExchanges?: string[];
  denyBridges?: string[];
  denyExchanges?: string[];
  preferBridges?: string[];
  preferExchanges?: string[];
}

export interface Connection {
  fromChainId: number;
  toChainId: number;
  fromTokens: Token[];
  toTokens: Token[];
}

export interface ContractCallParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  fromAmount: string;
  fromAddress: string;
  toAddress: string;
  contractAddress: string;
  contractCallData: string;
  slippage?: number;
  order?: 'RECOMMENDED' | 'FASTEST' | 'CHEAPEST' | 'SAFEST';
  allowBridges?: string[];
  allowExchanges?: string[];
  denyBridges?: string[];
  denyExchanges?: string[];
  preferBridges?: string[];
  preferExchanges?: string[];
}

export interface Action {
  fromChainId: number;
  toChainId: number;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  slippage: number;
  fromAddress: string;
  toAddress: string;
}

export type ToolErrorType = 'NO_QUOTE';

export interface ToolError {
  errorType: ToolErrorType;
  code: string;
  action: Action;
  tool: string;
  message: string;
}

export interface QuoteErrorResponse {
  message: string;
  errors: ToolError[];
}

export interface TransactionStatus {
  transactionId: string;
  sending: {
    txHash: string;
    txLink: string;
    amount: string;
    token: Token;
    chainId: number;
    gasPrice: string;
    gasUsed: string;
    gasToken: Token;
    gasAmount: string;
    gasAmountUSD: string;
    amountUSD: string;
    value: string;
    includedSteps: {
      tool: string;
      toolDetails: {
        key: string;
        name: string;
        logoURI: string;
      };
      fromAmount: string;
      fromToken: Token;
      toToken: Token;
      toAmount: string;
      bridgedAmount: string | null;
    }[];
    timestamp: number;
  };
  receiving: {
    txHash: string;
    txLink: string;
    amount: string;
    token: Token;
    chainId: number;
    gasPrice: string;
    gasUsed: string;
    gasToken: Token;
    gasAmount: string;
    gasAmountUSD: string;
    amountUSD: string;
    value: string;
    timestamp: number;
  };
  lifiExplorerLink: string;
  fromAddress: string;
  toAddress: string;
  tool: string;
  status: 'NOT_FOUND' | 'INVALID' | 'PENDING' | 'DONE' | 'FAILED';
  substatus: string;
  substatusMessage: string;
  metadata: {
    integrator: string;
  };
}

export type TransactionStatusType = 'NOT_FOUND' | 'INVALID' | 'PENDING' | 'DONE' | 'FAILED';
export type TransactionSubStatusType = 
  | 'WAIT_SOURCE_CONFIRMATIONS'
  | 'WAIT_DESTINATION_TRANSACTION'
  | 'BRIDGE_NOT_AVAILABLE'
  | 'CHAIN_NOT_AVAILABLE'
  | 'REFUND_IN_PROGRESS'
  | 'UNKNOWN_ERROR'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'REFUNDED'
  | 'NOT_PROCESSABLE_REFUND_NEEDED'
  | 'OUT_OF_GAS'
  | 'SLIPPAGE_EXCEEDED'
  | 'INSUFFICIENT_ALLOWANCE'
  | 'INSUFFICIENT_BALANCE'
  | 'EXPIRED';

/**
 * Get a quote for swapping tokens
 */
export async function getSwapQuote(params: SwapParams): Promise<SwapQuote> {
  try {
    console.log('[LiFi] Getting swap quote:', params);

    // Get wallet data from secure storage
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (!walletDataStr) {
      throw new Error('No wallet data found');
    }

    const walletData = JSON.parse(walletDataStr);
    if (!walletData.privateKey) {
      throw new Error('No private key found in wallet data');
    }

    // Create provider instance
    const provider = new ethers.JsonRpcProvider(config.alchemy.rpcUrl());

    // Check token balance using SDK method
    const balance = await getTokenBalance(params.fromAddress, {
      address: params.fromTokenAddress,
      chainId: params.fromChainId,
      decimals: 18, // Default to 18, can be updated if needed
      symbol: '', // Not needed for balance check
      name: '', // Not needed for balance check
      priceUSD: '0', // Not needed for balance check
    });

    console.log('[LiFi] Token balance:', balance);

    // Prepare quote request with all available parameters
    const quoteRequest: QuoteRequest = {
      fromChain: params.fromChainId,
      toChain: params.toChainId,
      fromToken: params.fromTokenAddress,
      toToken: params.toTokenAddress,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      order: params.order,
      slippage: params.slippage,
      allowBridges: params.allowBridges,
      allowExchanges: params.allowExchanges,
      denyBridges: params.denyBridges,
      denyExchanges: params.denyExchanges,
      preferBridges: params.preferBridges,
      preferExchanges: params.preferExchanges,
    };

    try {
      // Get quote from LiFi
      const quote = await getQuote(quoteRequest);

      if (!quote || !quote.estimate) {
        throw new Error('Invalid quote response');
      }

      return {
        route: quote as unknown as Route,
        transactionRequest: quote.transactionRequest,
        estimate: {
          fromAmount: quote.estimate.fromAmount,
          toAmount: quote.estimate.toAmount,
          approvalAddress: quote.estimate.approvalAddress,
          executionDuration: quote.estimate.executionDuration,
          gasCosts: {
            limit: quote.estimate.gasCosts?.[0]?.limit || '0',
            price: quote.estimate.gasCosts?.[0]?.price || '0',
          },
        },
      };
    } catch (error: any) {
      // Handle tool errors
      if (error.response?.data?.errors) {
        const errorResponse = error.response.data as QuoteErrorResponse;
        console.error('[LiFi] Tool errors:', errorResponse.errors);
        
        // Map error codes to user-friendly messages
        const errorMessages = errorResponse.errors.map(err => {
          switch (err.code) {
            case 'NO_POSSIBLE_ROUTE':
              return `No route found for ${err.tool}`;
            case 'INSUFFICIENT_LIQUIDITY':
              return `Insufficient liquidity in ${err.tool}`;
            case 'TOOL_TIMEOUT':
              return `${err.tool} request timed out`;
            case 'AMOUNT_TOO_LOW':
              return `Amount too low for ${err.tool}`;
            case 'AMOUNT_TOO_HIGH':
              return `Amount too high for ${err.tool}`;
            case 'FEES_HIGHER_THAN_AMOUNT':
              return `Fees higher than amount for ${err.tool}`;
            case 'DIFFERENT_RECIPIENT_NOT_SUPPORTED':
              return `${err.tool} does not support different recipient addresses`;
            case 'CANNOT_GUARANTEE_MIN_AMOUNT':
              return `${err.tool} cannot guarantee minimum amount`;
            default:
              return err.message;
          }
        });

        throw new Error(`Failed to get quote: ${errorMessages.join(', ')}`);
      }
      throw error;
    }
  } catch (error) {
    console.error('[LiFi] Error getting swap quote:', error);
    throw error;
  }
}

/**
 * Execute a token swap
 */
export const executeSwap = async (quote: SwapQuote): Promise<string> => {
  try {
    console.log('[LiFi] Executing swap:', quote);

    // Get wallet data from secure storage
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (!walletDataStr) {
      throw new Error('No wallet data found');
    }

    const walletData = JSON.parse(walletDataStr);
    if (!walletData.privateKey) {
      throw new Error('No private key found in wallet data');
    }

    // Create wallet instance
    const provider = new ethers.JsonRpcProvider(config.alchemy.rpcUrl());
    const wallet = new ethers.Wallet(walletData.privateKey, provider);

    // Execute the swap
    const result = await executeRoute(quote.route);
    
    if (!result) {
      throw new Error('Failed to execute swap');
    }

    // Handle different response formats
    let transactionHash: string;
    if (typeof result === 'string') {
      transactionHash = result;
    } else if (typeof result === 'object') {
      if ('hash' in result) {
        transactionHash = result.hash as string;
      } else if ('transactionHash' in result) {
        transactionHash = result.transactionHash as string;
      } else {
        throw new Error('No transaction hash found in response');
      }
    } else {
      throw new Error('Invalid response format from executeRoute');
    }

    console.log('[LiFi] Swap executed successfully:', result);
    return transactionHash;
  } catch (error) {
    console.error('[LiFi] Error executing swap:', error);
    throw error;
  }
};

/**
 * Get detailed information about a specific token
 */
export async function getTokenInfo(chainId: ChainId | ChainKey, tokenAddress: string): Promise<Token> {
  try {
    console.log('[LiFi] Getting token info:', { chainId, tokenAddress });

    // Get token information using LiFi SDK
    const tokenInfo = await getToken(chainId, tokenAddress);

    if (!tokenInfo) {
      throw new Error('Token information not found');
    }

    console.log('[LiFi] Token info retrieved:', {
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      chainId: tokenInfo.chainId,
      address: tokenInfo.address
    });

    return tokenInfo;
  } catch (error) {
    console.error('[LiFi] Error getting token info:', error);
    throw error;
  }
}

/**
 * Get all possible connections between tokens
 * @param fromChainId - Chain ID or key to get connections from
 * @param toChainId - Optional chain ID or key to get connections to
 * @param fromToken - Optional token address or symbol to filter from tokens
 * @param toToken - Optional token address or symbol to filter to tokens
 * @param chainTypes - Optional array of chain types to filter by (EVM, SVM)
 */
export async function getPossibleConnections(
  fromChainId: ChainId | ChainKey,
  toChainId?: ChainId | ChainKey,
  fromToken?: string,
  toToken?: string,
  chainTypes?: ChainType[]
): Promise<Connection[]> {
  try {
    console.log('[LiFi] Getting possible connections:', {
      fromChainId,
      toChainId,
      fromToken,
      toToken,
      chainTypes
    });

    // Prepare connection request
    const connectionRequest: ConnectionsRequest = {
      fromChain: fromChainId,
      toChain: toChainId,
      fromToken,
      toToken,
      chainTypes
    };

    // Get connections using LiFi SDK
    const connections = await getConnections(connectionRequest);

    if (!connections || !connections.connections) {
      throw new Error('No connections found');
    }

    console.log('[LiFi] Found connections:', {
      count: connections.connections.length,
      fromChain: fromChainId,
      toChain: toChainId
    });

    return connections.connections;
  } catch (error) {
    console.error('[LiFi] Error getting possible connections:', error);
    throw error;
  }
}

/**
 * Get all possible connections for a specific destination token
 * Useful for scenarios like showing all tokens that can be swapped to a specific token
 */
export async function getConnectionsToToken(
  toChainId: ChainId | ChainKey,
  toToken: string
): Promise<{ [chainId: number]: Token[] }> {
  try {
    console.log('[LiFi] Getting connections to token:', { toChainId, toToken });

    const connections = await getPossibleConnections(toChainId, undefined, undefined, toToken);
    
    // Group from tokens by chain
    const fromTokensByChain: { [chainId: number]: Token[] } = {};
    
    connections.forEach(connection => {
      if (!fromTokensByChain[connection.fromChainId]) {
        fromTokensByChain[connection.fromChainId] = [];
      }
      fromTokensByChain[connection.fromChainId].push(...connection.fromTokens);
    });

    console.log('[LiFi] Found tokens by chain:', {
      chainCount: Object.keys(fromTokensByChain).length,
      totalTokens: Object.values(fromTokensByChain).reduce((acc, tokens) => acc + tokens.length, 0)
    });

    return fromTokensByChain;
  } catch (error) {
    console.error('[LiFi] Error getting connections to token:', error);
    throw error;
  }
}

/**
 * Get a quote for swapping tokens by specifying the receiving amount
 */
export async function getSwapQuoteByReceivingAmount(
  params: Omit<SwapParams, 'fromAmount'> & { toAmount: string }
): Promise<SwapQuote> {
  try {
    console.log('[LiFi] Getting swap quote by receiving amount:', params);

    // Get wallet data from secure storage
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (!walletDataStr) {
      throw new Error('No wallet data found');
    }

    const walletData = JSON.parse(walletDataStr);
    if (!walletData.privateKey) {
      throw new Error('No private key found in wallet data');
    }

    // Create provider instance
    const provider = new ethers.JsonRpcProvider(config.alchemy.rpcUrl());

    // Prepare quote request with all available parameters
    const quoteRequest: QuoteRequest = {
      fromChain: params.fromChainId,
      toChain: params.toChainId,
      fromToken: params.fromTokenAddress,
      toToken: params.toTokenAddress,
      fromAmount: params.toAmount, // We'll use fromAmount as a base, the SDK will adjust it
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      order: params.order,
      slippage: params.slippage,
      allowBridges: params.allowBridges,
      allowExchanges: params.allowExchanges,
      denyBridges: params.denyBridges,
      denyExchanges: params.denyExchanges,
      preferBridges: params.preferBridges,
      preferExchanges: params.preferExchanges,
    };

    // Get quote from LiFi
    const quote = await getQuote(quoteRequest);

    if (!quote || !quote.estimate) {
      throw new Error('Invalid quote response');
    }

    // Adjust the quote to match the desired receiving amount
    const adjustmentFactor = BigInt(params.toAmount) / BigInt(quote.estimate.toAmount);
    const adjustedFromAmount = (BigInt(quote.estimate.fromAmount) * adjustmentFactor).toString();

    return {
      route: quote as unknown as Route,
      transactionRequest: quote.transactionRequest,
      estimate: {
        fromAmount: adjustedFromAmount,
        toAmount: params.toAmount,
        approvalAddress: quote.estimate.approvalAddress,
        executionDuration: quote.estimate.executionDuration,
        gasCosts: {
          limit: quote.estimate.gasCosts?.[0]?.limit || '0',
          price: quote.estimate.gasCosts?.[0]?.price || '0',
        },
      },
    };
  } catch (error) {
    console.error('[LiFi] Error getting swap quote by receiving amount:', error);
    throw error;
  }
}

/**
 * Get a quote for a cross-chain contract call
 */
export async function getContractCallQuote(params: ContractCallParams): Promise<SwapQuote> {
  try {
    console.log('[LiFi] Getting contract call quote:', params);

    // Get wallet data from secure storage
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (!walletDataStr) {
      throw new Error('No wallet data found');
    }

    const walletData = JSON.parse(walletDataStr);
    if (!walletData.privateKey) {
      throw new Error('No private key found in wallet data');
    }

    // Create provider instance
    const provider = new ethers.JsonRpcProvider(config.alchemy.rpcUrl());

    // Check token balance using SDK method
    const balance = await getTokenBalance(params.fromAddress, {
      address: params.fromTokenAddress,
      chainId: params.fromChainId,
      decimals: 18, // Default to 18, can be updated if needed
      symbol: '', // Not needed for balance check
      name: '', // Not needed for balance check
      priceUSD: '0', // Not needed for balance check
    });

    console.log('[LiFi] Token balance:', balance);

    // Prepare quote request with all available parameters
    const quoteRequest: QuoteRequest = {
      fromChain: params.fromChainId,
      toChain: params.toChainId,
      fromToken: params.fromTokenAddress,
      toToken: params.fromTokenAddress, // For contract calls, we use the same token
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      order: params.order,
      slippage: params.slippage,
      allowBridges: params.allowBridges,
      allowExchanges: params.allowExchanges,
      denyBridges: params.denyBridges,
      denyExchanges: params.denyExchanges,
      preferBridges: params.preferBridges,
      preferExchanges: params.preferExchanges,
    };

    // Get quote from LiFi
    const quote = await getQuote(quoteRequest);

    if (!quote || !quote.estimate) {
      throw new Error('Invalid quote response');
    }

    // Modify the transaction request to include the contract call data
    if (quote.transactionRequest) {
      quote.transactionRequest.data = params.contractCallData;
      quote.transactionRequest.to = params.contractAddress;
    }

    return {
      route: quote as unknown as Route,
      transactionRequest: quote.transactionRequest,
      estimate: {
        fromAmount: quote.estimate.fromAmount,
        toAmount: quote.estimate.toAmount,
        approvalAddress: quote.estimate.approvalAddress,
        executionDuration: quote.estimate.executionDuration,
        gasCosts: {
          limit: quote.estimate.gasCosts?.[0]?.limit || '0',
          price: quote.estimate.gasCosts?.[0]?.price || '0',
        },
      },
    };
  } catch (error) {
    console.error('[LiFi] Error getting contract call quote:', error);
    throw error;
  }
}

/**
 * Execute a cross-chain contract call
 */
export async function executeContractCall(quote: SwapQuote): Promise<string> {
  try {
    console.log('[LiFi] Executing contract call:', quote);

    // Get wallet data from secure storage
    const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
    if (!walletDataStr) {
      throw new Error('No wallet data found');
    }

    const walletData = JSON.parse(walletDataStr);
    if (!walletData.privateKey) {
      throw new Error('No private key found in wallet data');
    }

    // Create wallet instance
    const provider = new ethers.JsonRpcProvider(config.alchemy.rpcUrl());
    const wallet = new ethers.Wallet(walletData.privateKey, provider);

    // Execute the contract call
    const result = await executeRoute(quote.route);
    
    if (!result) {
      throw new Error('Failed to execute contract call');
    }

    // Handle different response formats
    let transactionHash: string;
    if (typeof result === 'string') {
      transactionHash = result;
    } else if (typeof result === 'object') {
      if ('hash' in result) {
        transactionHash = result.hash as string;
      } else if ('transactionHash' in result) {
        transactionHash = result.transactionHash as string;
      } else {
        throw new Error('No transaction hash found in response');
      }
    } else {
      throw new Error('Invalid response format from executeRoute');
    }

    console.log('[LiFi] Contract call executed successfully:', result);
    return transactionHash;
  } catch (error) {
    console.error('[LiFi] Error executing contract call:', error);
    throw error;
  }
}

/**
 * Get the status of a transaction
 */
export async function getTransactionStatus(
  txHash: string,
  fromChain?: number,
  toChain?: number,
  bridge?: string
): Promise<TransactionStatus> {
  try {
    console.log('[LiFi] Getting transaction status:', { txHash, fromChain, toChain, bridge });

    // Prepare query parameters
    const params: Record<string, string> = { txHash };
    if (fromChain) params.fromChain = fromChain.toString();
    if (toChain) params.toChain = toChain.toString();
    if (bridge) params.bridge = bridge;

    // Make request to LiFi status endpoint
    const response = await fetch(`https://li.quest/v1/status?${new URLSearchParams(params)}`);
    if (!response.ok) {
      throw new Error(`Failed to get transaction status: ${response.statusText}`);
    }

    const status = await response.json();
    console.log('[LiFi] Transaction status:', {
      status: status.status,
      substatus: status.substatus,
      message: status.substatusMessage
    });

    return status;
  } catch (error) {
    console.error('[LiFi] Error getting transaction status:', error);
    throw error;
  }
}

/**
 * Wait for a transaction to complete
 * @param txHash - Transaction hash to monitor
 * @param options - Optional configuration
 * @returns Promise that resolves with the final transaction status
 */
export async function waitForTransaction(
  txHash: string,
  options: {
    fromChain?: number;
    toChain?: number;
    bridge?: string;
    interval?: number; // Polling interval in milliseconds
    timeout?: number; // Maximum time to wait in milliseconds
  } = {}
): Promise<TransactionStatus> {
  const {
    fromChain,
    toChain,
    bridge,
    interval = 5000, // Default 5 seconds
    timeout = 300000 // Default 5 minutes
  } = options;

  const startTime = Date.now();
  let lastStatus: TransactionStatus | null = null;

  while (true) {
    // Check if we've exceeded the timeout
    if (Date.now() - startTime > timeout) {
      throw new Error(`Transaction monitoring timed out after ${timeout / 1000} seconds`);
    }

    // Get current status
    const status = await getTransactionStatus(txHash, fromChain, toChain, bridge);
    lastStatus = status;

    // Log status changes
    if (lastStatus && lastStatus.status !== status.status) {
      console.log('[LiFi] Transaction status changed:', {
        from: lastStatus.status,
        to: status.status,
        substatus: status.substatus,
        message: status.substatusMessage
      });
    }

    // Check if we've reached a final state
    if (status.status === 'DONE' || status.status === 'FAILED') {
      return status;
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Get a user-friendly message for a transaction status
 */
export function getTransactionStatusMessage(status: TransactionStatus): string {
  const { status: mainStatus, substatus, substatusMessage } = status;

  // If we have a specific message, use it
  if (substatusMessage) {
    return substatusMessage;
  }

  // Otherwise, generate a message based on status and substatus
  switch (mainStatus) {
    case 'NOT_FOUND':
      return 'Transaction not found. It may still be pending confirmation.';
    case 'INVALID':
      return 'Invalid transaction. The transaction hash does not match the expected tool.';
    case 'PENDING':
      switch (substatus) {
        case 'WAIT_SOURCE_CONFIRMATIONS':
          return 'Waiting for source chain confirmations...';
        case 'WAIT_DESTINATION_TRANSACTION':
          return 'Waiting for destination transaction...';
        case 'BRIDGE_NOT_AVAILABLE':
          return 'Bridge service temporarily unavailable. Please try again later.';
        case 'CHAIN_NOT_AVAILABLE':
          return 'Chain RPC temporarily unavailable. Please try again later.';
        case 'REFUND_IN_PROGRESS':
          return 'Refund is being processed...';
        default:
          return 'Transaction is being processed...';
      }
    case 'DONE':
      switch (substatus) {
        case 'COMPLETED':
          return 'Transaction completed successfully!';
        case 'PARTIAL':
          return 'Transaction completed partially. Some tokens may have been received.';
        case 'REFUNDED':
          return 'Transaction was refunded.';
        default:
          return 'Transaction completed.';
      }
    case 'FAILED':
      switch (substatus) {
        case 'NOT_PROCESSABLE_REFUND_NEEDED':
          return 'Transaction failed and needs to be refunded.';
        case 'OUT_OF_GAS':
          return 'Transaction failed due to insufficient gas.';
        case 'SLIPPAGE_EXCEEDED':
          return 'Transaction failed due to price slippage.';
        case 'INSUFFICIENT_ALLOWANCE':
          return 'Transaction failed due to insufficient token allowance.';
        case 'INSUFFICIENT_BALANCE':
          return 'Transaction failed due to insufficient balance.';
        case 'EXPIRED':
          return 'Transaction failed because it expired.';
        default:
          return 'Transaction failed.';
      }
    default:
      return 'Unknown transaction status.';
  }
} 