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
  StyleSheet,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

interface Network {
  id: string;
  name: string;
  chainId: number;
}

interface Account {
  address: string;
  name?: string;
  type: 'classic' | 'smart';
  chainId?: number;
}

const networks: Network[] = [
  { id: "ethereum", name: "Ethereum", chainId: 1 },
  { id: "polygon", name: "Polygon", chainId: 137 },
  { id: "arbitrum", name: "Arbitrum", chainId: 42161 },
  { id: "optimism", name: "Optimism", chainId: 10 },
  { id: "avalanche", name: "Avalanche", chainId: 43114 },
  { id: "bsc", name: "Binance Smart Chain", chainId: 56 },
];

const Receive: React.FC = () => {
  const [selectedNetwork, setSelectedNetwork] = useState<string>("ethereum");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<number | null>(null);

  useEffect(() => {
    loadWalletData();
  }, [selectedNetwork]);

  const loadWalletData = async (): Promise<void> => {
    try {
      const storedAddress = await SecureStore.getItemAsync("walletAddress");
      const storedNetwork = await SecureStore.getItemAsync("networkId");

      if (storedAddress) setWalletAddress(storedAddress);
      if (storedNetwork) setNetworkId(parseInt(storedNetwork));
    } catch (error) {
      Alert.alert("Error", "Failed to load wallet data.");
    }
  };

  const handleCopyAddress = async (): Promise<void> => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      Alert.alert("Copied!", "Wallet address has been copied to clipboard.");
    }
  };

  const handleShare = async (): Promise<void> => {
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

  const handleAccountChange = (account: Account): void => {
    setWalletAddress(account.address);
    if (account.chainId) {
      setNetworkId(account.chainId);
      const network = networks.find(n => n.chainId === account.chainId);
      if (network) {
        setSelectedNetwork(network.id);
      }
    }
  };

  return (
    <View style={styles.container}>
      <WalletHeader 
        pageName="Receive"
        onAccountChange={handleAccountChange}
      />

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

      <BottomNav activeTab="receive" />
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
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
});

export default Receive; 