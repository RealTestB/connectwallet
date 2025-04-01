import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import { getProvider } from './provider';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { makeAlchemyRequest } from './alchemyApi';

export interface NFTTransferParams {
  contractAddress: string;
  tokenId: string;
  toAddress: string;
  fromAddress: string;
  tokenType: 'ERC721' | 'ERC1155';
}

// Helper function to generate ERC721 transfer data
const generateERC721TransferData = (tokenId: string, fromAddress: string, toAddress: string): string => {
  try {
    console.log('[NFTTransactions] Generating ERC721 transfer data:', { tokenId, fromAddress, toAddress });
    
    // Function signature for transferFrom(address,address,uint256)
    const transferFunctionSignature = '0x23b872dd';
    
    // Ensure addresses have 0x prefix and are lowercase
    const formattedFromAddress = fromAddress.startsWith('0x') ? fromAddress.toLowerCase() : `0x${fromAddress.toLowerCase()}`;
    const formattedToAddress = toAddress.startsWith('0x') ? toAddress.toLowerCase() : `0x${toAddress.toLowerCase()}`;
    
    // Remove 0x prefix and pad addresses to 32 bytes (64 characters)
    const fromAddressPadded = formattedFromAddress.slice(2).padStart(64, '0');
    const toAddressPadded = formattedToAddress.slice(2).padStart(64, '0');
    
    // Convert tokenId to hex and pad to 32 bytes (64 characters)
    const tokenIdPadded = BigInt(tokenId).toString(16).padStart(64, '0');
    
    // Construct the data string
    const result = `${transferFunctionSignature}${fromAddressPadded}${toAddressPadded}${tokenIdPadded}`;
    
    console.log('[NFTTransactions] Generated ERC721 transfer data:', result);
    return result;
  } catch (error) {
    console.error('[NFTTransactions] Error generating ERC721 transfer data:', {
      tokenId,
      fromAddress,
      toAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to generate ERC721 transfer data');
  }
};

// Helper function to generate ERC1155 transfer data
const generateERC1155TransferData = (tokenId: string, fromAddress: string, toAddress: string, amount: string = '1'): string => {
  try {
    console.log('[NFTTransactions] Generating ERC1155 transfer data:', { tokenId, fromAddress, toAddress, amount });
    
    // Function signature for safeTransferFrom(address,address,uint256,uint256,bytes)
    const transferFunctionSignature = '0xf242432a';
    
    // Ensure addresses have 0x prefix and are lowercase
    const formattedFromAddress = fromAddress.startsWith('0x') ? fromAddress.toLowerCase() : `0x${fromAddress.toLowerCase()}`;
    const formattedToAddress = toAddress.startsWith('0x') ? toAddress.toLowerCase() : `0x${toAddress.toLowerCase()}`;
    
    // Remove 0x prefix and pad addresses to 32 bytes (64 characters)
    const fromAddressPadded = formattedFromAddress.slice(2).padStart(64, '0');
    const toAddressPadded = formattedToAddress.slice(2).padStart(64, '0');
    
    // Convert tokenId and amount to hex and pad to 32 bytes (64 characters)
    const tokenIdPadded = BigInt(tokenId).toString(16).padStart(64, '0');
    const amountPadded = BigInt(amount).toString(16).padStart(64, '0');
    
    // Empty bytes for data parameter
    const dataPadded = '00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000';
    
    // Construct the data string
    const result = `${transferFunctionSignature}${fromAddressPadded}${toAddressPadded}${tokenIdPadded}${amountPadded}${dataPadded}`;
    
    console.log('[NFTTransactions] Generated ERC1155 transfer data:', result);
    return result;
  } catch (error) {
    console.error('[NFTTransactions] Error generating ERC1155 transfer data:', {
      tokenId,
      fromAddress,
      toAddress,
      amount,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to generate ERC1155 transfer data');
  }
};

/**
 * Estimate gas for NFT transfer
 */
export const estimateNFTTransferGas = async (params: NFTTransferParams): Promise<{ gasLimit: bigint; gasPrice: bigint }> => {
  console.log('[NFTTransactions] Estimating gas for NFT transfer:', params);
  try {
    // Generate the transfer data based on token type
    const data = params.tokenType === 'ERC721' 
      ? generateERC721TransferData(params.tokenId, params.fromAddress, params.toAddress)
      : generateERC1155TransferData(params.tokenId, params.fromAddress, params.toAddress);

    // Log the exact parameters being sent
    const estimateParams = {
      from: params.fromAddress,
      to: params.contractAddress,
      data
    };
    console.log('[NFTTransactions] Sending eth_estimateGas with params:', estimateParams);

    // Make both API calls in parallel
    const [gasPriceResponse, gasLimitResponse] = await Promise.all([
      makeAlchemyRequest('eth_gasPrice', []),
      makeAlchemyRequest('eth_estimateGas', [estimateParams])
    ]);

    const gasPrice = BigInt(gasPriceResponse);
    const gasLimit = BigInt(gasLimitResponse);

    console.log('[NFTTransactions] Gas estimation result:', {
      gasLimit: gasLimit.toString(),
      gasPrice: gasPrice.toString()
    });

    return { gasLimit, gasPrice };
  } catch (error) {
    console.error('[NFTTransactions] Error estimating gas:', {
      params,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to estimate gas for NFT transfer');
  }
};

/**
 * Transfer NFT
 */
export const transferNFT = async (params: NFTTransferParams): Promise<string> => {
  console.log('[NFTTransactions] Initiating NFT transfer:', params);
  try {
    const provider = getProvider();
    const privateKey = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_PRIVATE_KEY);
    if (!privateKey) throw new Error('Private key not found');

    const wallet = new ethers.Wallet(privateKey, provider);

    // Get the current nonce
    const nonceResponse = await makeAlchemyRequest('eth_getTransactionCount', [
      params.fromAddress,
      'latest'
    ]);
    const nonce = parseInt(nonceResponse, 16);

    // Get gas price and estimate gas limit
    const { gasLimit, gasPrice } = await estimateNFTTransferGas(params);

    // Generate the transfer data
    const data = params.tokenType === 'ERC721' 
      ? generateERC721TransferData(params.tokenId, params.fromAddress, params.toAddress)
      : generateERC1155TransferData(params.tokenId, params.fromAddress, params.toAddress);

    // Create and sign the transaction
    const tx = await wallet.sendTransaction({
      from: params.fromAddress,
      to: params.contractAddress,
      nonce,
      gasLimit,
      gasPrice,
      data
    });

    console.log('[NFTTransactions] Transaction sent:', {
      hash: tx.hash,
      params
    });

    return tx.hash;
  } catch (error) {
    console.error('[NFTTransactions] Error transferring NFT:', {
      params,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to transfer NFT');
  }
}; 