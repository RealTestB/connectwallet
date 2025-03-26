import { Alchemy, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import config from './config';
import { getProvider } from './provider';
import { STORAGE_KEYS } from '../constants/storageKeys';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  asset?: string;
  category: string;
  timestamp: number;
  blockNum: number;
  blockHash: string;
  gasPrice: string;
  gasUsed: string;
  gasLimit: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce: number;
  status: number;
  input: string;
  contractAddress?: string;
  tokenTransfers?: Array<{
    from: string;
    to: string;
    value: string;
    tokenAddress: string;
    tokenSymbol?: string;
    tokenName?: string;
    tokenDecimals?: number;
  }>;
}

export interface TransactionReceipt {
  to: string;
  from: string;
  contractAddress: string | null;
  transactionIndex: number;
  gasUsed: string;
  logsBloom: string;
  blockHash: string;
  transactionHash: string;
  logs: Array<{
    transactionIndex: number;
    blockNumber: number;
    transactionHash: string;
    address: string;
    topics: string[];
    data: string;
    logIndex: number;
    blockHash: string;
  }>;
  blockNumber: number;
  confirmations: number;
  cumulativeGasUsed: string;
  effectiveGasPrice: string;
  status: number;
  type: number;
}

export interface TransactionRequest {
  to: string;
  value: string;
  data?: string;
}

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

let alchemyInstance: Alchemy | null = null;
let provider: ethers.JsonRpcProvider | null = null;

const getAlchemyInstance = (network: Network = Network.ETH_MAINNET): Alchemy => {
  if (!alchemyInstance) {
    alchemyInstance = new Alchemy({
      apiKey: config.alchemy.mainnetKey,
      network
    });
  }
  return alchemyInstance;
};

/**
 * Get transaction history
 */
export const getTransactionHistory = async (address: string): Promise<ethers.TransactionResponse[]> => {
  console.log('[TransactionsApi] Getting transaction history for address:', address);
  try {
    const provider = getProvider();
    const blockNumber = await provider.getBlockNumber();
    const history = await Promise.all(
      Array.from({ length: 10 }, (_, i) => 
        provider.getBlock(blockNumber - i, true)
      )
    );
    
    const transactions = history
      .filter((block): block is ethers.Block => block !== null)
      .flatMap(block => block.prefetchedTransactions)
      .filter(tx => tx.from.toLowerCase() === address.toLowerCase() || 
                    (tx.to && tx.to.toLowerCase() === address.toLowerCase()));
    
    console.log('[TransactionsApi] Found transactions:', transactions.length);
    return transactions;
  } catch (error) {
    console.error('[TransactionsApi] Error getting transaction history:', {
      address,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to get transaction history');
  }
};

/**
 * Get transaction details
 */
export const getTransaction = async (
  hash: string,
  network: Network = Network.ETH_MAINNET
): Promise<Transaction | null> => {
  try {
    const alchemy = getAlchemyInstance(network);
    const tx = await alchemy.core.getTransaction(hash);
    if (!tx) return null;

    const receipt = await alchemy.core.getTransactionReceipt(hash);
    if (!receipt) return null;

    const block = await alchemy.core.getBlock(tx.blockNumber || 0);

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || '',
      value: tx.value.toString(),
      timestamp: block.timestamp,
      blockNum: tx.blockNumber || 0,
      blockHash: tx.blockHash || '',
      gasPrice: tx.gasPrice?.toString() || '0',
      gasUsed: receipt.gasUsed.toString(),
      gasLimit: tx.gasLimit.toString(),
      maxFeePerGas: tx.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
      nonce: tx.nonce,
      status: receipt.status || 0,
      input: tx.data,
      contractAddress: receipt.contractAddress || undefined,
      category: 'external'
    };
  } catch (error) {
    console.error('Failed to fetch transaction:', error);
    return null;
  }
};

/**
 * Estimate gas for a transaction
 */
export const estimateGas = async (request: TransactionRequest): Promise<GasEstimate> => {
  console.log('[TransactionsApi] Estimating gas:', request);
  const provider = getProvider();
  
  try {
    const privateKey = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY);
    if (!privateKey) {
      console.error('[TransactionsApi] Private key not found in secure storage');
      throw new Error('Private key not found');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('[TransactionsApi] Created wallet instance for address:', wallet.address);

    const txObject = {
      to: request.to,
      value: ethers.parseEther(request.value),
      data: request.data || '0x'
    };
    console.log('[TransactionsApi] Created transaction object for gas estimation:', txObject);

    const [gasEstimate, feeData] = await Promise.all([
      provider.estimateGas(txObject),
      provider.getFeeData()
    ]);
    console.log('[TransactionsApi] Gas estimation results:', {
      gasEstimate: gasEstimate.toString(),
      gasPrice: feeData.gasPrice?.toString()
    });

    return {
      gasLimit: gasEstimate,
      gasPrice: feeData.gasPrice ?? BigInt(0),
      maxFeePerGas: feeData.maxFeePerGas ?? undefined,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined
    };
  } catch (error) {
    console.error('[TransactionsApi] Gas estimation error:', error);
    throw error;
  }
};

/**
 * Send a transaction
 */
export const sendTransaction = async (request: TransactionRequest): Promise<string> => {
  console.log('[TransactionsApi] Starting transaction:', request);
  const provider = getProvider();
  
  try {
    const privateKey = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY);
    if (!privateKey) {
      console.error('[TransactionsApi] Private key not found in secure storage');
      throw new Error('Private key not found');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('[TransactionsApi] Created wallet instance for address:', wallet.address);

    const [nonce, feeData] = await Promise.all([
      provider.getTransactionCount(wallet.address),
      provider.getFeeData()
    ]);
    console.log('[TransactionsApi] Got transaction details:', { nonce, gasPrice: feeData.gasPrice?.toString() });

    const transaction = {
      to: request.to,
      value: ethers.parseEther(request.value),
      data: request.data || '0x',
      nonce,
      gasPrice: feeData.gasPrice,
      gasLimit: ethers.parseUnits('250000', 'wei')
    };
    console.log('[TransactionsApi] Created transaction:', transaction);

    const tx = await wallet.sendTransaction(transaction);
    console.log('[TransactionsApi] Transaction sent:', tx.hash);
    return tx.hash;
  } catch (error) {
    console.error('[TransactionsApi] Transaction error:', error);
    throw error;
  }
};

const signTransaction = async (transaction: ethers.Transaction): Promise<string> => {
  try {
    const privateKey = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY);
    if (!privateKey) throw new Error('No private key found');
    
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signTransaction(transaction);
  } catch (error) {
    console.error('Error signing transaction:', error);
    throw error;
  }
}; 