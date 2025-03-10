import { useNavigation } from "@react-navigation/native";
import { generateMnemonic } from "bip39";
import * as Crypto from "expo-crypto";
import * as ScreenCapture from "expo-screen-capture";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SeedPhraseScreen() {
  const navigation = useNavigation();
  const [revealed, setRevealed] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState([]);

  useEffect(() => {
    disableScreenCapture();
    generateSeedPhrase();
  }, []);

  const disableScreenCapture = async () => {
    await ScreenCapture.preventScreenCaptureAsync();
  };

  const generateSeedPhrase = async () => {
    try {
      const mnemonic = generateMnemonic();
      setSeedPhrase(mnemonic.split(" "));

      // Encrypt the seed phrase before storing it
      const password = await SecureStore.getItemAsync("encryptedPassword");
      if (password) {
        const encryptedSeed = await encryptSeedPhrase(mnemonic, password);
        await SecureStore.setItemAsync("encryptedSeedPhrase", encryptedSeed);
      }
    } catch (error) {
      console.error("Error generating seed phrase:", error);
    }
  };

  const encryptSeedPhrase = async (phrase, password) => {
    const salt = Crypto.getRandomValues(new Uint8Array(16)).toString();
    const derivedKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + salt
    );
    return JSON.stringify({ phrase, derivedKey, salt });
  };

  const handleContinue = () => {
    navigation.navigate("ConfirmSeedPhraseScreen");
  };

  return (
    <View style={styles.container}>
      {/* Back Button & Progress Dots */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>⬅</Text>
        </TouchableOpacity>
        <View style={styles.progressDots}>
          {[1, 2, 3, 4, 5].map((step) => (
            <View key={step} style={[styles.dot, step === 2 && styles.activeDot]} />
          ))}
        </View>
        <View style={{ width: 30 }} /> {/* Empty space for alignment */}
      </View>

      {/* Title & Instructions */}
      <Text style={styles.title}>Secret Recovery Phrase</Text>
      <Text style={styles.subtitle}>
        Write down these 12 words in order and store them securely.
      </Text>

      {/* Warning Message */}
      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          ⚠ Never share your recovery phrase. Anyone with these words can access your wallet.
        </Text>
      </View>

      {/* Seed Phrase Grid */}
      <View style={[styles.seedContainer, !revealed && styles.hiddenSeed]}>
        <FlatList
          data={seedPhrase}
          numColumns={2}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item, index }) => (
            <View style={styles.seedWordBox}>
              <Text style={styles.seedIndex}>#{index + 1}</Text>
              <Text style={styles.seedWord}>{item}</Text>
            </View>
          )}
        />
      </View>

      {/* Show Phrase Button */}
      {!revealed && (
        <TouchableOpacity style={styles.showButton} onPress={() => setRevealed(true)}>
          <Text style={styles.showButtonText}>👁️ Show Recovery Phrase</Text>
        </TouchableOpacity>
      )}

      {/* Security Notice */}
      {revealed && (
        <View style={styles.securityBox}>
          <Text style={styles.securityText}>
            🛡️ Make sure no one is watching your screen while viewing your recovery phrase.
          </Text>
        </View>
      )}

      {/* Continue Button */}
      {revealed && (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1B3F",
    padding: 20,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    fontSize: 24,
    color: "#6A9EFF",
  },
  progressDots: {
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(106, 158, 255, 0.3)",
  },
  activeDot: {
    backgroundColor: "#6A9EFF",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#6A9EFF",
    textAlign: "center",
    marginBottom: 20,
  },
  warningBox: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderColor: "rgba(255, 0, 0, 0.3)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  warningText: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
  },
  seedContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  hiddenSeed: {
    opacity: 0.2,
  },
  seedWordBox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 10,
    margin: 5,
    flex: 1,
    alignItems: "center",
  },
  seedIndex: {
    color: "#6A9EFF",
    fontSize: 12,
    marginBottom: 4,
  },
  seedWord: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  showButton: {
    backgroundColor: "#1A2F6C",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  showButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  securityBox: {
    backgroundColor: "rgba(255, 255, 0, 0.1)",
    borderColor: "rgba(255, 255, 0, 0.3)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  securityText: {
    color: "yellow",
    fontSize: 14,
    textAlign: "center",
  },
  continueButton: {
    backgroundColor: "#6A9EFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});

