import React, { useState } from "react";
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Checkbox from 'expo-checkbox';
import * as SecureStore from 'expo-secure-store';
import { sharedStyles, COLORS, SPACING } from '../styles/shared';
import OnboardingLayout from '../components/ui/OnboardingLayout';

interface SecurityTip {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

interface SecurityOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function SecureWallet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());

  const securityTips: SecurityTip[] = [
    {
      icon: "shield-outline",
      title: "Never Share Your Secret Recovery Phrase",
      description:
        "Your recovery phrase is the key to your wallet. Never share it with anyone or store it digitally.",
    },
    {
      icon: "lock-closed-outline",
      title: "Keep Your Password Strong",
      description:
        "Use a unique password with mixed characters. Never reuse passwords from other accounts.",
    },
    {
      icon: "person-circle-outline",
      title: "Be Careful of Scams",
      description:
        "Never give out your wallet credentials. Legitimate services will never ask for your private keys.",
    },
    {
      icon: "document-text-outline",
      title: "Verify All Transactions",
      description:
        "Always double-check transaction details before confirming. Make sure the amount and address are correct.",
    },
  ];

  const securityOptions: SecurityOption[] = [
    {
      id: 'biometric',
      title: 'Enable Biometric',
      description: 'Use Face ID or fingerprint to secure your wallet',
      icon: 'finger-print',
    },
    {
      id: 'backup',
      title: 'Backup to iCloud',
      description: 'Securely store your wallet data in iCloud',
      icon: 'cloud-upload',
    },
    {
      id: 'notifications',
      title: 'Enable Notifications',
      description: 'Get alerts for important wallet activities',
      icon: 'notifications',
    }
  ];

  const toggleOption = (id: string) => {
    const newSelected = new Set(selectedOptions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedOptions(newSelected);
  };

  const handleComplete = async () => {
    try {
      // Store selected security options
      await SecureStore.setItemAsync('securityOptions', JSON.stringify(Array.from(selectedOptions)));
      // Navigate to portfolio
      router.replace('/portfolio');
    } catch (error) {
      console.error('Error saving security options:', error);
    }
  };

  return (
    <OnboardingLayout
      progress={1}
      title="Secure Your Wallet"
      subtitle="Choose additional security options to protect your wallet"
      icon="security"
    >
      <View style={styles.optionsContainer}>
        {securityOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              selectedOptions.has(option.id) && styles.optionCardSelected
            ]}
            onPress={() => toggleOption(option.id)}
          >
            <View style={styles.optionHeader}>
              <Ionicons
                name={option.icon}
                size={24}
                color={selectedOptions.has(option.id) ? COLORS.white : COLORS.primary}
              />
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionTitle,
                  selectedOptions.has(option.id) && styles.optionTitleSelected
                ]}>
                  {option.title}
                </Text>
                <Text style={[
                  styles.optionDescription,
                  selectedOptions.has(option.id) && styles.optionDescriptionSelected
                ]}>
                  {option.description}
                </Text>
              </View>
            </View>
            <Ionicons
              name={selectedOptions.has(option.id) ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={selectedOptions.has(option.id) ? COLORS.white : COLORS.primary}
            />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleComplete}>
        <Text style={styles.buttonText}>Complete Setup</Text>
      </TouchableOpacity>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  optionsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: SPACING.md,
  },
  optionCardSelected: {
    backgroundColor: COLORS.primary,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: COLORS.white,
  },
  optionDescription: {
    color: COLORS.primary,
    fontSize: 14,
  },
  optionDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
}); 