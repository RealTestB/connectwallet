import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";

type NFTDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'nft-details'>;
type NFTDetailsScreenRouteProp = RouteProp<RootStackParamList, 'nft-details'>;

export default function NFTDetailsScreen(): JSX.Element {
  const navigation = useNavigation<NFTDetailsScreenNavigationProp>();
  const route = useRoute<NFTDetailsScreenRouteProp>();
  const { nft } = route.params;

  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const handleViewOnExplorer = (): void => {
    if (nft.explorerUrl) {
      void Linking.openURL(nft.explorerUrl);
    }
  };

  const handleSendNFT = (): void => {
    navigation.navigate('send-nft', { 
      nft: {
        tokenId: nft.tokenId,
        name: nft.name || '',
        collection: nft.collection,
        image: nft.image || '',
        contractAddress: '', // Will be populated from blockchain data
        owner: nft.owner,
        chain: nft.chain,
        attributes: nft.traits
      }
    });
  };

  return (
    <View style={styles.container}>
      <WalletHeader 
        pageName="NFT Details" 
        onAccountChange={() => {
          // NFT screen doesn't need to handle account changes
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* NFT Image */}
        <Image
          source={{ uri: nft.image || "https://via.placeholder.com/300" }}
          style={styles.nftImage}
        />
        <Text style={styles.collection}>{nft.collection || "Unknown Collection"}</Text>
        <Text style={styles.title}>{nft.name || "NFT Name"}</Text>

        {/* NFT Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Token ID</Text>
            <Text style={styles.value}>{nft.tokenId || "N/A"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Owner</Text>
            <Text style={styles.value}>{nft.owner || "N/A"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Blockchain</Text>
            <Text style={styles.value}>{nft.chain || "N/A"}</Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.button} onPress={() => setIsModalVisible(true)}>
          <Text style={styles.buttonText}>View Properties</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleViewOnExplorer}>
          <Text style={styles.buttonText}>View on Explorer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleSendNFT}>
          <Text style={styles.primaryButtonText}>Send NFT</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* NFT Traits Modal */}
      <Modal isVisible={isModalVisible} onBackdropPress={() => setIsModalVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>NFT Properties</Text>
          <ScrollView>
            {nft.traits && nft.traits.length > 0 ? (
              nft.traits.map((trait, index) => (
                <View key={index} style={styles.traitRow}>
                  <Text style={styles.traitLabel}>{trait.trait_type}</Text>
                  <Text style={styles.traitValue}>{trait.value.toString()}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noTraitsText}>No traits available.</Text>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.closeButton} onPress={() => setIsModalVisible(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <BottomNav activeTab="nft" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A2F6C",
  },
  content: {
    padding: 16,
    alignItems: "center",
  },
  nftImage: {
    width: 300,
    height: 300,
    borderRadius: 15,
    marginBottom: 16,
  },
  collection: {
    color: "#6A9EFF",
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  detailsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    borderRadius: 10,
    width: "100%",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    color: "#6A9EFF",
  },
  value: {
    color: "white",
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#4A90E2",
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  modalContainer: {
    backgroundColor: "#1A2F6C",
    padding: 20,
    borderRadius: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
    textAlign: "center",
  },
  traitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
  },
  traitLabel: {
    color: "#6A9EFF",
  },
  traitValue: {
    color: "white",
    fontWeight: "bold",
  },
  noTraitsText: {
    color: "white",
    textAlign: "center",
    marginTop: 10,
  },
  closeButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
}); 