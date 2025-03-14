import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator, Dimensions, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WalletHeader from "../components/ui/WalletHeader";
import BottomNav from "../components/ui/BottomNav";

interface NFT {
  id: string;
  token_id: string;
  image_url: string;
  name: string;
  description?: string;
  metadata?: {
    collection?: string;
  };
}

export default function NFTScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        // Here you would make your API call
        // For now, we'll use mock data
        const mockNFTs: NFT[] = [
          {
            id: "1",
            token_id: "8398",
            image_url: "https://i.seadn.io/gae/Ju9CkWtV-1Okvf45wo8UctR-M9He2PjILP0oOvxE89AyiPPGtrR3gysu1Zgy0hjd2xKIgjJJtWIc0ybj4Vd7wv8t3pxDGHoJBzDB?w=500&auto=format",
            name: "Bored Ape #8398",
            metadata: { collection: "Bored Ape Yacht Club" }
          },
          // Add more mock NFTs here
        ];
        setNfts(mockNFTs);
      } catch (err) {
        console.error(err);
        setError("Could not load your NFTs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, []);

  const filteredNFTs = nfts.filter(
    (nft) =>
      nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderNFTItem = ({ item }: { item: NFT }) => (
    <TouchableOpacity
      style={styles.nftCard}
      onPress={() => router.push(`/nft-details?id=${item.id}`)}
    >
      <Image
        source={{ uri: item.image_url }}
        style={styles.nftImage}
      />
      <View style={styles.nftInfo}>
        <Text style={styles.collectionName}>
          {item.metadata?.collection || "Collection"}
        </Text>
        <Text style={styles.tokenId}>#{item.token_id}</Text>
      </View>
    </TouchableOpacity>
  );

  const handleAccountChange = (account: { address: string; chainId?: number }) => {
    // Handle account change
  };

  return (
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
      <WalletHeader 
        pageName="NFT Gallery"
        onAccountChange={handleAccountChange}
      />

      {/* Main Content */}
      <View 
        style={[
          styles.content,
          {
            paddingBottom: 64 + insets.bottom,
          }
        ]}
      >
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search NFTs..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.nftGrid}>
            {[1, 2, 3, 4].map((n) => (
              <View key={n} style={styles.skeletonCard} />
            ))}
          </View>
        ) : filteredNFTs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No NFTs found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredNFTs}
            renderItem={renderNFTItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.nftRow}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <BottomNav activeTab="nft" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 100, // Adjust based on WalletHeader height
  },
  searchContainer: {
    position: "relative",
    marginBottom: 24,
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 40,
    paddingRight: 16,
    color: "white",
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
  },
  nftGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  nftRow: {
    gap: 16,
  },
  skeletonCard: {
    width: (Dimensions.get("window").width - 48) / 2,
    aspectRatio: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
  },
  nftCard: {
    width: (Dimensions.get("window").width - 48) / 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
  },
  nftImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  nftInfo: {
    gap: 4,
  },
  collectionName: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
  },
  tokenId: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 16,
  },
}); 