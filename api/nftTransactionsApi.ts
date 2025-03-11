import '@walletconnect/react-native-compat';
import { Alchemy, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import { Core } from '@walletconnect/core';
import { WalletKit } from '@reown/walletkit';
import type { SessionTypes } from '@walletconnect/types';
import config from './config';

export interface NFTTransferParams {
  contractAddress: string;
  tokenId: string;
  toAddress: string;
  fromAddress: string;
  walletType: 'classic' | 'smart';
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

const getWalletKitInstance = async (): Promise<Awaited<ReturnType<typeof WalletKit.init>>> => {
  if (!walletKitInstance) {
    const core = new Core({
      projectId: config.projectIds.reown
    });

    walletKitInstance = await WalletKit.init({
      core,
      metadata: {
        name: 'Reown Wallet',
        description: 'Reown Smart Wallet',
        url: 'https://reown.com',
        icons: ['https://your_wallet_icon.png'],
        redirect: {
          native: 'reownwallet://'
        }
      }
    });
  }
  return walletKitInstance;
};

// Helper function to generate ERC721 transfer data
const generateERC721TransferData = (from: string, to: string, tokenId: string): string => {
  const transferFunctionSignature = '0x23b872dd'; // transferFrom(address,address,uint256)
  const params = [
    from.slice(2).padStart(64, '0'),
    to.slice(2).padStart(64, '0'),
    BigInt(tokenId).toString(16).padStart(64, '0'),
  ];
  return transferFunctionSignature + params.join('');
};

// Classic wallet gas estimation
const estimateClassicWalletGas = async (params: NFTTransferParams): Promise<string> => {
  const provider = getProvider();
  
  try {
    // Create transaction object for gas estimation
    const txObject = {
      to: params.contractAddress,
      from: params.fromAddress,
      data: generateERC721TransferData(params.fromAddress, params.toAddress, params.tokenId),
      value: '0x0'
    };

    // Get gas estimate and current gas price
    const [gasEstimate, feeData] = await Promise.all([
      provider.estimateGas(txObject),
      provider.getFeeData()
    ]);

    // Calculate total cost in ETH
    const totalCost = gasEstimate * (feeData.gasPrice || BigInt(0));
    return ethers.formatEther(totalCost);
  } catch (error) {
    console.error('Classic wallet gas estimation error:', error);
    throw new Error('Failed to estimate gas for classic wallet NFT transfer');
  }
};

// Helper function to get active session for an address
const getActiveSession = async (address: string): Promise<SessionTypes.Struct> => {
  const walletKit = await getWalletKitInstance();
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

// Smart wallet gas estimation using Reown
const estimateSmartWalletGas = async (params: NFTTransferParams): Promise<string> => {
  try {
    const walletKit = await getWalletKitInstance();
    const session = await getActiveSession(params.fromAddress);
    
    // Create transaction data for gas estimation
    const txData = {
      to: params.contractAddress,
      from: params.fromAddress,
      data: generateERC721TransferData(params.fromAddress, params.toAddress, params.tokenId),
      value: '0x0'
    };

    // Get gas estimate from WalletKit
    await walletKit.on('session_request', async (event) => {
      const { topic, params, id } = event;
      const { request } = params;
      
      if (request.method === 'eth_estimateGas') {
        const gasEstimate = await request.params[0];
        await walletKit.respondSessionRequest({
          topic,
          response: {
            id,
            result: gasEstimate,
            jsonrpc: '2.0'
          }
        });
        return ethers.formatEther(BigInt(gasEstimate));
      }
    });

    return '0'; // Default return if no gas estimate is received
  } catch (error) {
    console.error('Smart wallet gas estimation error:', error);
    throw new Error('Failed to estimate gas for smart wallet NFT transfer');
  }
};

export const estimateNFTTransferGas = async (params: NFTTransferParams): Promise<string> => {
  try {
    if (params.walletType === 'classic') {
      return await estimateClassicWalletGas(params);
    } else {
      return await estimateSmartWalletGas(params);
    }
  } catch (error) {
    console.error('Error estimating gas:', error);
    throw new Error('Failed to estimate gas for NFT transfer');
  }
};

// Classic wallet transfer
const transferNFTClassic = async (params: NFTTransferParams): Promise<string> => {
  const provider = getProvider();
  
  try {
    // Get nonce and fee data for the transaction
    const [nonce, feeData] = await Promise.all([
      provider.getTransactionCount(params.fromAddress),
      provider.getFeeData()
    ]);
    
    // Create transaction object
    const transaction = {
      to: params.contractAddress,
      from: params.fromAddress,
      nonce: nonce,
      data: generateERC721TransferData(params.fromAddress, params.toAddress, params.tokenId),
      gasPrice: feeData.gasPrice,
      gasLimit: ethers.parseUnits('250000', 'wei'), // Safe gas limit for NFT transfers
    };

    // Create a wallet instance to sign and send the transaction
    const privateKey = await SecureStore.getItemAsync('privateKey');
    if (!privateKey) {
      throw new Error('Private key not found');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const tx = await wallet.sendTransaction(transaction);
    return tx.hash;
  } catch (error) {
    console.error('Classic wallet transfer error:', error);
    throw new Error('Failed to transfer NFT using classic wallet');
  }
};

// Smart wallet transfer using Reown
const transferNFTSmart = async (params: NFTTransferParams): Promise<string> => {
  try {
    const walletKit = await getWalletKitInstance();
    const session = await getActiveSession(params.fromAddress);
    
    // Create transaction data for NFT transfer
    const txData = {
      to: params.contractAddress,
      from: params.fromAddress,
      data: generateERC721TransferData(params.fromAddress, params.toAddress, params.tokenId),
      value: '0x0'
    };

    // Execute NFT transfer using WalletKit
    let txHash: string = '';
    await walletKit.on('session_request', async (event) => {
      const { topic, params, id } = event;
      const { request } = params;
      
      if (request.method === 'eth_sendTransaction') {
        txHash = await request.params[0];
        await walletKit.respondSessionRequest({
          topic,
          response: {
            id,
            result: txHash,
            jsonrpc: '2.0'
          }
        });
      }
    });

    if (!txHash) {
      throw new Error('Transaction hash not received');
    }

    return txHash;
  } catch (error) {
    console.error('Smart wallet transfer error:', error);
    throw new Error('Failed to transfer NFT using smart wallet');
  }
};

export const transferNFT = async (params: NFTTransferParams): Promise<string> => {
  try {
    if (params.walletType === 'classic') {
      return await transferNFTClassic(params);
    } else {
      return await transferNFTSmart(params);
    }
  } catch (error) {
    console.error('Error transferring NFT:', error);
    throw new Error('Failed to transfer NFT');
  }
}; 