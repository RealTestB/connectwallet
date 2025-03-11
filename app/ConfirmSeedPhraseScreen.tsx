import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getSeedPhrase } from '../api/seedphraseApi';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';

type ConfirmSeedPhraseScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ConfirmSeedPhrase'>;
type ConfirmSeedPhraseScreenRouteProp = RouteProp<RootStackParamList, 'ConfirmSeedPhrase'>;

export default function ConfirmSeedPhraseScreen(): JSX.Element {
  const navigation = useNavigation<ConfirmSeedPhraseScreenNavigationProp>();
  const route = useRoute<ConfirmSeedPhraseScreenRouteProp>();
  const { password } = route.params;

  const [selectedWords, setSelectedWords] = useState<string[]>(['', '', '']);
  const [error, setError] = useState<string>('');
  const [actualSeedPhrase, setActualSeedPhrase] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  useEffect(() => {
    const fetchSeedPhrase = async (): Promise<void> => {
      try {
        const phrase = await getSeedPhrase(password);
        setActualSeedPhrase(phrase);
      } catch (error) {
        console.error('Error fetching seed phrase:', error);
        Alert.alert('Error', 'Failed to retrieve seed phrase');
        navigation.goBack();
      }
    };

    void fetchSeedPhrase();
  }, [password, navigation]);

  const handleWordInput = (index: number, word: string): void => {
    const newWords = [...selectedWords];
    newWords[index] = word.trim().toLowerCase();
    setSelectedWords(newWords);
    setError('');
  };

  const handleVerify = (): void => {
    setIsVerifying(true);
    setError('');

    const selectedPhrase = selectedWords.join(' ');
    const actualWords = actualSeedPhrase.split(' ');
    const requiredIndices = [3, 6, 9]; // Verify words at positions 4, 7, and 10

    const isCorrect = requiredIndices.every((index, i) => 
      selectedWords[i].toLowerCase() === actualWords[index].toLowerCase()
    );

    if (isCorrect) {
      navigation.navigate('SecureWallet');
    } else {
      setError('Incorrect words. Please try again.');
    }

    setIsVerifying(false);
  };

  const isVerifyEnabled = selectedWords.every(word => word.length > 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm Recovery Phrase</Text>
      <Text style={styles.subtitle}>
        Please enter words 4, 7, and 10 from your recovery phrase to verify you've saved it correctly.
      </Text>

      <View style={styles.wordsContainer}>
        {[4, 7, 10].map((wordNumber, index) => (
          <View key={wordNumber} style={styles.wordInputContainer}>
            <Text style={styles.wordLabel}>{`Word #${wordNumber}`}</Text>
            <TextInput
              style={styles.wordInput}
              onChangeText={(text) => handleWordInput(index, text)}
              value={selectedWords[index]}
              placeholder="Enter word"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.verifyButton, !isVerifyEnabled && styles.verifyButtonDisabled]}
        onPress={handleVerify}
        disabled={!isVerifyEnabled || isVerifying}
      >
        <Text style={styles.verifyButtonText}>
          {isVerifying ? 'Verifying...' : 'Verify'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  wordsContainer: {
    marginBottom: 30,
  },
  wordInputContainer: {
    marginBottom: 20,
  },
  wordLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  wordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#ff3b30',
    marginBottom: 20,
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 