import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";
import * as Clipboard from "expo-clipboard";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

const ReceiveScreen = () => {
  const [selectedNetwork, setSelectedNetwork] = useState("ethereum");
  const [walletAddress, setWalletAddress] = useState(null);
  const [networkId, setNetworkId] = useState(null);

  const networks = [
    { id: "ethereum", name: "Ethereum", chainId: 1 },
    { id: "polygon", name: "Polygon", chainId: 137 },
    { id: "arbitrum", name: "Arbitrum", chainId: 42161 },
    { id: "optimism", name: "Optimism", chainId: 10 },
    { id: "avalanche", name: "Avalanche", chainId: 43114 },
    { id: "bsc", name: "Binance Smart Chain", chainId: 56 },
  ];

  useEffect(() => {
    loadWalletData();
  }, [selectedNetwork]);

  const loadWalletData = async () => {
    try {
      const storedAddress = await SecureStore.getItemAsync("walletAddress");
      const storedNetwork = await SecureStore.getItemAsync("networkId");

      if (storedAddress) setWalletAddress(storedAddress);
      if (storedNetwork) setNetworkId(parseInt(storedNetwork));
    } catch (error) {
      Alert.alert("Error", "Failed to load wallet data.");
    }
  };

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      Alert.alert("Copied!", "Wallet address has been copied to clipboard.");
    }
  };

  const handleShare = async () => {
    if (walletAddress) {
      try {
        await Share.share({
          message: `My Wallet Address: ${walletAddress}`,
        });
      } catch (error) {
        Alert.alert("Error", "Failed to share address");
      }
    }
  };

  return (
    <View style={styles.container}>
      <WalletHeader />

      <Text style={styles.title}>Receive Tokens</Text>

      {/* Network Selector */}
      <Text style={styles.label}>Select Network</Text>
      <View style={styles.networkSelector}>
        {networks.map((network) => (
          <TouchableOpacity
            key={network.id}
            style={[
              styles.networkButton,
              selectedNetwork === network.id && styles.activeNetwork,
            ]}
            onPress={() => setSelectedNetwork(network.id)}
          >
            <Text style={styles.networkText}>{network.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* QR Code */}
      <View style={styles.qrContainer}>
        {walletAddress ? (
          <QRCode value={walletAddress} size={200} backgroundColor="white" />
        ) : (
          <Text style={styles.loadingText}>Loading...</Text>
        )}
      </View>

      {/* Wallet Address */}
      <Text style={styles.label}>Wallet Address</Text>
      <TouchableOpacity style={styles.addressContainer} onPress={handleCopyAddress}>
        <Text style={styles.addressText}>{walletAddress || "Loading..."}</Text>
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
        <Text style={styles.shareButtonText}>Share Address</Text>
      </TouchableOpacity>

      <BottomNav />
    </View>
  );
};

// Styles
const styles = {
  container: {
    flex: 1,
    backgroundColor: "#1A2F6C",
    padding: 16,
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  label: {
    color: "white",
    marginBottom: 5,
  },
  networkSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 15,
  },
  networkButton: {
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 5,
    margin: 5,
  },
  activeNetwork: {
    backgroundColor: "#007bff",
  },
  networkText: {
    color: "white",
  },
  qrContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  loadingText: {
    color: "white",
  },
  addressContainer: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
  },
  addressText: {
    fontFamily: "monospace",
  },
  shareButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
  },
  shareButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
};

export default ReceiveScreen;
