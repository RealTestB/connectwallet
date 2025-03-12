import { importClassicWalletFromSeedPhrase } from "../api/walletApi";
import { encryptSeedPhrase, storeEncryptedData } from "../api/securityApi";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";

type ImportSeedPhraseScreenNavigationProp = StackNavigationProp<RootStackParamList, 'import-seed-phrase'>;
type ImportSeedPhraseScreenRouteProp = RouteProp<RootStackParamList, 'import-seed-phrase'>;

type WordCount = 12 | 24;

export default function ImportSeedPhraseScreen(): JSX.Element {
  const navigation = useNavigation<ImportSeedPhraseScreenNavigationProp>();
  const route = useRoute<ImportSeedPhraseScreenRouteProp>();
  const { password } = route.params;

  const [wordCount, setWordCount] = useState<WordCount>(12);
  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [securityScore, setSecurityScore] = useState<number>(0);

  const handleWordCountToggle = (count: WordCount): void => {
    setWordCount(count);
    setWords(Array(count).fill(""));
    setError(null);
    setSecurityScore(0);
  };

  const handleWordChange = (index: number, value: string): void => {
    const newWords = [...words];
    newWords[index] = value.toLowerCase().trim();
    setWords(newWords);
    setError(null);

    const filledWords = newWords.filter((w) => w.length > 0).length;
    setSecurityScore(Math.floor((filledWords / wordCount) * 100));
  };

  const handlePaste = async (): Promise<void> => {
    const pastedText = await Clipboard.getStringAsync();
    const pastedWords = pastedText
      .trim()
      .split(/[\s\n]+/)
      .filter((word) => word.length > 0)
      .map((w) => w.toLowerCase());

    if (pastedWords.length === wordCount) {
      setWords(pastedWords);
      setSecurityScore(100);
      setError(null);
    } else {
      setError(`Please paste a valid ${wordCount}-word seed phrase.`);
    }
  };

  const handleImport = async (): Promise<void> => {
    setIsProcessing(true);
    setError(null);

    try {
      const seedPhrase = words.join(" ");
      if (seedPhrase.split(" ").length !== wordCount) {
        setError("Invalid seed phrase length.");
        return;
      }

      // Encrypt the seed phrase before storing
      const encryptedSeedData = await encryptSeedPhrase(seedPhrase, password);
      await storeEncryptedData("encryptedSeedPhrase", encryptedSeedData);

      // Import wallet with the seed phrase
      const { address } = await importClassicWalletFromSeedPhrase(seedPhrase);

      // Navigate to success screen with correct parameters
      navigation.replace("import-success", { 
        walletAddress: address,
        walletType: 'classic'
      });
    } catch (err) {
      console.error("Import failed:", err);
      setError("Failed to import wallet. Please check your seed phrase.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Import {wordCount}-Word Seed Phrase</Text>
      </View>

      {/* Word Count Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, wordCount === 12 && styles.toggleActive]}
          onPress={() => handleWordCountToggle(12)}
        >
          <Text style={styles.toggleText}>12 Words</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, wordCount === 24 && styles.toggleActive]}
          onPress={() => handleWordCountToggle(24)}
        >
          <Text style={styles.toggleText}>24 Words</Text>
        </TouchableOpacity>
      </View>

      {/* Security Warning */}
      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          ⚠ Never share your seed phrase with anyone. We will never ask for
          it outside of this import process.
        </Text>
      </View>

      {/* Security Level Bar */}
      <View style={styles.securityBox}>
        <Text style={styles.securityText}>Security Level</Text>
        <Text style={styles.securityText}>{securityScore}%</Text>
        <View style={styles.securityBar}>
          <View style={[styles.securityFill, { width: `${securityScore}%` }]} />
        </View>
      </View>

      {/* Seed Phrase Input Grid */}
      <View style={styles.seedInputContainer}>
        {Array.from({ length: wordCount }).map((_, i) => (
          <TextInput
            key={i}
            style={styles.seedInput}
            placeholder={`Word ${i + 1}`}
            placeholderTextColor="#6A9EFF"
            value={words[i]}
            onChangeText={(value) => handleWordChange(i, value)}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
        ))}
      </View>

      {/* Paste Button */}
      <TouchableOpacity style={styles.pasteButton} onPress={handlePaste}>
        <Text style={styles.pasteButtonText}>📋 Paste Seed Phrase</Text>
      </TouchableOpacity>

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Import Button */}
      <TouchableOpacity
        style={[
          styles.importButton,
          isProcessing || words.some((word) => !word) ? styles.disabledButton : {},
        ]}
        onPress={handleImport}
        disabled={isProcessing || words.some((word) => !word)}
      >
        {isProcessing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Import Wallet</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1B3F",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 40,
  },
  backText: {
    fontSize: 24,
    color: "#6A9EFF",
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    flex: 1,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 10,
  },
  toggleActive: {
    backgroundColor: "#6A9EFF",
  },
  toggleText: {
    fontSize: 14,
    color: "white",
  },
  warningBox: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  warningText: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
  },
  securityBox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  securityText: {
    color: "#6A9EFF",
    fontSize: 14,
  },
  securityBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 5,
  },
  securityFill: {
    height: "100%",
    backgroundColor: "#6A9EFF",
  },
  seedInputContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  seedInput: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    color: "white",
    fontSize: 14,
  },
  pasteButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  pasteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  errorText: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 10,
  },
  importButton: {
    backgroundColor: "#6A9EFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
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