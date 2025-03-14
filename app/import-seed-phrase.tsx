import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import WalletHeader from "../components/ui/WalletHeader";

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

export default function ImportSeedPhraseScreen() {
  const router = useRouter();
  const { password } = useLocalSearchParams();
  const [wordCount, setWordCount] = useState(12);
  const [words, setWords] = useState(Array(12).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [securityScore, setSecurityScore] = useState(0);
  const [isSecure, setIsSecure] = useState(true);

  const handleWordCountToggle = (count: number) => {
    setWordCount(count);
    setWords(Array(count).fill(""));
    setError(null);
    setSecurityScore(0);
  };

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value.toLowerCase().trim();
    setWords(newWords);
    setError(null);

    const filledWords = newWords.filter((w) => w.length > 0).length;
    setSecurityScore(Math.floor((filledWords / wordCount) * 100));
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      if (!password) {
        throw new Error("Password is required");
      }

      // Here you would make your API calls
      // For now, we'll just simulate success
      router.push("/import-success?type=creation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import wallet");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
      <WalletHeader pageName="Import Seed Phrase" onAccountChange={() => {}} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.stepsContainer}>
          <View style={styles.steps}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.stepDot,
                  step === 4 ? styles.activeStep : styles.inactiveStep,
                ]}
              />
            ))}
          </View>
        </View>

        <Text style={styles.title}>Import {wordCount}-Word Seed Phrase</Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              wordCount === 12 ? styles.toggleButtonActive : styles.toggleButtonInactive,
            ]}
            onPress={() => handleWordCountToggle(12)}
          >
            <Text
              style={[
                styles.toggleButtonText,
                wordCount === 12 ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive,
              ]}
            >
              12 Words
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              wordCount === 24 ? styles.toggleButtonActive : styles.toggleButtonInactive,
            ]}
            onPress={() => handleWordCountToggle(24)}
          >
            <Text
              style={[
                styles.toggleButtonText,
                wordCount === 24 ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive,
              ]}
            >
              24 Words
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#f87171" />
          <Text style={styles.warningText}>
            Never share your seed phrase with anyone. We will never ask for it outside of this import process.
          </Text>
        </View>

        <View style={styles.securityBox}>
          <View style={styles.securityHeader}>
            <Text style={styles.securityText}>Security Level</Text>
            <Text style={styles.securityText}>{securityScore}%</Text>
          </View>
          <View style={styles.securityBarContainer}>
            <View style={[styles.securityBar, { width: `${securityScore}%` }]} />
          </View>
        </View>

        <View style={styles.wordsGrid}>
          {Array.from({ length: wordCount }).map((_, i) => (
            <View key={i} style={styles.wordInputContainer}>
              <TextInput
                style={styles.wordInput}
                secureTextEntry={isSecure}
                value={words[i]}
                onChangeText={(value) => handleWordChange(i, value)}
                placeholder={`Word ${i + 1}`}
                placeholderTextColor="#93c5fd"
              />
            </View>
          ))}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.importButton,
            (isProcessing || words.some(word => !word)) && styles.importButtonDisabled,
          ]}
          onPress={handleImport}
          disabled={isProcessing || words.some(word => !word)}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.importButtonText}>Import Wallet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  stepsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 32,
  },
  steps: {
    flexDirection: "row",
    gap: 4,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeStep: {
    backgroundColor: "#3b82f6",
  },
  inactiveStep: {
    backgroundColor: "#3b82f680",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 24,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  toggleButtonActive: {
    backgroundColor: "#2563eb",
  },
  toggleButtonInactive: {
    backgroundColor: "#ffffff1a",
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  toggleButtonTextActive: {
    color: "white",
  },
  toggleButtonTextInactive: {
    color: "#93c5fd",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#ef44441a",
    borderWidth: 1,
    borderColor: "#ef444433",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    color: "#f87171",
    fontSize: 14,
  },
  securityBox: {
    backgroundColor: "#ffffff1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  securityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  securityText: {
    color: "#93c5fd",
    fontSize: 14,
  },
  securityBarContainer: {
    height: 8,
    backgroundColor: "#ffffff1a",
    borderRadius: 4,
    overflow: "hidden",
  },
  securityBar: {
    height: "100%",
    backgroundColor: "#3b82f6",
  },
  wordsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  wordInputContainer: {
    width: "48%",
  },
  wordInput: {
    backgroundColor: "#ffffff1a",
    borderWidth: 1,
    borderColor: "#ffffff1a",
    borderRadius: 12,
    padding: 12,
    color: "white",
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: "#ef44441a",
    borderWidth: 1,
    borderColor: "#ef444433",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
  },
  importButton: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
}); 