import { Alchemy, Network } from 'alchemy-sdk';
import type { NftMetadataResponse } from 'alchemy-sdk';
import { ethers } from 'ethers';
import { WalletKit } from '@reown/walletkit';
import { Core } from '@walletconnect/core';
import * as SecureStore from 'expo-secure-store';
import { getAlchemyInstance, getProvider } from './alchemyApi';
import config from './config';
import { getWalletKit } from './walletApi';

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
  animation_url?: string;
}

export interface NFT {
  id: string;
  contract: {
    address: string;
    name?: string;
    symbol?: string;
  };
  tokenId: string;
  title: string;
  description: string;
  metadata: NFTMetadata;
  media: Array<{
    gateway: string;
    raw: string;
  }>;
}

export interface NFTsResponse {
  ownedNfts: NFT[];
  totalCount: number;
  pageKey?: string;
}

let walletKitInstance: Awaited<ReturnType<typeof WalletKit.init>> | null = null;

/**
 * Fetch NFTs owned by an address
 */
export const getNFTs = async (
  address: string,
  pageKey?: string,
  pageSize: number = 100
): Promise<NFTsResponse> => {
  try {
    const alchemy = getAlchemyInstance();
    const response = await alchemy.nft.getNftsForOwner(address, {
      pageKey,
      pageSize,
      omitMetadata: false
    });

    return {
      ownedNfts: response.ownedNfts.map(nft => ({
        ...nft,
        id: `${nft.contract.address}-${nft.tokenId}`,
        metadata: {
          name: nft.rawMetadata?.name || nft.title,
          description: nft.rawMetadata?.description || nft.description,
          image: nft.rawMetadata?.image || nft.media[0]?.gateway || '',
          attributes: nft.rawMetadata?.attributes,
          external_url: nft.rawMetadata?.external_url,
          animation_url: nft.rawMetadata?.animation_url
        }
      })),
      totalCount: response.totalCount,
      pageKey: response.pageKey
    };
  } catch (error) {
    console.error('Failed to fetch NFTs:', {
      address,
      pageKey,
      pageSize,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Get NFT metadata
 */
export const getNFTMetadata = async (
  contractAddress: string,
  tokenId: string
): Promise<NFT> => {
  try {
    const alchemy = getAlchemyInstance();
    const nft = await alchemy.nft.getNftMetadata(contractAddress, tokenId);

    return {
      ...nft,
      id: `${contractAddress}-${tokenId}`,
      metadata: {
        name: nft.rawMetadata?.name || nft.title,
        description: nft.rawMetadata?.description || nft.description,
        image: nft.rawMetadata?.image || nft.media[0]?.gateway || '',
        attributes: nft.rawMetadata?.attributes,
        external_url: nft.rawMetadata?.external_url,
        animation_url: nft.rawMetadata?.animation_url
      }
    };
  } catch (error) {
    console.error('Failed to fetch NFT metadata:', {
      contractAddress,
      tokenId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Get NFT transfer history
 */
export const getNFTTransfers = async (
  address: string,
  contractAddress?: string
) => {
  try {
    const alchemy = getAlchemyInstance();
    const response = await alchemy.core.getAssetTransfers({
      fromAddress: address,
      category: ['erc721', 'erc1155'],
      withMetadata: true,
      contractAddresses: contractAddress ? [contractAddress] : undefined
    });

    return response.transfers;
  } catch (error) {
    console.error('Failed to fetch NFT transfers:', {
      address,
      contractAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Get NFT floor price
 */
export const getNFTFloorPrice = async (contractAddress: string) => {
  try {
    const alchemy = getAlchemyInstance();
    const response = await alchemy.nft.getFloorPrice(contractAddress);
    return response;
  } catch (error) {
    console.error('Failed to fetch NFT floor price:', {
      contractAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Estimate gas for NFT transfer
 */
export const estimateNFTTransferGas = async (
  contractAddress: string,
  tokenId: string,
  fromAddress: string,
  toAddress: string,
  walletType: 'classic' | 'smart'
) => {
  try {
    if (walletType === 'smart') {
      const walletKit = await getWalletKit();
      // Smart wallet gas estimation logic here
      throw new Error('Smart wallet gas estimation not implemented yet');
    } else {
      const provider = getProvider();
      const nftContract = new ethers.Contract(
        contractAddress,
        ['function transferFrom(address from, address to, uint256 tokenId)'],
        provider
      );

      const gasEstimate = await nftContract.transferFrom.estimateGas(
        fromAddress,
        toAddress,
        tokenId
      );

      return gasEstimate;
    }
  } catch (error) {
    console.error('Failed to estimate NFT transfer gas:', {
      contractAddress,
      tokenId,
      fromAddress,
      toAddress,
      walletType,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}; 