import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Image, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getStoredWallet } from "../../api/walletApi";
import { BlurView } from "expo-blur";
import { COLORS, SPACING } from "../../styles/shared";

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

interface WalletHeaderProps {
  onAccountChange: (account: Account) => void;
  pageName?: string;
}

export default function WalletHeader({ onAccountChange, pageName }: WalletHeaderProps): JSX.Element {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const walletData = await getStoredWallet();
      
      if (walletData) {
        const account: Account = {
          address: walletData.address,
          chainId: walletData.chainId
        };
        setAccounts([account]);
        
        if (!selectedAccount) {
          handleAccountSelection(account);
        }
      }
    } catch (error) {
      console.error('[WalletHeader] Error loading accounts:', error);
      setError('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = useCallback((address: string | undefined): string => {
    if (!address || typeof address !== 'string' || address.length < 10) {
      return "No Account";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const formattedAddress = useMemo(() => {
    return selectedAccount ? formatAddress(selectedAccount.address) : "Select Account";
  }, [selectedAccount?.address, formatAddress]);

  const handleAccountSelection = useCallback((account: Account): void => {
    setSelectedAccount(account);
    setIsDropdownOpen(false);
    onAccountChange(account);
  }, [onAccountChange]);

  return (
    <View style={styles.header}>
      <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
        {/* Left Side - Logo and Title */}
        <View style={styles.leftContainer}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/images/Connect Wallet Logo Large 2.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{pageName || 'Connect Wallet'}</Text>
            <Text style={styles.subtitle}>The Future of Security</Text>
          </View>
        </View>

        {/* Right Side - Account Selector */}
        <TouchableOpacity 
          style={[
            styles.accountButton,
            isLoading && styles.accountButtonDisabled,
            error && styles.accountButtonError
          ]}
          onPress={() => !isLoading && setIsDropdownOpen(true)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.accountText}>Loading...</Text>
          ) : error ? (
            <Text style={styles.accountTextError}>Error</Text>
          ) : (
            <>
              <Text style={styles.accountText}>{formattedAddress}</Text>
              <Ionicons name="chevron-down" size={16} color="white" style={styles.dropdownIcon} />
            </>
          )}
        </TouchableOpacity>

        {/* Account Selection Modal */}
        <Modal
          visible={isDropdownOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsDropdownOpen(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsDropdownOpen(false)}
          >
            <BlurView intensity={20} tint="dark" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Account</Text>
                <TouchableOpacity onPress={() => setIsDropdownOpen(false)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.accountList}>
                {accounts.map((account, index) => (
                  <TouchableOpacity
                    key={account.address}
                    style={[
                      styles.accountOption,
                      selectedAccount?.address === account.address && styles.selectedAccount
                    ]}
                    onPress={() => handleAccountSelection(account)}
                  >
                    <View style={styles.accountIcon}>
                      <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>
                        {account.name || `Account ${index + 1}`}
                      </Text>
                      <Text style={styles.accountAddress}>
                        {formatAddress(account.address)}
                      </Text>
                    </View>
                    {selectedAccount?.address === account.address && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </BlurView>
          </TouchableOpacity>
        </Modal>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 48,
  },
  headerBlur: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    width: 32,
    height: 32,
    marginRight: 12,
    justifyContent: "center",
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    flexDirection: "column",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: "#6A9EFF",
  },
  accountButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  accountText: {
    fontSize: 14,
    color: "white",
    marginRight: 4,
  },
  dropdownIcon: {
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "600",
  },
  accountList: {
    padding: SPACING.md,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  selectedAccount: {
    backgroundColor: "rgba(106, 158, 255, 0.1)",
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(106, 158, 255, 0.1)",
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  accountAddress: {
    color: COLORS.primary,
    fontSize: 14,
  },
  selectedIndicator: {
    marginLeft: SPACING.md,
  },
  accountButtonDisabled: {
    opacity: 0.7,
  },
  accountButtonError: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  accountTextError: {
    color: "#ef4444",
    fontSize: 14,
  },
});