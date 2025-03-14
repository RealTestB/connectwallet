import 'react-native-gesture-handler';
import { useRouter } from "expo-router";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Vibration } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../components/ui/BottomNav";
import WalletHeader from "../components/ui/WalletHeader";

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

export default function WelcomeScreen() {
  const router = useRouter();

  const handleAccountChange = (account: Account) => {
    // Handle account change if needed
  };

  const handleCreateWallet = (): void => {
    Vibration.vibrate(50);
    router.push('/create-password?mode=create');
  };

  const handleImportWallet = (): void => {
    Vibration.vibrate(50);
    router.push("/import-wallet");
  };

  return (
    <View style={styles.container}>
      <WalletHeader pageName="Welcome" onAccountChange={handleAccountChange} />
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Welcome to ConnectWallet</Text>
        <Text style={styles.subtitle}>Your Gateway to Web3</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create New Wallet</Text>
          <Text style={styles.cardDescription}>
            Start fresh with a new wallet. You'll get a seed phrase to keep safe.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleCreateWallet}
          >
            <Text style={styles.buttonText}>Create Wallet</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Import Existing Wallet</Text>
          <Text style={styles.cardDescription}>
            Already have a wallet? Import it using your seed phrase.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleImportWallet}
          >
            <Text style={styles.buttonText}>Import Wallet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A2F6C",
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "#8A9CCF",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 30,
  },
  card: {
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 10,
    marginVertical: 10,
  },
  cardTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  cardDescription: {
    color: "#8A9CCF",
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
}); 