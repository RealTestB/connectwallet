import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWalletAccounts } from '../contexts/WalletAccountsContext';
import { COLORS, SPACING, sharedStyles } from '../styles/shared';

export default function ManageAccountsScreen() {
  const router = useRouter();
  const {
    accounts,
    currentAccount,
    isLoading,
    error,
    addAccount,
    importPrivateKey,
    switchAccount,
    renameAccount,
    setPrimaryAccount,
    removeAccount,
  } = useWalletAccounts();

  const [showImportModal, setShowImportModal] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const handleAddAccount = async () => {
    try {
      await addAccount();
      Alert.alert('Success', 'New account created successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create account');
    }
  };

  const handleImport = async () => {
    if (!privateKey) {
      Alert.alert('Error', 'Please enter a private key');
      return;
    }

    try {
      setIsImporting(true);
      await importPrivateKey(privateKey, accountName);
      setShowImportModal(false);
      setPrivateKey('');
      setAccountName('');
      Alert.alert('Success', 'Account imported successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to import account');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRename = async () => {
    if (!selectedAccountId || !newName) return;

    try {
      await renameAccount(selectedAccountId, newName);
      setShowRenameModal(false);
      setSelectedAccountId(null);
      setNewName('');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to rename account');
    }
  };

  const handleRemove = (accountId: string) => {
    Alert.alert(
      'Remove Account',
      'Are you sure you want to remove this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAccount(accountId);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove account');
            }
          },
        },
      ]
    );
  };

  const renderAccount = (account: {
    id: string;
    name: string;
    address: string;
    isPrimary: boolean;
  }) => (
    <View key={account.id} style={styles.accountCard}>
      <View style={styles.accountInfo}>
        <View style={styles.accountHeader}>
          <Text style={styles.accountName}>{account.name}</Text>
          {account.isPrimary && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryText}>Primary</Text>
            </View>
          )}
        </View>
        <Text style={styles.accountAddress}>
          {account.address.slice(0, 6)}...{account.address.slice(-4)}
        </Text>
      </View>

      <View style={styles.accountActions}>
        {!account.isPrimary && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setPrimaryAccount(account.id)}
          >
            <Ionicons name="star-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedAccountId(account.id);
            setNewName(account.name);
            setShowRenameModal(true);
          }}
        >
          <Ionicons name="pencil" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {!account.isPrimary && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemove(account.id)}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[sharedStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <Image 
        source={require('../assets/background.png')} 
        style={sharedStyles.backgroundImage}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Accounts</Text>
      </View>

      <ScrollView style={styles.content}>
        {accounts.map(renderAccount)}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.addButton]}
            onPress={handleAddAccount}
          >
            <Ionicons name="add" size={24} color={COLORS.white} />
            <Text style={styles.buttonText}>Add Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.importButton]}
            onPress={() => setShowImportModal(true)}
          >
            <Ionicons name="key" size={24} color={COLORS.white} />
            <Text style={styles.buttonText}>Import Private Key</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Import Modal */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Import Private Key</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Account Name (optional)"
              placeholderTextColor={COLORS.textSecondary}
              value={accountName}
              onChangeText={setAccountName}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter Private Key"
              placeholderTextColor={COLORS.textSecondary}
              value={privateKey}
              onChangeText={setPrivateKey}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowImportModal(false);
                  setPrivateKey('');
                  setAccountName('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.importButton]}
                onPress={handleImport}
                disabled={isImporting}
              >
                {isImporting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonText}>Import</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Account</Text>
            
            <TextInput
              style={styles.input}
              placeholder="New Account Name"
              placeholderTextColor={COLORS.textSecondary}
              value={newName}
              onChangeText={setNewName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRenameModal(false);
                  setSelectedAccountId(null);
                  setNewName('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.importButton]}
                onPress={handleRename}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: 40,
  },
  backButton: {
    marginRight: SPACING.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  accountCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  accountInfo: {
    marginBottom: SPACING.sm,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: SPACING.sm,
  },
  primaryBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  accountAddress: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  accountActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  buttonContainer: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  addButton: {
    backgroundColor: COLORS.primary,
  },
  importButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.lg,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: SPACING.md,
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  modalButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
}); 