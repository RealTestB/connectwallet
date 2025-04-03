import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Image, Modal, TouchableWithoutFeedback, Animated, Dimensions, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WalletHeader from "../components/ui/WalletHeader";
import BottomNav from "../components/ui/BottomNav";
import { COLORS, SPACING, sharedStyles } from '../styles/shared';
import { useSettings } from '../contexts/SettingsContext';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { NETWORKS } from '../api/config';
import * as SecureStore from 'expo-secure-store';

const MODAL_HEIGHT = Dimensions.get('window').height * 0.7;

interface SettingItem {
  icon: string;
  label: string;
  type: "toggle" | "select" | "button";
  value?: boolean | string;
  onChange?: (value: any) => void;
  onClick?: () => void;
  options?: Array<{ value: string; label: string }>;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, updateSetting, saveLastUsedNetwork } = useSettings();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showNetworkPicker, setShowNetworkPicker] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);

  React.useEffect(() => {
    if ((showLanguagePicker || showCurrencyPicker || showNetworkPicker) && !isClosing) {
      setIsClosing(false);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 5,
      }).start();
    }
  }, [showLanguagePicker, showCurrencyPicker, showNetworkPicker]);

  const handleCloseModal = useCallback(() => {
    setIsClosing(true);
    Animated.timing(slideAnim, {
      toValue: MODAL_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsClosing(false);
      setShowLanguagePicker(false);
      setShowCurrencyPicker(false);
      setShowNetworkPicker(false);
    });
  }, []);

  const handleAccountChange = (account: { address: string; chainId?: number }) => {
    // Handle account change
  };

  const handleChainChange = useCallback(async (chainId: number) => {
    console.log('[Settings] Chain changed:', chainId);
    try {
      // 1. Convert chain ID to network key
      const networkKey = Object.keys(NETWORKS).find(key => 
        NETWORKS[key].chainId === chainId
      ) || 'ethereum';
      
      console.log('[Settings] Saving network key:', networkKey);
      
      // 2. Save to settings context
      await saveLastUsedNetwork(networkKey);
      
      // 3. Update wallet data with new chain
      const walletDataStr = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (walletDataStr) {
        const walletData = JSON.parse(walletDataStr);
        walletData.chainId = chainId;
        await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, JSON.stringify(walletData));
      }
    } catch (error) {
      console.error('[Settings] Error saving chain:', error);
      Alert.alert('Error', 'Failed to save network settings');
    }
  }, [saveLastUsedNetwork]);

  const settingsGroups: SettingGroup[] = [
    {
      title: "General",
      items: [
        {
          icon: "language",
          label: "Language",
          type: "select",
          value: settings.language,
          onChange: (value) => updateSetting(STORAGE_KEYS.SETTINGS.LANGUAGE, value),
          options: [
            { value: "en", label: "English" },
            { value: "es", label: "Español" },
            { value: "fr", label: "Français" },
            { value: "de", label: "Deutsch" },
            { value: "it", label: "Italiano" },
            { value: "pt", label: "Português" },
            { value: "ru", label: "Русский" },
            { value: "zh", label: "中文" },
            { value: "ja", label: "日本語" },
            { value: "ko", label: "한국어" }
          ]
        },
        {
          icon: "cash",
          label: "Currency",
          type: "select",
          value: settings.currency,
          onChange: (value) => updateSetting(STORAGE_KEYS.SETTINGS.CURRENCY, value),
          options: [
            { value: "USD", label: "USD" },
            { value: "EUR", label: "EUR" },
            { value: "GBP", label: "GBP" },
            { value: "JPY", label: "JPY" },
            { value: "CNY", label: "CNY" },
            { value: "KRW", label: "KRW" }
          ]
        },
        {
          icon: "moon",
          label: "Dark Mode",
          type: "toggle",
          value: settings.darkMode,
          onChange: (value) => updateSetting(STORAGE_KEYS.SETTINGS.DARK_MODE, value)
        }
      ]
    },
    {
      title: "About",
      items: [
        {
          icon: "information-circle",
          label: "Version",
          type: "button",
          value: "1.0.0",
          onClick: () => {}
        }
      ]
    }
  ];

  const renderSettingItem = (item: SettingItem) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.settingLabel}>{item.label}</Text>
      </View>
      {item.type === "toggle" && (
        <Switch
          value={item.value as boolean}
          onValueChange={item.onChange}
          trackColor={{ false: "rgba(255, 255, 255, 0.1)", true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      )}
      {item.type === "select" && (
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => {
            if (item.label === "Language") setShowLanguagePicker(true);
            if (item.label === "Currency") setShowCurrencyPicker(true);
          }}
        >
          <Text style={styles.selectButtonText}>
            {item.options?.find(opt => opt.value === item.value)?.label}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      )}
      {item.type === "button" && (
        <TouchableOpacity onPress={item.onClick}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[sharedStyles.container, { paddingTop: insets.top }]}>
      <Image 
        source={require('../assets/background.png')} 
        style={sharedStyles.backgroundImage}
      />

      <WalletHeader 
        onAccountChange={handleAccountChange}
        pageName="Settings"
        onChainChange={handleChainChange}
      />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.groupsContainer}
        showsVerticalScrollIndicator={false}
      >
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.card}>
              {group.items.map((item, itemIndex) => (
                <View 
                  key={itemIndex}
                  style={[
                    styles.itemContainer,
                    itemIndex < group.items.length - 1 && styles.itemBorder
                  ]}
                >
                  {renderSettingItem(item)}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        transparent
        visible={(showLanguagePicker || showCurrencyPicker) || isClosing}
        onRequestClose={handleCloseModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View 
                style={[
                  styles.modalContainer,
                  {
                    transform: [{ translateY: slideAnim }],
                  }
                ]}
              >
                <Image
                  source={require('../assets/background.png')}
                  style={styles.modalBackground}
                />
                
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {showLanguagePicker ? 'Select Language' : 
                     showCurrencyPicker ? 'Select Currency' : 
                     'Select Network'}
                  </Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleCloseModal}
                  >
                    <Ionicons name="close" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalList}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalListContent}
                >
                  {showLanguagePicker && settingsGroups[0].items[0].options?.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modalOption,
                        settings.language === option.value && styles.modalOptionSelected
                      ]}
                      onPress={() => {
                        updateSetting(STORAGE_KEYS.SETTINGS.LANGUAGE, option.value);
                        handleCloseModal();
                      }}
                    >
                      <Text style={[
                        styles.modalOptionText,
                        settings.language === option.value && styles.modalOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                      {settings.language === option.value && (
                        <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}

                  {showCurrencyPicker && settingsGroups[0].items[1].options?.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modalOption,
                        settings.currency === option.value && styles.modalOptionSelected
                      ]}
                      onPress={() => {
                        updateSetting(STORAGE_KEYS.SETTINGS.CURRENCY, option.value);
                        handleCloseModal();
                      }}
                    >
                      <Text style={[
                        styles.modalOptionText,
                        settings.currency === option.value && styles.modalOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                      {settings.currency === option.value && (
                        <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <BottomNav activeTab="settings" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  groupsContainer: {
    paddingTop: SPACING.md,
    paddingBottom: 100,
  },
  group: {
    marginBottom: SPACING.xl,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.sm,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  itemContainer: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  settingLabel: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: MODAL_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: SPACING.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalList: {
    flex: 1,
  },
  modalListContent: {
    padding: SPACING.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORS.white,
  },
  modalOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
}); 