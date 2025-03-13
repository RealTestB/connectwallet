import '@walletconnect/react-native-compat';
import { Alchemy, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import { WalletKit } from '@reown/walletkit';
import config from './config';
import { REOWN_PROJECT_ID } from '@env';

export interface NFTTransferParams {
  contractAddress: string;
  tokenId: string;
  toAddress: string;
  fromAddress: string;
  walletType: 'classic' | 'smart';
}

let alchemyInstance: Alchemy | null = null;
let walletKitInstance: WalletKit | null = null;
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

const getWalletKitInstance = async (): Promise<WalletKit> => {
  if (!walletKitInstance) {
    walletKitInstance = await WalletKit.init({
      projectId: REOWN_PROJECT_ID,
      metadata: {
        name: 'Wallet App',
        description: 'Secure Wallet Application',
        url: 'https://yourapp.com',
        icons: ['https://yourapp.com/icon.png'],
        redirect: {
          native: 'walletapp://',
          universal: 'https://yourapp.com'
        }
      }
    });
  }
  return walletKitInstance;
};

// Helper function to generate ERC721 transfer data
const generateERC721TransferData = (tokenId: string, contractAddress: string): string => {
  try {
    console.log('[NFTTransactions] Generating ERC721 transfer data:', { tokenId, contractAddress });
    const transferFunctionSignature = '0x23b872dd';
    const tokenIdHex = BigInt(tokenId).toString(16).padStart(64, '0');
    const result = `${transferFunctionSignature}${tokenIdHex}`;
    console.log('[NFTTransactions] Generated transfer data:', result);
    return result;
  } catch (error) {
    console.error('[NFTTransactions] Error generating ERC721 transfer data:', {
      tokenId,
      contractAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

// Classic wallet gas estimation
const estimateClassicWalletGas = async (params: NFTTransferParams): Promise<string> => {
  console.log('[NFTTransactions] Estimating classic wallet gas:', params);
  const provider = getProvider();
  
  try {
    const txObject = {
      to: params.contractAddress,
      from: params.fromAddress,
      data: generateERC721TransferData(params.tokenId, params.contractAddress),
      value: '0x0'
    };
    console.log('[NFTTransactions] Created transaction object for gas estimation:', txObject);

    const [gasEstimate, feeData] = await Promise.all([
      provider.estimateGas(txObject),
      provider.getFeeData()
    ]);
    console.log('[NFTTransactions] Gas estimation results:', {
      gasEstimate: gasEstimate.toString(),
      gasPrice: feeData.gasPrice?.toString()
    });

    const totalCost = gasEstimate * (feeData.gasPrice || BigInt(0));
    const formattedCost = ethers.formatEther(totalCost);
    console.log('[NFTTransactions] Calculated total cost:', formattedCost);
    return formattedCost;
  } catch (error) {
    console.error('[NFTTransactions] Classic wallet gas estimation error:', {
      params,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to estimate gas for classic wallet NFT transfer');
  }
};

// Smart wallet gas estimation using Reown
const estimateSmartWalletGas = async (params: NFTTransferParams): Promise<string> => {
  console.log('[NFTTransactions] Estimating smart wallet gas:', params);
  try {
    const provider = getProvider();
    const txObject = {
      to: params.contractAddress,
      from: params.fromAddress,
      data: generateERC721TransferData(params.tokenId, params.contractAddress),
      value: '0x0'
    };
    console.log('[NFTTransactions] Created transaction object for smart wallet gas estimation:', txObject);

    const gasEstimate = await provider.estimateGas(txObject);
    const result = ethers.formatEther(gasEstimate);
    console.log('[NFTTransactions] Smart wallet gas estimate:', result);
    return result;
  } catch (error) {
    console.error('[NFTTransactions] Smart wallet gas estimation error:', {
      params,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to estimate gas for smart wallet NFT transfer');
  }
};

// Classic wallet transfer
const transferNFTClassic = async (params: NFTTransferParams): Promise<string> => {
  console.log('[NFTTransactions] Starting classic NFT transfer:', params);
  const provider = getProvider();
  
  try {
    const [nonce, feeData] = await Promise.all([
      provider.getTransactionCount(params.fromAddress),
      provider.getFeeData()
    ]);
    console.log('[NFTTransactions] Got transaction details:', { nonce, gasPrice: feeData.gasPrice?.toString() });
    
    const transaction = {
      to: params.contractAddress,
      from: params.fromAddress,
      nonce: nonce,
      data: generateERC721TransferData(params.tokenId, params.contractAddress),
      gasPrice: feeData.gasPrice,
      gasLimit: ethers.parseUnits('250000', 'wei')
    };
    console.log('[NFTTransactions] Created classic transfer transaction:', transaction);

    const privateKey = await SecureStore.getItemAsync('privateKey');
    if (!privateKey) {
      console.error('[NFTTransactions] Private key not found in secure storage');
      throw new Error('Private key not found');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('[NFTTransactions] Created wallet instance for address:', wallet.address);
    
    const tx = await wallet.sendTransaction(transaction);
    console.log('[NFTTransactions] Classic transfer transaction sent:', tx.hash);
    return tx.hash;
  } catch (error) {
    console.error('[NFTTransactions] Classic wallet transfer error:', {
      params,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to transfer NFT using classic wallet');
  }
};

// Smart wallet transfer using Reown
const transferNFTSmart = async (params: NFTTransferParams): Promise<string> => {
  console.log('[NFTTransactions] Starting smart NFT transfer:', params);
  try {
    const walletKit = await getWalletKitInstance();
    const provider = getProvider();
    console.log('[NFTTransactions] Got wallet instances');
    
    const txData = {
      to: params.contractAddress,
      from: params.fromAddress,
      data: generateERC721TransferData(params.tokenId, params.contractAddress),
      value: '0x0'
    };
    console.log('[NFTTransactions] Created smart transfer transaction data:', txData);

    const smartWalletKey = await SecureStore.getItemAsync('smartWalletKey');
    if (!smartWalletKey) {
      console.error('[NFTTransactions] Smart wallet key not found');
      throw new Error('Smart wallet key not found');
    }

    const wallet = new ethers.Wallet(smartWalletKey, provider);
    console.log('[NFTTransactions] Created smart wallet instance for address:', wallet.address);
    
    const tx = await wallet.sendTransaction(txData);
    console.log('[NFTTransactions] Smart transfer transaction sent:', tx.hash);
    return tx.hash;
  } catch (error) {
    console.error('[NFTTransactions] Smart wallet transfer error:', {
      params,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to transfer NFT using smart wallet');
  }
};

// NFT-specific functions using Alchemy API
export const getNFTMetadata = async (contractAddress: string, tokenId: string): Promise<any> => {
  console.log('[NFTTransactions] Fetching NFT metadata:', { contractAddress, tokenId });
  try {
    const alchemy = getAlchemyInstance();
    const response = await alchemy.nft.getNftMetadata(contractAddress, tokenId);
    console.log('[NFTTransactions] Successfully fetched NFT metadata');
    return response;
  } catch (error) {
    console.error('[NFTTransactions] Error fetching NFT metadata:', {
      contractAddress,
      tokenId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to fetch NFT metadata');
  }
};

export const getOwnedNFTs = async (ownerAddress: string): Promise<any> => {
  console.log('[NFTTransactions] Fetching owned NFTs for address:', ownerAddress);
  try {
    const alchemy = getAlchemyInstance();
    const nfts = await alchemy.nft.getNftsForOwner(ownerAddress);
    console.log('[NFTTransactions] Successfully fetched owned NFTs:', { count: nfts.ownedNfts.length });
    return nfts;
  } catch (error) {
    console.error('[NFTTransactions] Error fetching owned NFTs:', {
      ownerAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to fetch owned NFTs');
  }
};

export const verifyNFTOwnership = async (contractAddress: string, tokenId: string, ownerAddress: string): Promise<boolean> => {
  console.log('[NFTTransactions] Verifying NFT ownership:', { contractAddress, tokenId, ownerAddress });
  try {
    const alchemy = getAlchemyInstance();
    const nfts = await alchemy.nft.getNftsForOwner(ownerAddress, {
      contractAddresses: [contractAddress]
    });
    const isOwner = nfts.ownedNfts.some(nft => 
      nft.tokenId === tokenId && 
      nft.contract.address.toLowerCase() === contractAddress.toLowerCase()
    );
    console.log('[NFTTransactions] Ownership verification result:', { isOwner });
    return isOwner;
  } catch (error) {
    console.error('[NFTTransactions] Error verifying NFT ownership:', {
      contractAddress,
      tokenId,
      ownerAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to verify NFT ownership');
  }
};

export const getNFTTransferHistory = async (contractAddress: string, tokenId: string, ownerAddress: string): Promise<any> => {
  console.log('[NFTTransactions] Fetching NFT transfer history:', { contractAddress, tokenId, ownerAddress });
  try {
    const alchemy = getAlchemyInstance();
    const transfers = await alchemy.core.getAssetTransfers({
      fromBlock: "0x0",
      toBlock: "latest",
      fromAddress: ownerAddress,
      contractAddresses: [contractAddress],
      category: ["erc721"],
      withMetadata: true,
      excludeZeroValue: true,
      maxCount: 1000
    });
    
    const filteredTransfers = tokenId ? 
      transfers.transfers.filter(t => t.tokenId === tokenId) : 
      transfers.transfers;
    
    console.log('[NFTTransactions] Successfully fetched transfer history:', {
      totalTransfers: transfers.transfers.length,
      filteredTransfers: filteredTransfers.length
    });
    
    return filteredTransfers;
  } catch (error) {
    console.error('[NFTTransactions] Error fetching NFT transfer history:', {
      contractAddress,
      tokenId,
      ownerAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to fetch NFT transfer history');
  }
};

// Enhance the existing transfer function with ownership verification
export const transferNFT = async (params: NFTTransferParams): Promise<string> => {
  console.log('[NFTTransactions] Starting NFT transfer process:', params);
  try {
    console.log('[NFTTransactions] Verifying ownership before transfer');
    const isOwner = await verifyNFTOwnership(
      params.contractAddress,
      params.tokenId,
      params.fromAddress
    );

    if (!isOwner) {
      console.error('[NFTTransactions] Ownership verification failed');
      throw new Error('Sender does not own this NFT');
    }
    console.log('[NFTTransactions] Ownership verified successfully');

    let txHash;
    if (params.walletType === 'classic') {
      console.log('[NFTTransactions] Using classic wallet transfer');
      txHash = await transferNFTClassic(params);
    } else {
      console.log('[NFTTransactions] Using smart wallet transfer');
      txHash = await transferNFTSmart(params);
    }
    
    console.log('[NFTTransactions] Transfer completed successfully:', txHash);
    return txHash;
  } catch (error) {
    console.error('[NFTTransactions] Error in NFT transfer:', {
      params,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

export const generateERC721TransferTransaction = async (
  from: string,
  to: string,
  tokenId: string,
  contractAddress: string,
  chainId: number
): Promise<any> => {
  console.log('[NFTTransactions] Generating ERC721 transfer transaction:', {
    from,
    to,
    tokenId,
    contractAddress,
    chainId
  });
  
  try {
    if (!from || !to) {
      console.error('[NFTTransactions] Missing required addresses');
      throw new Error('From and To addresses are required');
    }

    const formattedFrom = from.startsWith('0x') ? from.slice(2) : from;
    const formattedTo = to.startsWith('0x') ? to.slice(2) : to;
    console.log('[NFTTransactions] Formatted addresses:', { formattedFrom, formattedTo });

    const txData = {
      from: `0x${formattedFrom}`,
      to: contractAddress,
      data: generateERC721TransferData(tokenId, contractAddress),
      chainId
    };
    console.log('[NFTTransactions] Created transaction data:', txData);

    const provider = getProvider();
    const gasEstimate = await provider.estimateGas(txData);
    console.log('[NFTTransactions] Got gas estimate:', gasEstimate.toString());

    const finalTxData = {
      ...txData,
      gas: gasEstimate.toString()
    };
    console.log('[NFTTransactions] Final transaction data:', finalTxData);
    return finalTxData;
  } catch (error) {
    console.error('[NFTTransactions] Error generating ERC721 transfer transaction:', {
      from,
      to,
      tokenId,
      contractAddress,
      chainId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

export const sendTransaction = async (txData: any): Promise<string> => {
  console.log('[NFTTransactions] Sending transaction:', txData);
  try {
    const provider = getProvider();
    const privateKey = await SecureStore.getItemAsync('privateKey');
    if (!privateKey) {
      console.error('[NFTTransactions] Private key not found');
      throw new Error('Private key not found');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('[NFTTransactions] Created wallet instance for address:', wallet.address);
    
    const tx = await wallet.sendTransaction(txData);
    console.log('[NFTTransactions] Transaction sent successfully:', tx.hash);
    return tx.hash;
  } catch (error) {
    console.error('[NFTTransactions] Error sending transaction:', {
      txData,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}; 