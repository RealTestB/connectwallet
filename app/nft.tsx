import { getNFTs } from "../api/nftsApi";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  ListRenderItem,
  ImageStyle,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { Network } from "alchemy-sdk";

interface NFT {
  tokenId: string;
  name?: string;
  collection?: string;
  image?: string;
  description?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  contractAddress: string;
  owner: string;
  chain: string;
}

interface Account {
  address: string;
  name?: string;
  type: 'classic' | 'smart';
  chainId?: number;
}

type RootStackParamList = {
  NFTDetailsScreen: { nft: NFT };
  NFT: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'NFT'>;

const PAGE_SIZE = 20; // Number of NFTs to load per page

export default function NFTScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();

  const [nfts, setNfts] = useState<NFT[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<Network>(Network.ETH_MAINNET);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadWalletData();
  }, [networkId]);

  const loadWalletData = async (): Promise<void> => {
    try {
      const storedWallet = await SecureStore.getItemAsync("walletAddress");
      const storedNetwork = await SecureStore.getItemAsync("networkId");

      if (storedWallet) setWalletAddress(storedWallet);
      if (storedNetwork) {
        // Convert network ID to Alchemy Network enum
        const networkMap: { [key: string]: Network } = {
          "1": Network.ETH_MAINNET,
          "5": Network.ETH_GOERLI,
          "137": Network.MATIC_MAINNET,
          "80001": Network.MATIC_MUMBAI,
        };
        setNetworkId(networkMap[storedNetwork] || Network.ETH_MAINNET);
      }

      if (storedWallet) {
        fetchNFTs(storedWallet, networkId);
      }
    } catch (err) {
      console.error("Failed to load wallet data:", err);
      setError("Failed to load wallet data.");
    }
  };

  const fetchNFTs = async (
    address: string,
    network: Network,
    pageToLoad: number = 1,
    isRefresh: boolean = false
  ): Promise<void> => {
    try {
      if (pageToLoad === 1) {
        setIsLoading(true);
      }
      
      const pageKey = pageToLoad > 1 ? String(pageToLoad) : undefined;
      const response = await getNFTs(address, pageKey, PAGE_SIZE, network);
      
      if (!response || !response.ownedNfts) {
        throw new Error('Failed to fetch NFTs');
      }

      const newNFTs = response.ownedNfts.map(nft => ({
        tokenId: nft.tokenId,
        name: nft.metadata.name || '',
        collection: nft.contractMetadata?.name || '',
        image: nft.metadata.image || nft.media?.[0]?.gateway || '',
        description: nft.metadata.description || '',
        attributes: nft.metadata.attributes || [],
        contractAddress: nft.contractAddress,
        owner: nft.owner,
        chain: nft.chain
      }));

      setHasMore(!!response.pageKey);

      if (isRefresh || pageToLoad === 1) {
        setNfts(newNFTs);
        setPage(1);
      } else {
        setNfts(prev => [...prev, ...newNFTs]);
      }
    } catch (err) {
      console.error("Failed to load NFTs:", err);
      setError("Could not load your NFTs");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    if (walletAddress) {
      await fetchNFTs(walletAddress, networkId, 1, true);
    }
  };

  const handleLoadMore = (): void => {
    if (!isLoading && hasMore && walletAddress) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNFTs(walletAddress, networkId, nextPage);
    }
  };

  const handleImageLoad = (tokenId: string): void => {
    setImageLoadingStates(prev => ({
      ...prev,
      [tokenId]: false
    }));
  };

  const handleImageLoadStart = (tokenId: string): void => {
    setImageLoadingStates(prev => ({
      ...prev,
      [tokenId]: true
    }));
  };

  const handleAccountChange = (account: Account): void => {
    setWalletAddress(account.address);
    if (account.chainId) {
      // Convert chain ID to Alchemy Network enum
      const networkMap: { [key: number]: Network } = {
        1: Network.ETH_MAINNET,
        5: Network.ETH_GOERLI,
        137: Network.MATIC_MAINNET,
        80001: Network.MATIC_MUMBAI,
      };
      setNetworkId(networkMap[account.chainId] || Network.ETH_MAINNET);
    }
  };

  const filteredNFTs = nfts.filter(
    (nft) =>
      nft.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.collection?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderNFTItem: ListRenderItem<NFT> = ({ item }) => (
    <TouchableOpacity
      style={styles.nftContainer}
      onPress={() => navigation.navigate("NFTDetailsScreen", { nft: item })}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image || "https://via.placeholder.com/300" }}
          style={styles.nftImage as ImageStyle}
          onLoadStart={() => handleImageLoadStart(item.tokenId)}
          onLoad={() => handleImageLoad(item.tokenId)}
        />
        {imageLoadingStates[item.tokenId] && (
          <ActivityIndicator 
            style={styles.imageLoader} 
            color="#6A9EFF" 
            size="small" 
          />
        )}
      </View>
      <Text style={styles.nftCollection}>{item.collection || "Collection"}</Text>
      <Text style={styles.nftToken}>#{item.tokenId}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <WalletHeader 
        pageName="NFT Gallery"
        onAccountChange={handleAccountChange}
      />

      <TextInput
        style={styles.searchInput}
        placeholder="Search NFTs..."
        placeholderTextColor="#6A9EFF"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      {isLoading && page === 1 ? (
        <ActivityIndicator size="large" color="#6A9EFF" style={styles.loader} />
      ) : filteredNFTs.length === 0 ? (
        <Text style={styles.emptyText}>No NFTs found</Text>
      ) : (
        <FlatList
          data={filteredNFTs}
          keyExtractor={(item) => item.tokenId.toString()}
          numColumns={2}
          renderItem={renderNFTItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#6A9EFF"
              colors={["#6A9EFF"]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => (
            isLoading && page > 1 ? (
              <ActivityIndicator color="#6A9EFF" style={styles.footerLoader} />
            ) : null
          )}
        />
      )}

      <BottomNav activeTab="nft" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A2F6C",
    paddingBottom: 60,
  },
  searchInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "white",
    padding: 10,
    margin: 16,
    borderRadius: 10,
  },
  errorText: {
    color: "#FF4B4B",
    textAlign: "center",
    marginTop: 10,
  },
  loader: {
    marginTop: 20,
  },
  footerLoader: {
    marginVertical: 16,
  },
  emptyText: {
    color: "#6A9EFF",
    textAlign: "center",
    marginTop: 20,
  },
  nftContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    margin: 8,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  imageContainer: {
    width: "100%",
    height: 150,
    borderRadius: 10,
    position: "relative",
  },
  nftImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  imageLoader: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  nftCollection: {
    color: "#6A9EFF",
    marginTop: 5,
  },
  nftToken: {
    color: "white",
    fontWeight: "bold",
  },
}); 