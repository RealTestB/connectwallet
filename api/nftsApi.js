import Constants from 'expo-constants';
import config from './config';

const ALCHEMY_ETH_MAINNET_KEY = Constants.expoConfig.extra.ALCHEMY_ETH_MAINNET_KEY;

export { ALCHEMY_ETH_MAINNET_KEY };

/**
 * ✅ Get User NFTs with pagination support
 */
export const getUserNFTs = async (address, network, page = 1, pageSize = 20) => {
    try {
        // For now, we're only supporting Ethereum mainnet
        if (network !== 1) {
            return {
                nfts: [],
                error: "Only Ethereum mainnet is supported currently"
            };
        }

        const nfts = await fetchAlchemyNFTs(address);
        
        // Apply pagination
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paginatedNfts = nfts.slice(start, end);

        // Transform the data to match our app's format
        const formattedNfts = await Promise.all(paginatedNfts.map(async (nft) => {
            const metadata = await fetchNFTMetadata(nft.contract.address, nft.tokenId);
            return {
                tokenId: nft.tokenId,
                name: metadata.title || `NFT #${nft.tokenId}`,
                collection: nft.contract.name || "Unknown Collection",
                image: metadata.media[0]?.gateway || "https://via.placeholder.com/300",
                chain: "Ethereum",
                owner: address,
                contract: nft.contract.address,
                explorerUrl: `https://etherscan.io/token/${nft.contract.address}?a=${nft.tokenId}`,
                traits: metadata.metadata?.attributes || []
            };
        }));

        return {
            nfts: formattedNfts,
            error: null
        };
    } catch (error) {
        console.error("Failed to fetch user NFTs:", error);
        return {
            nfts: [],
            error: "Failed to fetch NFTs"
        };
    }
};

/**
 * ✅ Fetch NFTs Owned by a Wallet (Alchemy API)
 */
export const fetchAlchemyNFTs = async (walletAddress) => {
    try {
        const response = await fetch(
            `https://eth-mainnet.g.alchemy.com/v2/${config.alchemy.mainnetKey}/getNFTs/?owner=${walletAddress}`
        );
        const data = await response.json();
        return data.ownedNfts || [];
    } catch (error) {
        console.error("Failed to fetch Alchemy NFTs:", error);
        return [];
    }
};

/**
 * ✅ Fetch NFT Metadata (Name, Image, Attributes, Description)
 */
export const fetchNFTMetadata = async (contractAddress, tokenId) => {
    try {
        const response = await fetch(
            `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_ETH_MAINNET_KEY}/getNFTMetadata/?contractAddress=${contractAddress}&tokenId=${tokenId}`
        );
        const data = await response.json();
        return data || {};
    } catch (error) {
        console.error("Failed to fetch NFT metadata:", error);
        return {};
    }
};

/**
 * ✅ Fetch NFT Transaction History
 */
export const fetchNFTHistory = async (contractAddress, tokenId) => {
    try {
        const response = await fetch(
            `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_ETH_MAINNET_KEY}/getNFTTransfers/?contractAddress=${contractAddress}&tokenId=${tokenId}`
        );
        const data = await response.json();
        return data.transfers || [];
    } catch (error) {
        console.error("Failed to fetch NFT history:", error);
        return [];
    }
};

