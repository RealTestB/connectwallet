import { getUserNFTs } from "../api/nftsApi";
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
} from "react-native";

const PAGE_SIZE = 20; // Number of NFTs to load per page

export default function NFTGalleryScreen({ navigation }) {
  const [nfts, setNfts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [networkId, setNetworkId] = useState(1); // Default: Ethereum
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [imageLoadingStates, setImageLoadingStates] = useState({});

  useEffect(() => {
    loadWalletData();
  }, [networkId]);

  const loadWalletData = async () => {
    try {
      const storedWallet = await SecureStore.getItemAsync("walletAddress");
      const storedNetwork = await SecureStore.getItemAsync("networkId");

      if (storedWallet) setWalletAddress(storedWallet);
      if (storedNetwork) setNetworkId(parseInt(storedNetwork));

      if (storedWallet) {
        fetchNFTs(storedWallet, parseInt(storedNetwork));
      }
    } catch (err) {
      console.error("Failed to load wallet data:", err);
      setError("Failed to load wallet data.");
    }
  };

  const fetchNFTs = async (address, network, pageToLoad = 1, isRefresh = false) => {
    try {
      if (pageToLoad === 1) {
        setIsLoading(true);
      }
      
      const data = await getUserNFTs(address, network, pageToLoad, PAGE_SIZE);
      if (data.error) throw new Error(data.error);

      const newNFTs = data.nfts || [];
      setHasMore(newNFTs.length === PAGE_SIZE);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNFTs(walletAddress, networkId, 1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNFTs(walletAddress, networkId, nextPage);
    }
  };

  const handleImageLoad = (tokenId) => {
    setImageLoadingStates(prev => ({
      ...prev,
      [tokenId]: false
    }));
  };

  const handleImageLoadStart = (tokenId) => {
    setImageLoadingStates(prev => ({
      ...prev,
      [tokenId]: true
    }));
  };

  const filteredNFTs = nfts.filter(
    (nft) =>
      nft.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.collection?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderNFTItem = ({ item }) => (
    <TouchableOpacity
      style={styles.nftContainer}
      onPress={() => navigation.navigate("NFTDetailsScreen", { nft: item })}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image || "https://via.placeholder.com/300" }}
          style={styles.nftImage}
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
      <WalletHeader pageName="NFT Gallery" />

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

