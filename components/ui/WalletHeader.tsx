import React, { useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Image, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { COLORS, SPACING } from "../../styles/shared";
import { CHAINS, getChainById } from "../../constants/chains";
import { useChain } from "../../contexts/ChainContext";
import { useWalletAccounts } from "../../contexts/WalletAccountsContext";

// Add chain logo mapping
const CHAIN_LOGOS: { [key: number]: any } = {
  1: require('../../assets/images/ethereum.png'),
  137: require('../../assets/images/polygon.png'),
  42161: require('../../assets/images/arbitrum.png'),
  10: require('../../assets/images/optimism.png'),
  56: require('../../assets/images/bnb.png'),
  43114: require('../../assets/images/avalanche.png'),
  8453: require('../../assets/images/base.png')
};

interface WalletHeaderProps {
  onAccountChange?: (account: { address: string; chainId: number }) => void;
  pageName?: string;
  onPress?: () => void;
  onChainChange?: (chainId: number) => Promise<void>;
}

export default function WalletHeader({ onAccountChange, pageName, onPress, onChainChange }: WalletHeaderProps): JSX.Element {
  const { currentChainId, setChainId } = useChain();
  const { accounts, currentAccount, isLoading, error, switchAccount } = useWalletAccounts();
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Memoize the accounts list to prevent unnecessary re-renders
  const accountsList = useMemo(() => accounts || [], [accounts]);

  const formatAddress = useCallback((address: string | undefined): string => {
    if (!address || typeof address !== 'string' || address.length < 10) {
      return "No Account";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const handleChainSelection = useCallback(async (chainId: number) => {
    setIsChainDropdownOpen(false);
    try {
      await setChainId(chainId);
      if (onChainChange) {
        await onChainChange(chainId);
      }
      if (currentAccount && onAccountChange) {
        onAccountChange({ address: currentAccount.address, chainId });
      }
    } catch (error) {
      console.error('Failed to update chain:', error);
    }
  }, [currentAccount, onAccountChange, setChainId, onChainChange]);

  const handleAccountSelection = useCallback(async (account: { id: string; address: string }) => {
    setIsDropdownOpen(false);
    try {
      await switchAccount(account.id);
      if (onAccountChange) {
        onAccountChange({ address: account.address, chainId: currentChainId });
      }
    } catch (error) {
      console.error('Failed to switch account:', error);
    }
  }, [currentChainId, onAccountChange, switchAccount]);

  const handleOpenAccountModal = useCallback(() => {
    if (onPress) {
      onPress();
    } else if (!isLoading) {
      setIsDropdownOpen(true);
    }
  }, [onPress, isLoading]);

  const handleOpenChainModal = useCallback(() => {
    if (!isLoading) {
      setIsChainDropdownOpen(true);
    }
  }, [isLoading]);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

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
            style={[styles.chainButton, (isLoading || isUpdating) && styles.buttonDisabled]}
            onPress={handleOpenChainModal}
            disabled={isLoading || isUpdating}
          >
            <Image 
              source={CHAIN_LOGOS[currentChainId || 1]}
              style={styles.chainIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Account Selector */}
          <TouchableOpacity 
            style={[
              styles.accountButton, 
              (isLoading || isUpdating) && styles.buttonDisabled
            ]}
            onPress={handleOpenAccountModal}
            disabled={isLoading || isUpdating}
          >
            <Text style={styles.accountText}>
              {isLoading ? "Loading..." : currentAccount ? formatAddress(currentAccount.address) : "Select Account"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="white" style={styles.dropdownIcon} />
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
                {Object.values(CHAINS).map((chain) => (
                  <TouchableOpacity
                    key={chain.chainId}
                    style={[
                      styles.accountOption,
                      currentChainId === chain.chainId && styles.selectedAccount
                    ]}
                    onPress={() => handleChainSelection(chain.chainId)}
                  >
                    <View style={styles.accountIcon}>
                      <Image 
                        source={CHAIN_LOGOS[chain.chainId]}
                        style={styles.chainIcon}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{chain.name}</Text>
                    </View>
                    {currentChainId === chain.chainId && (
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
                {accountsList.map((account, index) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountOption,
                      currentAccount?.id === account.id && styles.selectedAccount
                    ]}
                    onPress={() => handleAccountSelection(account)}
                  >
                    <View style={styles.accountIcon}>
                      <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>Account {index + 1}</Text>
                      <Text style={styles.accountAddress}>{formatAddress(account.address)}</Text>
                    </View>
                    {currentAccount?.id === account.id && (
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
  buttonDisabled: {
    opacity: 0.5,
  },
  errorContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    margin: SPACING.md,
  },
  errorText: {
    color: COLORS.white,
    textAlign: "center",
  }
});