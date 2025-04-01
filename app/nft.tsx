import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WalletHeader from "../components/ui/WalletHeader";
import BottomNav from "../components/ui/BottomNav";
import { getOwnedNFTs, NFT } from "../api/nftsApi";
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { sharedStyles, COLORS, SPACING, FONTS } from "../styles/shared";

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
        console.log('[NFTScreen] Fetching wallet data...');
        const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
        console.log('[NFTScreen] Wallet data string:', walletDataStr);
        
        if (!walletDataStr) {
          throw new Error('No wallet data found');
        }
        
        const walletData = JSON.parse(walletDataStr);
        console.log('[NFTScreen] Parsed wallet data:', walletData);
        
        if (!walletData.address) {
          throw new Error('No wallet address found');
        }
        
        console.log('[NFTScreen] Fetching NFTs for address:', walletData.address);
        const response = await getOwnedNFTs(walletData.address);
        console.log('[NFTScreen] NFTs response:', response);
        setNfts(response.ownedNfts);
      } catch (err) {
        console.error('[NFTScreen] Error fetching NFTs:', err);
        setError("Could not load your NFTs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, []);

  const filteredNFTs = nfts.filter(
    (nft) =>
      nft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderNFTItem = (item: NFT) => (
    <TouchableOpacity
      key={`${item.contract.address}-${item.tokenId}`}
      style={styles.nftCard}
      onPress={() => router.push(`/nft-details?id=${item.tokenId}&contractAddress=${item.contract.address}&tokenType=${item.tokenType}`)}
    >
      <Image
        source={{ uri: item.media?.[0]?.gateway || item.media?.[0]?.thumbnail }}
        style={styles.nftImage}
      />
      <View style={styles.nftInfo}>
        <Text style={styles.collectionName}>
          {item.contract.name || "Collection"}
        </Text>
        <Text style={styles.tokenId}>#{item.tokenId}</Text>
      </View>
    </TouchableOpacity>
  );

  const handleAccountChange = (account: { address: string; chainId?: number }) => {
    // Handle account change
  };

  return (
    <View style={sharedStyles.container}>
      <Image
        source={require('../assets/images/background.png')}
        style={sharedStyles.backgroundImage}
      />
      
      <WalletHeader
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
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search NFTs..."
            placeholderTextColor={COLORS.textSecondary}
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
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.nftGrid}>
              {filteredNFTs.map(renderNFTItem)}
            </View>
          </ScrollView>
        )}
      </View>

      <BottomNav activeTab="nft" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 100,
  },
  searchContainer: {
    position: "relative",
    marginBottom: SPACING.lg,
  },
  searchIcon: {
    position: "absolute",
    left: SPACING.sm,
    top: "50%",
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    paddingLeft: 40,
    paddingRight: SPACING.md,
    ...FONTS.body,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorText: {
    ...FONTS.caption,
  },
  scrollView: {
    flex: 1,
  },
  nftGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  skeletonCard: {
    width: (Dimensions.get("window").width - (SPACING.lg * 2) - SPACING.md) / 2,
    aspectRatio: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
  },
  nftCard: {
    width: (Dimensions.get("window").width - (SPACING.lg * 2) - SPACING.md) / 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: SPACING.md,
  },
  nftImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  nftInfo: {
    gap: SPACING.xs,
  },
  collectionName: {
    ...FONTS.caption,
  },
  tokenId: {
    ...FONTS.body,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    ...FONTS.body,
  },
  listContent: {
    padding: SPACING.md,
  },
}); 