import { decryptSeedPhrase } from "../api/seedphraseService";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ConfirmSeedPhraseScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [selectedWords, setSelectedWords] = useState({});
  const [error, setError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [actualSeedPhrase, setActualSeedPhrase] = useState(null);
  const requiredWordIndices = [2, 5, 8, 11];

  useEffect(() => {
    const fetchSeedPhrase = async () => {
      try {
        const password = route.params?.password; // Password collected during wallet creation
        if (!password) throw new Error("Missing encryption password.");

        const decryptedPhrase = await decryptSeedPhrase(password);
        setActualSeedPhrase(decryptedPhrase.split(" "));
      } catch (err) {
        console.error("Failed to retrieve seed phrase:", err);
        setError("Error loading your seed phrase. Please restart.");
      }
    };

    fetchSeedPhrase();
  }, [route.params]);

  const handleWordInput = (index, value) => {
    setSelectedWords((prev) => ({
      ...prev,
      [index]: value.toLowerCase().trim(),
    }));
    setError(null);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      if (!actualSeedPhrase) {
        throw new Error("Seed phrase not found. Restart the setup.");
      }

      // Validate user input against the stored seed phrase
      const correctWords = requiredWordIndices.every(
        (i) => selectedWords[i] === actualSeedPhrase[i]
      );

      if (!correctWords) {
        throw new Error("Verification failed. Please try again.");
      }

      // Navigate to the next step (Secure Wallet)
      navigation.replace("SecureWalletScreen");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button & Progress Dots */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>⬅</Text>
        </TouchableOpacity>
        <View style={styles.progressDots}>
          {[1, 2, 3, 4, 5].map((step) => (
            <View key={step} style={[styles.dot, step === 3 && styles.activeDot]} />
          ))}
        </View>
        <View style={{ width: 30 }} /> {/* Empty space for alignment */}
      </View>

      {/* Title & Instructions */}
      <Text style={styles.title}>Verify Recovery Phrase</Text>
      <Text style={styles.subtitle}>
        Please enter the missing words from your recovery phrase.
      </Text>

      {/* Seed Phrase Grid */}
      <FlatList
        data={Array.from({ length: actualSeedPhrase ? actualSeedPhrase.length : 12 }, (_, i) => i)}
        numColumns={2}
        keyExtractor={(item) => item.toString()}
        renderItem={({ item: index }) => (
          <View style={styles.wordBox}>
            <Text style={styles.wordIndex}>#{index + 1}</Text>
            {requiredWordIndices.includes(index) ? (
              <TextInput
                style={styles.input}
                placeholder="Enter word"
                placeholderTextColor="#6A9EFF"
                value={selectedWords[index] || ""}
                onChangeText={(value) => handleWordInput(index, value)}
              />
            ) : (
              <Text style={styles.wordText}>{actualSeedPhrase ? actualSeedPhrase[index] : "..."}</Text>
            )}
          </View>
        )}
      />

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Verify Button */}
      <TouchableOpacity
        style={[
          styles.verifyButton,
          isVerifying || requiredWordIndices.some((i) => !selectedWords[i]) ? styles.disabledButton : {},
        ]}
        onPress={handleVerify}
        disabled={isVerifying || requiredWordIndices.some((i) => !selectedWords[i])}
      >
        {isVerifying ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Verify</Text>}
      </TouchableOpacity>
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
  wordBox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 10,
    margin: 5,
    flex: 1,
    alignItems: "center",
  },
  wordIndex: {
    color: "#6A9EFF",
    fontSize: 12,
    marginBottom: 4,
  },
  wordText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: "100%",
    textAlign: "center",
    color: "white",
  },
  errorText: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 10,
  },
  verifyButton: {
    backgroundColor: "#6A9EFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: "rgba(106, 158, 255, 0.3)",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});

