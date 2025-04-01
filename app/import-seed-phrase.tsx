import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import { sharedStyles, COLORS, SPACING, FONTS } from '../styles/shared';
import { importClassicWalletFromSeedPhrase } from '../api/walletApi';
import { validateSeedPhrase } from '../utils/validators';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';

export default function ImportSeedPhraseScreen() {
  const router = useRouter();
  const { password } = useLocalSearchParams<{ password: string }>();
  const [wordCount, setWordCount] = useState(12);
  const [words, setWords] = useState(Array(12).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [securityScore, setSecurityScore] = useState(0);

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
      const seedPhrase = words.join(" ");
      const validation = validateSeedPhrase(seedPhrase);
      
      if (!validation.isValid) {
        throw new Error(validation.error || "Invalid seed phrase");
      }

      // Import the wallet using the seed phrase
      const { address } = await importClassicWalletFromSeedPhrase(seedPhrase);
      
      // Navigate to success page with the address
      router.push({
        pathname: "/import-success",
        params: { 
          type: "import",
          address 
        }
      });
    } catch (err) {
      console.error('[ImportSeedPhrase] Import error:', err);
      setError(err instanceof Error ? err.message : "Failed to import wallet");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync();
      if (!clipboardText) {
        setError('No text found in clipboard');
        return;
      }

      // Split by whitespace and clean up words
      const pastedWords = clipboardText.trim().toLowerCase().split(/\s+/);
      
      // Validate word count
      if (pastedWords.length !== wordCount) {
        setError(`Please paste a ${wordCount}-word seed phrase`);
        return;
      }

      // Update all words at once
      setWords(pastedWords);
      setError(null);

      // Update security score
      setSecurityScore(100);
    } catch (err) {
      console.error('[ImportSeedPhrase] Paste error:', err);
      setError('Failed to paste from clipboard');
    }
  };

  return (
    <View style={sharedStyles.container}>
      <ImageBackground 
        source={require('../assets/images/background.png')}
        style={sharedStyles.backgroundImage}
      />
      <ScrollView 
        style={sharedStyles.contentContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: SPACING.xl * 4
        }}
      >
        <Text style={sharedStyles.title}>Import Seed Phrase</Text>
        <Text style={sharedStyles.subtitle}>
          Enter your seed phrase to import your wallet
        </Text>

        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={24} color={COLORS.error} style={sharedStyles.iconSpacing} />
          <Text style={styles.warningText}>
            Never share your seed phrase with anyone. We will never ask for it outside of this import process.
          </Text>
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              wordCount === 12 ? styles.toggleButtonActive : styles.toggleButtonInactive,
            ]}
            onPress={() => handleWordCountToggle(12)}
          >
            <Text style={[
              styles.toggleButtonText,
              wordCount === 12 ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive,
            ]}>
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
            <Text style={[
              styles.toggleButtonText,
              wordCount === 24 ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive,
            ]}>
              24 Words
            </Text>
          </TouchableOpacity>
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

        <TouchableOpacity
          style={styles.pasteButton}
          onPress={handlePaste}
        >
          <Ionicons name="clipboard-outline" size={20} color={COLORS.white} />
          <Text style={styles.pasteButtonText}>Paste Seed Phrase</Text>
        </TouchableOpacity>

        <View style={styles.wordsGrid}>
          {Array.from({ length: wordCount }).map((_, i) => (
            <View key={i} style={styles.wordInputContainer}>
              <TextInput
                style={styles.wordInput}
                value={words[i]}
                onChangeText={(value) => handleWordChange(i, value)}
                placeholder={`Word ${i + 1}`}
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
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
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.importButtonText}>Import Wallet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  warningContainer: {
    backgroundColor: `${COLORS.error}20`,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    ...FONTS.body,
    color: COLORS.error,
    flex: 1,
    marginLeft: SPACING.sm,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  toggleButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleButtonInactive: {
    backgroundColor: `${COLORS.primary}20`,
  },
  toggleButtonText: {
    ...FONTS.body,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: COLORS.white,
  },
  toggleButtonTextInactive: {
    color: COLORS.textSecondary,
  },
  securityBox: {
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  securityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  securityText: {
    ...FONTS.body,
    color: COLORS.primary,
  },
  securityBarContainer: {
    height: 4,
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: 2,
  },
  securityBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  wordInputContainer: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.white}10`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.white}20`,
  },
  wordInput: {
    flex: 1,
    padding: SPACING.md,
    ...FONTS.body,
    color: COLORS.white,
  },
  errorContainer: {
    backgroundColor: `${COLORS.error}20`,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.error,
  },
  importButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    ...FONTS.body,
    color: COLORS.white,
    fontWeight: '600',
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.primary}20`,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  pasteButtonText: {
    ...FONTS.body,
    color: COLORS.white,
  }
}); 