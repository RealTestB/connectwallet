import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storageKeys';
import WalletHeader from "../components/ui/WalletHeader";
import BottomNav from "../components/ui/BottomNav";
import { COLORS, SPACING, sharedStyles } from '../styles/shared';
import { useRouter } from 'expo-router';

export default function ReceiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleAccountChange = (account: { address: string }) => {
    setWalletAddress(account.address);
  };

  useEffect(() => {
    loadWalletAddress();
  }, []);

  const loadWalletAddress = async () => {
    try {
      const address = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_ADDRESS);
      if (address) {
        setWalletAddress(address);
      }
    } catch (error) {
      console.error('Error loading wallet address:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <View style={sharedStyles.container}>
      <Image 
        source={require('../assets/background.png')} 
        style={sharedStyles.backgroundImage}
      />

      <WalletHeader 
        onAccountChange={handleAccountChange}
      />

      <View style={[styles.content, { paddingTop: insets.top + 80 }]}>
        <View style={styles.card}>
          <View style={styles.qrSection}>
            <View style={styles.qrHeader}>
              <Text style={styles.qrLabel}>Receive Tokens</Text>
              <TouchableOpacity 
                style={styles.scanButton}
                onPress={() => router.push('/scan-qr')}
              >
                <Ionicons name="scan" size={20} color={COLORS.white} />
                <Text style={styles.scanButtonText}>Scan QR</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.qrContainer}>
              {walletAddress && (
                <QRCode
                  value={walletAddress}
                  size={200}
                  backgroundColor='white'
                  color='black'
                />
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.addressBox} 
            onPress={copyToClipboard}
            activeOpacity={0.7}
          >
            <Text style={styles.address}>{walletAddress}</Text>
            <Ionicons 
              name={copied ? "checkmark" : "copy-outline"} 
              size={20} 
              color={copied ? COLORS.success : COLORS.white} 
            />
          </TouchableOpacity>
          
          <Text style={styles.helperText}>
            Tap address to copy to clipboard
          </Text>
        </View>
      </View>

      <BottomNav activeTab="receive" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: SPACING.lg,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.md,
  },
  qrLabel: {
    fontSize: 16,
    color: COLORS.white,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  scanButtonText: {
    color: COLORS.white,
    marginLeft: SPACING.xs,
    fontSize: 14,
  },
  qrContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 12,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: SPACING.md,
  },
  address: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: SPACING.sm,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
}); 