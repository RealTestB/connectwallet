import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sharedStyles, COLORS, SPACING } from '../styles/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import OnboardingLayout from '../components/ui/OnboardingLayout';

export default function Welcome() {
  const router = useRouter();

  return (
    <OnboardingLayout
      title="Welcome to ConnectWallet"
      subtitle="Your Gateway to Web3"
      icon="wallet"
    >
      <View style={styles.content}>
        {/* Create Wallet Card */}
        <TouchableOpacity 
          style={styles.card}
          onPress={() => router.push({
            pathname: '/create-password',
            params: { mode: 'new' }
          })}
        >
          <LinearGradient
            colors={['rgba(106, 158, 255, 0.1)', 'rgba(106, 158, 255, 0.05)']}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitle}>Create New Wallet</Text>
            </View>
            <Text style={styles.cardDescription}>
              Start fresh with a new wallet. You'll get a seed phrase to keep safe.
            </Text>
            <View style={styles.buttonContainer}>
              <Text style={styles.buttonText}>Create Wallet</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Import Wallet Card */}
        <TouchableOpacity 
          style={styles.card}
          onPress={() => router.push('/import-wallet')}
        >
          <LinearGradient
            colors={['rgba(106, 158, 255, 0.1)', 'rgba(106, 158, 255, 0.05)']}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="download-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitle}>Import Existing Wallet</Text>
            </View>
            <Text style={styles.cardDescription}>
              Already have a wallet? Import it using your seed phrase.
            </Text>
            <View style={styles.buttonContainer}>
              <Text style={styles.buttonText}>Import Wallet</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: SPACING.lg,
  },
  card: {
    width: '100%',
  },
  cardGradient: {
    borderRadius: 16,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(106, 158, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(106, 158, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
  },
  cardDescription: {
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: 12,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
}); 