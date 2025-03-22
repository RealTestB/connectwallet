import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getStoredWallet } from "../../api/walletApi";

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

interface WalletHeaderProps {
  onAccountChange: (account: Account) => void;
}

export default function WalletHeader({ onAccountChange }: WalletHeaderProps): JSX.Element {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async (): Promise<void> => {
    try {
      console.log('[WalletHeader] Loading accounts...');
      const walletData = await getStoredWallet();
      console.log('[WalletHeader] Wallet data:', walletData ? 'Found' : 'Not found');
      
      if (walletData) {
        const account: Account = {
          address: walletData.address,
          chainId: walletData.chainId
        };
        setAccounts([account]);
        
        if (!selectedAccount) {
          console.log('[WalletHeader] Setting default account:', account.address);
          handleAccountSelection(account);
        }
      }
    } catch (error) {
      console.error("[WalletHeader] Failed to load accounts:", error);
      if (error instanceof Error) {
        console.error("[WalletHeader] Error details:", error.message);
        console.error("[WalletHeader] Error stack:", error.stack);
      }
    }
  };

  const formatAddress = (address: string | undefined): string => {
    console.log('[WalletHeader] Formatting address:', typeof address, address ? `${address.substring(0, 6)}...` : 'undefined');
    
    if (!address) {
      console.log('[WalletHeader] Address is undefined or null');
      return "No Account";
    }
    
    if (typeof address !== 'string') {
      console.log('[WalletHeader] Address is not a string type:', typeof address);
      return "No Account";
    }
    
    if (address.length < 10) {
      console.log('[WalletHeader] Address too short:', address.length);
      return address;
    }
    
    try {
      const formatted = `${address.slice(0, 6)}...${address.slice(-4)}`;
      console.log('[WalletHeader] Successfully formatted address:', formatted);
      return formatted;
    } catch (error) {
      console.error('[WalletHeader] Error formatting address:', error);
      if (error instanceof Error) {
        console.error('[WalletHeader] Error details:', error.message);
        console.error('[WalletHeader] Error stack:', error.stack);
      }
      return address;
    }
  };

  const handleAccountSelection = (account: Account): void => {
    console.log('[WalletHeader] Selecting account:', account.address);
    setSelectedAccount(account);
    setIsDropdownOpen(false);
    onAccountChange(account);
  };

  return (
    <View style={styles.header}>
      {/* Left Side - Logo and Title */}
      <View style={styles.leftContainer}>
        <View style={styles.logoContainer}>
          <Ionicons name="flash" size={20} color="white" />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Connect Wallet</Text>
          <Text style={styles.subtitle}>The Future of Security</Text>
        </View>
      </View>

      {/* Right Side - Account Selector */}
      <TouchableOpacity 
        style={styles.accountButton}
        onPress={() => setIsDropdownOpen(true)}
      >
        <Text style={styles.accountText}>
          {selectedAccount ? formatAddress(selectedAccount.address) : "Select Account"}
        </Text>
        <Ionicons name="chevron-down" size={16} color="white" style={styles.dropdownIcon} />
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
          <View style={styles.modalContent}>
            <ScrollView>
              {accounts.map((account, index) => (
                <TouchableOpacity
                  key={account.address}
                  style={[
                    styles.accountOption,
                    selectedAccount?.address === account.address && styles.selectedAccount
                  ]}
                  onPress={() => handleAccountSelection(account)}
                >
                  <Text style={styles.accountOptionText}>
                    {account.name || `Account ${index + 1}`}
                  </Text>
                  <Text style={styles.accountAddressText}>
                    {formatAddress(account.address)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1A2F6C",
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingTop: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    width: 32,
    height: 32,
    backgroundColor: "#6A9EFF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
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
    backgroundColor: "#1A2F6C",
    borderRadius: 12,
    width: "80%",
    maxHeight: "70%",
    padding: 16,
  },
  accountOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  selectedAccount: {
    backgroundColor: "rgba(106, 158, 255, 0.1)",
  },
  accountOptionText: {
    color: "white",
    fontSize: 16,
    marginBottom: 4,
  },
  accountAddressText: {
    color: "#6A9EFF",
    fontSize: 14,
  },
});