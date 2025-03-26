import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { sharedStyles, COLORS, SPACING } from '../styles/shared';
import OnboardingLayout from '../components/ui/OnboardingLayout';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { completeWalletSetup } from '../api/walletApi';

export default function ConfirmSeedPhrase() {
  const router = useRouter();
  const [originalPhrase, setOriginalPhrase] = useState<string[]>([]);
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSeedPhrase();
  }, []);

  const loadSeedPhrase = async () => {
    try {
      const phrase = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_SEED_PHRASE);
      if (!phrase) throw new Error('No seed phrase found');
      
      const words = phrase.split(' ');
      setOriginalPhrase(words);
      setShuffledWords([...words].sort(() => Math.random() - 0.5));
    } catch (error) {
      console.error('Error loading seed phrase:', error);
      setError('Failed to load seed phrase');
    }
  };

  const handleWordSelect = (word: string) => {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word));
    } else {
      setSelectedWords([...selectedWords, word]);
    }
    setError('');
  };

  const handleVerify = async () => {
    const selectedPhraseString = selectedWords.join(' ');
    const originalPhraseString = originalPhrase.join(' ');
    
    console.log('Selected phrase:', selectedPhraseString);
    console.log('Original phrase:', originalPhraseString);
    console.log('Match?', selectedPhraseString === originalPhraseString);
    
    if (selectedPhraseString === originalPhraseString) {
      try {
        // Complete the wallet setup
        await completeWalletSetup();
        
        // Navigate to secure wallet
        router.push('/secure-wallet');
      } catch (error) {
        console.error('Error completing wallet setup:', error);
        setError('Failed to complete wallet setup. Please try again.');
      }
    } else {
      setError('Incorrect sequence. Please try again.');
      setSelectedWords([]);
    }
  };

  return (
    <OnboardingLayout
      progress={0.75}
      title="Verify Recovery Phrase"
      subtitle="Select the words in the correct order to verify you've saved your recovery phrase"
      icon="verified-user"
    >
      <View style={styles.selectedWordsContainer}>
        {Array(12).fill(null).map((_, index) => (
          <View key={index} style={styles.wordSlot}>
            {selectedWords[index] ? (
              <TouchableOpacity
                style={styles.selectedWord}
                onPress={() => handleWordSelect(selectedWords[index])}
              >
                <Text style={styles.wordText}>{selectedWords[index]}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.placeholderText}>{index + 1}</Text>
            )}
          </View>
        ))}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.wordGrid}>
        {shuffledWords.map((word, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.wordButton,
              selectedWords.includes(word) && styles.wordButtonSelected
            ]}
            onPress={() => handleWordSelect(word)}
            disabled={selectedWords.includes(word)}
          >
            <Text style={[
              styles.wordButtonText,
              selectedWords.includes(word) && styles.wordButtonTextSelected
            ]}>
              {word}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.verifyButton,
          selectedWords.length !== 12 && styles.verifyButtonDisabled
        ]}
        onPress={handleVerify}
        disabled={selectedWords.length !== 12}
      >
        <Text style={styles.verifyButtonText}>Verify</Text>
      </TouchableOpacity>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  selectedWordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  wordSlot: {
    width: '48%',
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedWord: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  placeholderText: {
    color: COLORS.primary,
    fontSize: 14,
    opacity: 0.7,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
  },
  wordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  wordButton: {
    width: '31%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: SPACING.sm,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  wordButtonSelected: {
    opacity: 0.5,
  },
  wordButtonText: {
    color: COLORS.white,
    fontSize: 14,
  },
  wordButtonTextSelected: {
    color: COLORS.primary,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
}); 