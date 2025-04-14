import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { sharedStyles, COLORS, SPACING, FONTS } from '../styles/shared';

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

export default function ImportWalletScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleAccountChange = (account: Account) => {
    // Handle account change if needed
  };

  return (
    <View style={sharedStyles.container}>
      <ImageBackground 
        source={require('../assets/images/background.png')}
        style={sharedStyles.backgroundImage}
      />
      <ScrollView style={sharedStyles.contentContainer}>
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={24} color={COLORS.error} style={sharedStyles.iconSpacing} />
          <Text style={styles.warningText}>
            Never share your private keys or seed phrase. Anyone with access to them can control your wallet.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push({
              pathname: "/import-seed-phrase",
              params: { mode: 'import' }
            })}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="leaf" size={24} color={COLORS.white} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Import with Seed Phrase</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push({
              pathname: "/import-private-key",
              params: { mode: 'import' }
            })}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="key" size={24} color={COLORS.white} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Import with Private Key</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.securityTipsContainer}>
          <Text style={styles.securityTipsTitle}>Important Security Tips:</Text>
          <View style={styles.tipItem}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
            <Text style={styles.tipText}>Make sure no one is watching your screen</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="warning" size={20} color={COLORS.primary} />
            <Text style={styles.tipText}>Never enter your details on untrusted websites</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="lock-closed" size={20} color={COLORS.primary} />
            <Text style={styles.tipText}>Store your backup phrase in a secure location</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
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
  buttonContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  secondaryButton: {
    backgroundColor: `${COLORS.primary}20`,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: SPACING.sm,
  },
  buttonText: {
    ...FONTS.body,
    color: COLORS.white,
    fontWeight: '600',
  },
  securityTipsContainer: {
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 12,
    padding: SPACING.md,
  },
  securityTipsTitle: {
    ...FONTS.h2,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tipText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  errorContainer: {
    backgroundColor: "#ef44441a",
    borderWidth: 1,
    borderColor: "#ef444433",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
  },
}); 