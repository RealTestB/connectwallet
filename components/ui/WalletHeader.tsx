import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";
import * as SecureStore from "expo-secure-store";

interface Account {
  address: string;
  name?: string;
  chainId?: number;
}

interface WalletHeaderProps {
  pageName: string;
  onAccountChange: (account: Account) => void;
}

export default function WalletHeader({ pageName, onAccountChange }: WalletHeaderProps): JSX.Element {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async (): Promise<void> => {
    try {
      console.log('[WalletHeader] Loading accounts...');
      const accountsJson = await SecureStore.getItemAsync("walletAccounts");
      console.log('[WalletHeader] Accounts data from storage:', accountsJson ? 'Found' : 'Not found');
      
      if (accountsJson) {
        const loadedAccounts = JSON.parse(accountsJson) as Account[];
        console.log('[WalletHeader] Parsed accounts count:', loadedAccounts.length);
        setAccounts(loadedAccounts);
        
        if (!selectedAccount && loadedAccounts.length > 0) {
          console.log('[WalletHeader] Setting default account:', loadedAccounts[0].address);
          handleAccountSelection(loadedAccounts[0]);
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
      {/* Left Side - Page Title */}
      <View style={styles.titleContainer}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>⚡</Text>
        </View>
        <Text style={styles.pageTitle}>{pageName}</Text>
      </View>

      {/* Right Side - Account Selector */}
      <TouchableOpacity 
        style={styles.accountButton}
        onPress={() => setIsDropdownOpen(true)}
      >
        <Text style={styles.accountText}>
          {selectedAccount ? formatAddress(selectedAccount.address) : "Select Account"}
        </Text>
        <Text style={styles.dropdownIcon}>▼</Text>
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 32,
    height: 32,
    backgroundColor: "#6A9EFF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  iconText: {
    fontSize: 16,
    color: "white",
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  accountButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  accountText: {
    fontSize: 14,
    color: "white",
    marginRight: 8,
  },
  dropdownIcon: {
    fontSize: 12,
    color: "white",
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