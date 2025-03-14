import { Alchemy, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';
import { Core } from '@walletconnect/core';
import { WalletKit } from '@reown/walletkit';
import type { SessionTypes } from '@walletconnect/types';
import * as SecureStore from 'expo-secure-store';
import config from './config';
import { getWalletKit } from './walletApi';

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
  nonce?: number;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  chainId?: number;
  from?: string;
  walletType: 'classic' | 'smart';
}

export interface GasEstimate {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  gasLimit: string;
  estimatedCost: string;
}

let alchemyInstance: Alchemy | null = null;
let walletKitInstance: Awaited<ReturnType<typeof WalletKit.init>> | null = null;
let provider: ethers.JsonRpcProvider | null = null;

const getProvider = (): ethers.JsonRpcProvider => {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${config.alchemy.mainnetKey}`);
  }
  return provider;
};

const getAlchemyInstance = (network: Network = Network.ETH_MAINNET): Alchemy => {
  if (!alchemyInstance) {
    alchemyInstance = new Alchemy({
      apiKey: config.alchemy.mainnetKey,
      network
    });
  }
  return alchemyInstance;
};

// Helper function to get active session for an address
const getActiveSession = async (address: string): Promise<SessionTypes.Struct> => {
  const walletKit = await getWalletKit();
  const sessions = walletKit.getActiveSessions();
  const session = Object.values(sessions).find((s: SessionTypes.Struct) => 
    s.namespaces.eip155.accounts.some((account: string) => 
      account.toLowerCase().includes(address.toLowerCase())
    )
  );
  
  if (!session) {
    throw new Error('No active session found for address');
  }
  
  return session;
};

/**
 * Get transaction history for an address
 */
export const getTransactionHistory = async (
  address: string,
  network: Network = Network.ETH_MAINNET
): Promise<Transaction[]> => {
  try {
    const alchemy = getAlchemyInstance(network);
    const response = await alchemy.core.getAssetTransfers({
      fromAddress: address,
      category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'],
      withMetadata: true
    });

    const transactions = await Promise.all(
      response.transfers.map(async transfer => {
        const tx = await alchemy.core.getTransactionReceipt(transfer.hash);
        if (!tx) return null;

        const transaction: Transaction = {
          hash: transfer.hash,
          from: transfer.from,
          to: transfer.to,
          value: transfer.value?.toString() || '0',
          asset: transfer.asset,
          category: transfer.category,
          timestamp: 0, // Will be updated below
          blockNum: parseInt(transfer.blockNum),
          blockHash: tx.blockHash,
          gasPrice: tx.effectiveGasPrice.toString(),
          gasUsed: tx.gasUsed.toString(),
          gasLimit: '0', // Will be updated below
          nonce: 0, // Will be updated below
          status: tx.status || 0,
          input: '', // Will be updated below
          contractAddress: tx.contractAddress || undefined
        };

        // Get full transaction details
        const fullTx = await alchemy.core.getTransaction(transfer.hash);
        if (fullTx) {
          const block = await alchemy.core.getBlock(fullTx.blockNumber || 0);
          transaction.timestamp = block.timestamp;
          transaction.gasLimit = fullTx.gasLimit.toString();
          transaction.maxFeePerGas = fullTx.maxFeePerGas?.toString();
          transaction.maxPriorityFeePerGas = fullTx.maxPriorityFeePerGas?.toString();
          transaction.nonce = fullTx.nonce;
          transaction.input = fullTx.data;
        }

        return transaction;
      })
    );

    return transactions.filter((tx): tx is Transaction => tx !== null);
  } catch (error) {
    console.error('Failed to fetch transaction history:', error);
    throw error;
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
 * Estimate gas for transaction
 */
export const estimateGas = async (request: TransactionRequest): Promise<GasEstimate> => {
  try {
    if (request.walletType === 'classic') {
      return await estimateClassicWalletGas(request);
    } else {
      return await estimateSmartWalletGas(request);
    }
  } catch (error) {
    console.error('Failed to estimate gas:', error);
    throw error;
  }
};

/**
 * Estimate gas for classic wallet transaction
 */
const estimateClassicWalletGas = async (request: TransactionRequest): Promise<GasEstimate> => {
  try {
    const provider = getProvider();
    const [gasEstimate, feeData] = await Promise.all([
      provider.estimateGas(request),
      provider.getFeeData()
    ]);

    return {
      maxFeePerGas: feeData.maxFeePerGas?.toString() || '0',
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || '0',
      gasLimit: gasEstimate.toString(),
      estimatedCost: ethers.formatEther(gasEstimate * (feeData.maxFeePerGas || BigInt(0)))
    };
  } catch (error) {
    console.error('Failed to estimate gas for classic wallet:', error);
    throw error;
  }
};

/**
 * Estimate gas for smart wallet transaction
 */
const estimateSmartWalletGas = async (request: TransactionRequest): Promise<GasEstimate> => {
  try {
    const walletKit = await getWalletKit();
    const session = await getActiveSession(request.from || '');

    // Get gas estimate from WalletKit
    const gasEstimate = await new Promise<GasEstimate>((resolve, reject) => {
      walletKit.on('session_request', async (event) => {
        const { topic, params, id } = event;
        const { request: req } = params;

        if (req.method === 'eth_estimateGas') {
          try {
            const estimate = await req.params[0];
            const feeData = await getProvider().getFeeData();

            const result: GasEstimate = {
              maxFeePerGas: feeData.maxFeePerGas?.toString() || '0',
              maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || '0',
              gasLimit: estimate,
              estimatedCost: ethers.formatEther(BigInt(estimate) * (feeData.maxFeePerGas || BigInt(0)))
            };

            await walletKit.respondSessionRequest({
              topic,
              response: {
                id,
                result: estimate,
                jsonrpc: '2.0'
              }
            });

            resolve(result);
          } catch (error) {
            reject(error);
          }
        }
      });
    });

    return gasEstimate;
  } catch (error) {
    console.error('Failed to estimate gas for smart wallet:', error);
    throw error;
  }
};

/**
 * Send transaction
 */
export const sendTransaction = async (request: TransactionRequest): Promise<string> => {
  try {
    if (request.walletType === 'classic') {
      return await sendClassicWalletTransaction(request);
    } else {
      return await sendSmartWalletTransaction(request);
    }
  } catch (error) {
    console.error('Failed to send transaction:', error);
    throw error;
  }
};

/**
 * Send transaction using classic wallet
 */
const sendClassicWalletTransaction = async (request: TransactionRequest): Promise<string> => {
  try {
    const provider = getProvider();
    const privateKey = await SecureStore.getItemAsync('walletPrivateKey');
    if (!privateKey) throw new Error('Private key not found');

    const wallet = new ethers.Wallet(privateKey, provider);
    const tx = await wallet.sendTransaction(request);
    return tx.hash;
  } catch (error) {
    console.error('Failed to send classic wallet transaction:', error);
    throw error;
  }
};

/**
 * Send transaction using smart wallet
 */
const sendSmartWalletTransaction = async (request: TransactionRequest): Promise<string> => {
  try {
    const walletKit = await getWalletKit();
    const session = await getActiveSession(request.from || '');

    const txHash = await new Promise<string>((resolve, reject) => {
      walletKit.on('session_request', async (event) => {
        const { topic, params, id } = event;
        const { request: req } = params;

        if (req.method === 'eth_sendTransaction') {
          try {
            const hash = await req.params[0];
            await walletKit.respondSessionRequest({
              topic,
              response: {
                id,
                result: hash,
                jsonrpc: '2.0'
              }
            });
            resolve(hash);
          } catch (error) {
            reject(error);
          }
        }
      });
    });

    return txHash;
  } catch (error) {
    console.error('Failed to send smart wallet transaction:', error);
    throw error;
  }
}; 