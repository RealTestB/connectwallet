import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WalletHeader from "../components/ui/WalletHeader";
import BottomNav from "../components/ui/BottomNav";

export default function NFTDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleAccountChange = (account: { address: string; chainId?: number }) => {
    // Handle account change
  };

  return (
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
      <WalletHeader 
        pageName="NFT Details"
        onAccountChange={handleAccountChange}
      />

      {/* Main Content */}
      <ScrollView 
        style={[
          styles.content,
          {
            paddingBottom: 64 + insets.bottom,
          }
        ]}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: "https://i.seadn.io/gae/Ju9CkWtV-1Okvf45wo8UctR-M9He2PjILP0oOvxE89AyiPPGtrR3gysu1Zgy0hjd2xKIgjJJtWIc0ybj4Vd7wv8t3pxDGHoJBzDB?w=500&auto=format"
            }}
            style={styles.nftImage}
          />
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.collectionName}>Bored Ape Yacht Club</Text>
          <Text style={styles.nftName}>Bored Ape #8398</Text>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Token ID</Text>
              <Text style={styles.infoValue}>8398</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Owner</Text>
              <Text style={styles.infoValue}>0x1234...5678</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.buttonText}>View Properties</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.buttonText}>View on Etherscan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.buttonText}>Send NFT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
  imageContainer: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  nftImage: {
    width: "100%",
    aspectRatio: 1,
  },
  detailsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  collectionName: {
    color: "#93c5fd",
    fontSize: 14,
  },
  nftName: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  infoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: {
    color: "#93c5fd",
  },
  infoValue: {
    color: "white",
    fontWeight: "500",
  },
  buttonContainer: {
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
}); 