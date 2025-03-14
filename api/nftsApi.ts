import { Alchemy, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import config from './config';
import { getProvider } from './provider';

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export interface NFT {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  attributes: NFTAttribute[];
  contract?: {
    address: string;
  };
  title?: string;
  metadata?: {
    name: string;
    description: string;
    image: string;
    attributes: NFTAttribute[];
    external_url?: string;
    animation_url?: string;
  };
  media?: Array<{
    gateway: string;
  }>;
}

let alchemyInstance: Alchemy | null = null;

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
 * Get NFTs owned by an address
 */
export const getOwnedNFTs = async (ownerAddress: string): Promise<NFT[]> => {
  console.log('[NFTsApi] Getting owned NFTs for address:', ownerAddress);
  try {
    const alchemy = getAlchemyInstance();
    const nfts = await alchemy.nft.getNftsForOwner(ownerAddress);
    
    const formattedNFTs = nfts.ownedNfts.map(nft => ({
      contractAddress: nft.contract.address,
      tokenId: nft.tokenId,
      name: nft.title || 'Untitled NFT',
      description: nft.description || '',
      image: nft.media[0]?.gateway || '',
      attributes: nft.rawMetadata?.attributes || [],
      contract: nft.contract,
      title: nft.title,
      metadata: {
        name: nft.rawMetadata?.name || nft.title || 'Untitled NFT',
        description: nft.rawMetadata?.description || nft.description || '',
        image: nft.rawMetadata?.image || nft.media[0]?.gateway || '',
        attributes: nft.rawMetadata?.attributes || [],
        external_url: nft.rawMetadata?.external_url,
        animation_url: nft.rawMetadata?.animation_url
      },
      media: nft.media
    }));

    console.log('[NFTsApi] Found NFTs:', formattedNFTs.length);
    return formattedNFTs;
  } catch (error) {
    console.error('[NFTsApi] Error getting owned NFTs:', {
      ownerAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to get owned NFTs');
  }
};

/**
 * Get NFT metadata
 */
export const getNFTMetadata = async (contractAddress: string, tokenId: string): Promise<NFT> => {
  console.log('[NFTsApi] Getting NFT metadata:', { contractAddress, tokenId });
  try {
    const alchemy = getAlchemyInstance();
    const nft = await alchemy.nft.getNftMetadata(contractAddress, tokenId);
    
    const formattedNFT: NFT = {
      contractAddress: nft.contract.address,
      tokenId: nft.tokenId,
      name: nft.title || 'Untitled NFT',
      description: nft.description || '',
      image: nft.media[0]?.gateway || '',
      attributes: nft.rawMetadata?.attributes || [],
      contract: nft.contract,
      title: nft.title,
      metadata: {
        name: nft.rawMetadata?.name || nft.title || 'Untitled NFT',
        description: nft.rawMetadata?.description || nft.description || '',
        image: nft.rawMetadata?.image || nft.media[0]?.gateway || '',
        attributes: nft.rawMetadata?.attributes || [],
        external_url: nft.rawMetadata?.external_url,
        animation_url: nft.rawMetadata?.animation_url
      },
      media: nft.media
    };

    console.log('[NFTsApi] Found NFT metadata');
    return formattedNFT;
  } catch (error) {
    console.error('[NFTsApi] Error getting NFT metadata:', {
      contractAddress,
      tokenId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to get NFT metadata');
  }
};

/**
 * Get NFT transfer history
 */
export const getNFTTransferHistory = async (ownerAddress: string): Promise<any[]> => {
  console.log('[NFTsApi] Getting NFT transfer history for address:', ownerAddress);
  try {
    const alchemy = getAlchemyInstance();
    const transfers = await alchemy.core.getAssetTransfers({
      fromAddress: ownerAddress,
      category: ['ERC721', 'ERC1155']
    });
    
    console.log('[NFTsApi] Found transfers:', transfers.transfers.length);
    return transfers.transfers;
  } catch (error) {
    console.error('[NFTsApi] Error getting NFT transfer history:', {
      ownerAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to get NFT transfer history');
  }
};

/**
 * Verify NFT ownership
 */
export const verifyNFTOwnership = async (contractAddress: string, tokenId: string, ownerAddress: string): Promise<boolean> => {
  console.log('[NFTsApi] Verifying NFT ownership:', { contractAddress, tokenId, ownerAddress });
  try {
    const alchemy = getAlchemyInstance();
    const nfts = await alchemy.nft.getNftsForOwner(ownerAddress, {
      contractAddresses: [contractAddress]
    });
    
    const isOwner = nfts.ownedNfts.some(nft => 
      nft.tokenId === tokenId && 
      nft.contract.address.toLowerCase() === contractAddress.toLowerCase()
    );
    
    console.log('[NFTsApi] Ownership verification result:', { isOwner });
    return isOwner;
  } catch (error) {
    console.error('[NFTsApi] Error verifying NFT ownership:', {
      contractAddress,
      tokenId,
      ownerAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to verify NFT ownership');
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
  toAddress: string
) => {
  try {
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
  } catch (error) {
    console.error('Failed to estimate NFT transfer gas:', {
      contractAddress,
      tokenId,
      fromAddress,
      toAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}; 