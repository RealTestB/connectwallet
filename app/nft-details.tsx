import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Linking, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WalletHeader from "../components/ui/WalletHeader";
import BottomNav from "../components/ui/BottomNav";
import NFTPropertiesModal from "../components/ui/NFTPropertiesModal";
import { getNFTMetadata, NFT } from "../api/nftsApi";
import { sharedStyles, COLORS, SPACING, FONTS } from "../styles/shared";
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';

export default function NFTDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [nft, setNft] = useState<NFT | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPropertiesVisible, setIsPropertiesVisible] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get wallet address
        const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
        if (walletDataStr) {
          const walletData = JSON.parse(walletDataStr);
          setWalletAddress(walletData.address);
        }

        // Get NFT data
        if (!params.id || !params.contractAddress) {
          throw new Error('Missing NFT details');
        }
        const nftData = await getNFTMetadata(
          params.contractAddress as string, 
          params.id as string,
          params.tokenType as 'erc721' | 'erc1155'
        );
        setNft(nftData);
      } catch (err) {
        console.error('[NFTDetailsScreen] Error fetching data:', err);
        setError("Could not load NFT details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id, params.contractAddress]);

  const handleAccountChange = (account: { address: string; chainId?: number }) => {
    // Handle account change
  };

  const handleViewOnEtherscan = () => {
    if (nft?.contract?.address && nft?.tokenId) {
      const url = `https://etherscan.io/nft/${nft.contract.address}/${nft.tokenId}`;
      Linking.openURL(url);
    }
  };

  const handleSendNFT = () => {
    if (nft) {
      router.push(`/send-nft?nft=${encodeURIComponent(JSON.stringify(nft))}`);
    }
  };

  return (
    <View style={sharedStyles.container}>
      <Image
        source={require('../assets/images/background.png')}
        style={sharedStyles.backgroundImage}
      />
      
      <WalletHeader 
        pageName="NFT Details"
        onAccountChange={handleAccountChange}
      />

      {/* Main Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingBottom: 80 + insets.bottom,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : nft ? (
          <>
            <View style={styles.imageContainer}>
              <Image
                source={{
                  uri: nft.media?.[0]?.gateway || nft.media?.[0]?.thumbnail
                }}
                style={styles.nftImage}
              />
            </View>

            <View style={styles.detailsContainer}>
              <Text style={styles.collectionName}>{nft.contract.name}</Text>
              <Text style={styles.nftName}>{nft.title || `${nft.contract.name} #${nft.tokenId}`}</Text>

              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Token ID</Text>
                  <Text style={styles.infoValue}>#{nft.tokenId}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Owner</Text>
                  <Text style={styles.infoValue}>
                    {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Unknown'}
                  </Text>
                </View>
              </View>

              {nft.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>{nft.description}</Text>
                </View>
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setIsPropertiesVisible(true)}
              >
                <Text style={styles.buttonText}>View Properties</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]}
                onPress={handleViewOnEtherscan}
              >
                <Text style={styles.buttonText}>View on Etherscan</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]}
                onPress={handleSendNFT}
              >
                <Text style={styles.buttonText}>Send NFT</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </ScrollView>

      {!isPropertiesVisible && <BottomNav activeTab="nft" />}

      {nft && (
        <NFTPropertiesModal
          isVisible={isPropertiesVisible}
          onClose={() => setIsPropertiesVisible(false)}
          nft={nft}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 12,
    padding: SPACING.md,
    marginVertical: SPACING.lg,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
  },
  imageContainer: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  nftImage: {
    width: "100%",
    aspectRatio: 1,
  },
  detailsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  collectionName: {
    color: COLORS.primary,
    fontSize: FONTS.caption.fontSize,
  },
  nftName: {
    ...FONTS.h1,
    marginBottom: SPACING.xs,
  },
  infoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    ...FONTS.caption,
    color: COLORS.primary,
  },
  infoValue: {
    ...FONTS.body,
    color: COLORS.white,
    fontWeight: "500",
  },
  descriptionContainer: {
    gap: SPACING.xs,
  },
  descriptionTitle: {
    ...FONTS.body,
    fontWeight: "600",
  },
  descriptionText: {
    ...FONTS.caption,
  },
  buttonContainer: {
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  button: {
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    ...FONTS.body,
    fontWeight: "500",
  },
}); 