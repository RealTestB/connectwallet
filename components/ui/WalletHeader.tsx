import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Image, Alert, ImageSourcePropType } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { getStoredWallet } from "../../api/walletApi";
import { BlurView } from "expo-blur";
import { COLORS, SPACING } from "../../styles/shared";
import { CHAINS, getChainById } from "../../constants/chains";
import { useChain } from "../../contexts/ChainContext";

// Add chain logo mapping
const CHAIN_LOGOS: { [key: number]: any } = {
  1: require('../../assets/images/ethereum.png'),
  137: require('../../assets/images/polygon.png'),
  42161: require('../../assets/images/arbitrum.png'),
  10: require('../../assets/images/Optimism.png'),
  56: require('../../assets/images/bnb.png'),
  43114: require('../../assets/images/avalanche.png'),
  8453: require('../../assets/images/base.png')
};

interface Account {
  address: string;
  name?: string;
  chainId: number;
}

interface WalletHeaderProps {
  onAccountChange: (account: Account) => void;
  pageName?: string;
  onPress?: () => void;
  onChainChange?: (chainId: number) => Promise<void>;
}

export default function WalletHeader({ onAccountChange, pageName, onPress, onChainChange }: WalletHeaderProps): JSX.Element {
  const { currentChainId, setChainId } = useChain();
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const walletData = await getStoredWallet();
      if (!walletData) {
        throw new Error('No wallet data found');
      }

      const accountsList: Account[] = [
        {
          address: walletData.address,
          chainId: currentChainId || 1
        }
      ];

      setAccounts(accountsList);
      setSelectedAccount(accountsList[0]);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setError('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  }, [currentChainId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const formatAddress = useCallback((address: string | undefined): string => {
    if (!address || typeof address !== 'string' || address.length < 10) {
      return "No Account";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const getChainName = useCallback((chainId: number): string => {
    const chain = getChainById(chainId);
    return chain?.name || 'Unknown Chain';
  }, []);

  const formattedAddress = useMemo(() => {
    if (!selectedAccount) return "Select Account";
    return formatAddress(selectedAccount.address);
  }, [selectedAccount?.address, formatAddress]);

  const handleAccountSelection = useCallback((account: Account): void => {
    setSelectedAccount(account);
    setIsDropdownOpen(false);
    onAccountChange(account);
  }, [onAccountChange]);

  const handleChainSelection = useCallback(async (chainId: number): Promise<void> => {
    console.log('[WalletHeader] Chain selection started:', {
      newChainId: chainId,
      currentChainId,
      selectedAccount: selectedAccount?.address
    });

    try {
      // Update chain ID in context (this will handle storage updates)
      await setChainId(chainId);

      // Update selected account with new chain
      if (selectedAccount) {
        const updatedAccount = { ...selectedAccount, chainId };
        setSelectedAccount(updatedAccount);
        onAccountChange(updatedAccount);
      }

      // Call onChainChange if provided
      if (onChainChange) {
        await onChainChange(chainId);
      }
    } catch (error) {
      console.error('[WalletHeader] Error updating chain:', error);
      Alert.alert('Error', 'Failed to update network. Please try again.');
    }

    setIsChainDropdownOpen(false);
  }, [selectedAccount, onAccountChange, setChainId, currentChainId, onChainChange]);

  // Update selectedAccount when currentChainId changes
  useEffect(() => {
    if (currentChainId && selectedAccount) {
      const updatedAccount = { ...selectedAccount, chainId: currentChainId };
      setSelectedAccount(updatedAccount);
    }
  }, [currentChainId]);

  // Force re-render when chain changes
  useEffect(() => {
    console.log('[WalletHeader] Chain changed:', currentChainId);
  }, [currentChainId]);

  useEffect(() => {
    console.log('[WalletHeader] Component mounted/updated:', {
      currentChainId,
      selectedAccount: selectedAccount?.address,
      selectedAccountChainId: selectedAccount?.chainId
    });
  }, [currentChainId, selectedAccount]);

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

        {/* Right Side - Chain and Account Selectors */}
        <View style={styles.rightContainer}>
          {/* Chain Selector */}
          <TouchableOpacity 
            style={styles.chainButton}
            onPress={() => setIsChainDropdownOpen(true)}
          >
            <Image 
              source={CHAIN_LOGOS[selectedAccount?.chainId || currentChainId || 1]}
              style={styles.chainIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Account Selector */}
          <TouchableOpacity 
            style={[
              styles.accountButton,
              isLoading && styles.accountButtonDisabled,
              error && styles.accountButtonError
            ]}
            onPress={() => {
              if (onPress) {
                onPress();
              } else if (!isLoading) {
                setIsDropdownOpen(true);
              }
            }}
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
        </View>

        {/* Chain Selection Modal */}
        <Modal
          visible={isChainDropdownOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsChainDropdownOpen(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsChainDropdownOpen(false)}
          >
            <BlurView intensity={20} tint="dark" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Network</Text>
                <TouchableOpacity onPress={() => setIsChainDropdownOpen(false)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.accountList}>
                {[
                  { id: 1, name: 'Ethereum' },
                  { id: 137, name: 'Polygon' },
                  { id: 42161, name: 'Arbitrum' },
                  { id: 10, name: 'Optimism' },
                  { id: 56, name: 'BSC' },
                  { id: 43114, name: 'Avalanche' },
                  { id: 8453, name: 'Base' }
                ].map((chain) => (
                  <TouchableOpacity
                    key={chain.id}
                    style={[
                      styles.accountOption,
                      (selectedAccount?.chainId || currentChainId) === chain.id && styles.selectedAccount
                    ]}
                    onPress={() => handleChainSelection(chain.id)}
                  >
                    <View style={styles.accountIcon}>
                      <Image 
                        source={CHAIN_LOGOS[chain.id]}
                        style={styles.chainIcon}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{chain.name}</Text>
                    </View>
                    {(selectedAccount?.chainId || currentChainId) === chain.id && (
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
                        Account {index + 1}
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
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chainButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chainIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    borderRadius: 8,
    marginBottom: SPACING.sm,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  selectedAccount: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    color: COLORS.white,
    marginBottom: 2,
  },
  accountAddress: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  selectedIndicator: {
    marginLeft: SPACING.md,
  },
  accountButtonDisabled: {
    opacity: 0.5,
  },
  accountButtonError: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
  },
  accountTextError: {
    color: "#FF4444",
  }
});