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
  const transferFunctionSignature = '0x23b872dd'; // transferFrom(address,address,uint256)
  const tokenIdHex = BigInt(tokenId).toString(16).padStart(64, '0');
  return `${transferFunctionSignature}${tokenIdHex}`;
};

// Classic wallet gas estimation
const estimateClassicWalletGas = async (params: NFTTransferParams): Promise<string> => {
  const provider = getProvider();
  
  try {
    const txObject = {
      to: params.contractAddress,
      from: params.fromAddress,
      data: generateERC721TransferData(params.tokenId, params.contractAddress),
      value: '0x0'
    };

    const [gasEstimate, feeData] = await Promise.all([
      provider.estimateGas(txObject),
      provider.getFeeData()
    ]);

    const totalCost = gasEstimate * (feeData.gasPrice || BigInt(0));
    return ethers.formatEther(totalCost);
  } catch (error) {
    console.error('Classic wallet gas estimation error:', error);
    throw new Error('Failed to estimate gas for classic wallet NFT transfer');
  }
};

// Smart wallet gas estimation using Reown
const estimateSmartWalletGas = async (params: NFTTransferParams): Promise<string> => {
  try {
    const provider = getProvider();
    const txObject = {
      to: params.contractAddress,
      from: params.fromAddress,
      data: generateERC721TransferData(params.tokenId, params.contractAddress),
      value: '0x0'
    };

    const gasEstimate = await provider.estimateGas(txObject);
    return ethers.formatEther(gasEstimate);
  } catch (error) {
    console.error('Smart wallet gas estimation error:', error);
    throw new Error('Failed to estimate gas for smart wallet NFT transfer');
  }
};

// Classic wallet transfer
const transferNFTClassic = async (params: NFTTransferParams): Promise<string> => {
  const provider = getProvider();
  
  try {
    const [nonce, feeData] = await Promise.all([
      provider.getTransactionCount(params.fromAddress),
      provider.getFeeData()
    ]);
    
    const transaction = {
      to: params.contractAddress,
      from: params.fromAddress,
      nonce: nonce,
      data: generateERC721TransferData(params.tokenId, params.contractAddress),
      gasPrice: feeData.gasPrice,
      gasLimit: ethers.parseUnits('250000', 'wei')
    };

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
    const provider = getProvider();
    
    const txData = {
      to: params.contractAddress,
      from: params.fromAddress,
      data: generateERC721TransferData(params.tokenId, params.contractAddress),
      value: '0x0'
    };

    // For smart wallets, we'll use ethers to send the transaction
    const wallet = new ethers.Wallet(await SecureStore.getItemAsync('smartWalletKey') || '', provider);
    const tx = await wallet.sendTransaction(txData);
    return tx.hash;
  } catch (error) {
    console.error('Smart wallet transfer error:', error);
    throw new Error('Failed to transfer NFT using smart wallet');
  }
};

// NFT-specific functions using Alchemy API
export const getNFTMetadata = async (contractAddress: string, tokenId: string): Promise<any> => {
  try {
    const alchemy = getAlchemyInstance();
    const response = await alchemy.nft.getNftMetadata(contractAddress, tokenId);
    return response;
  } catch (error) {
    console.error('Error fetching NFT metadata:', error);
    throw new Error('Failed to fetch NFT metadata');
  }
};

export const getOwnedNFTs = async (ownerAddress: string): Promise<any> => {
  try {
    const alchemy = getAlchemyInstance();
    const nfts = await alchemy.nft.getNftsForOwner(ownerAddress);
    return nfts;
  } catch (error) {
    console.error('Error fetching owned NFTs:', error);
    throw new Error('Failed to fetch owned NFTs');
  }
};

export const verifyNFTOwnership = async (contractAddress: string, tokenId: string, ownerAddress: string): Promise<boolean> => {
  try {
    const alchemy = getAlchemyInstance();
    // Get all NFTs for the owner and check if they own this specific one
    const nfts = await alchemy.nft.getNftsForOwner(ownerAddress, {
      contractAddresses: [contractAddress]
    });
    return nfts.ownedNfts.some(nft => 
      nft.tokenId === tokenId && 
      nft.contract.address.toLowerCase() === contractAddress.toLowerCase()
    );
  } catch (error) {
    console.error('Error verifying NFT ownership:', error);
    throw new Error('Failed to verify NFT ownership');
  }
};

export const getNFTTransferHistory = async (contractAddress: string, tokenId: string, ownerAddress: string): Promise<any> => {
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
      maxCount: 1000 // Get up to 1000 transfers
    });
    
    // Filter for specific token ID if provided
    return tokenId ? 
      transfers.transfers.filter(t => t.tokenId === tokenId) : 
      transfers.transfers;
  } catch (error) {
    console.error('Error fetching NFT transfer history:', error);
    throw new Error('Failed to fetch NFT transfer history');
  }
};

// Enhance the existing transfer function with ownership verification
export const transferNFT = async (params: NFTTransferParams): Promise<string> => {
  try {
    // Verify ownership before transfer
    const isOwner = await verifyNFTOwnership(
      params.contractAddress,
      params.tokenId,
      params.fromAddress
    );

    if (!isOwner) {
      throw new Error('Sender does not own this NFT');
    }

    if (params.walletType === 'classic') {
      return await transferNFTClassic(params);
    } else {
      return await transferNFTSmart(params);
    }
  } catch (error) {
    console.error('Error transferring NFT:', error);
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
  try {
    if (!from || !to) {
      throw new Error('From and To addresses are required');
    }

    const formattedFrom = from.startsWith('0x') ? from.slice(2) : from;
    const formattedTo = to.startsWith('0x') ? to.slice(2) : to;

    const txData = {
      from: `0x${formattedFrom}`,
      to: contractAddress,
      data: generateERC721TransferData(tokenId, contractAddress),
      chainId
    };

    const provider = getProvider();
    const gasEstimate = await provider.estimateGas(txData);

    return {
      ...txData,
      gas: gasEstimate.toString()
    };
  } catch (error) {
    console.error('Error generating ERC721 transfer data:', error);
    throw error;
  }
};

export const sendTransaction = async (txData: any): Promise<string> => {
  try {
    const provider = getProvider();
    const wallet = new ethers.Wallet(await SecureStore.getItemAsync('privateKey') || '', provider);
    const tx = await wallet.sendTransaction(txData);
    return tx.hash;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
}; 