import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Image, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WalletHeader from "../components/ui/WalletHeader";
import BottomNav from "../components/ui/BottomNav";
import { COLORS, SPACING, sharedStyles } from '../styles/shared';

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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("USD");
  const [network, setNetwork] = useState("ethereum");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showNetworkPicker, setShowNetworkPicker] = useState(false);

  const settingsGroups: SettingGroup[] = [
    {
      title: "General",
      items: [
        {
          icon: "moon",
          label: "Dark Mode",
          type: "toggle",
          value: isDarkMode,
          onChange: setIsDarkMode,
        },
        {
          icon: "globe",
          label: "Language",
          type: "select",
          value: language,
          onChange: setLanguage,
          options: [
            { value: "en", label: "English" },
            { value: "es", label: "Español" },
            { value: "fr", label: "Français" },
            { value: "de", label: "Deutsch" },
          ],
        },
        {
          icon: "cash",
          label: "Currency",
          type: "select",
          value: currency,
          onChange: setCurrency,
          options: [
            { value: "USD", label: "USD" },
            { value: "EUR", label: "EUR" },
            { value: "GBP", label: "GBP" },
            { value: "JPY", label: "JPY" },
          ],
        },
      ],
    },
    {
      title: "Network",
      items: [
        {
          icon: "git-network",
          label: "Default Network",
          type: "select",
          value: network,
          onChange: setNetwork,
          options: [
            { value: "ethereum", label: "Ethereum" },
            { value: "polygon", label: "Polygon" },
            { value: "arbitrum", label: "Arbitrum" },
            { value: "optimism", label: "Optimism" },
          ],
        },
      ],
    },
    {
      title: "Security",
      items: [
        {
          icon: "lock-closed",
          label: "Change Password",
          type: "button",
          onClick: () => {},
        },
        {
          icon: "shield",
          label: "Two-Factor Authentication",
          type: "button",
          onClick: () => {},
        },
        {
          icon: "key",
          label: "Recovery Phrase",
          type: "button",
          onClick: () => {},
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: "help-circle",
          label: "Help Center",
          type: "button",
          onClick: () => {},
        },
        {
          icon: "paper-plane",
          label: "Contact Support",
          type: "button",
          onClick: () => {},
        },
      ],
    },
  ];

  const handleAccountChange = (account: { address: string; chainId?: number }) => {
    // Handle account change
  };

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
            if (item.label === "Default Network") setShowNetworkPicker(true);
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

  const renderOptionPicker = (
    visible: boolean,
    onClose: () => void,
    options: Array<{ value: string; label: string }>,
    selectedValue: string,
    onSelect: (value: string) => void,
    title: string
  ) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  index < options.length - 1 && styles.modalOptionBorder,
                  option.value === selectedValue && styles.modalOptionSelected
                ]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  option.value === selectedValue && styles.modalOptionTextSelected
                ]}>
                  {option.label}
                </Text>
                {option.value === selectedValue && (
                  <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={sharedStyles.container}>
      <Image 
        source={require('../assets/background.png')} 
        style={sharedStyles.backgroundImage}
      />

      <WalletHeader 
        onAccountChange={handleAccountChange}
      />

      <ScrollView 
        style={[styles.content, { paddingTop: insets.top + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.groupsContainer}>
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
        </View>
      </ScrollView>

      {renderOptionPicker(
        showLanguagePicker,
        () => setShowLanguagePicker(false),
        settingsGroups[0].items[1].options!,
        language,
        setLanguage,
        "Select Language"
      )}

      {renderOptionPicker(
        showCurrencyPicker,
        () => setShowCurrencyPicker(false),
        settingsGroups[0].items[2].options!,
        currency,
        setCurrency,
        "Select Currency"
      )}

      {renderOptionPicker(
        showNetworkPicker,
        () => setShowNetworkPicker(false),
        settingsGroups[1].items[0].options!,
        network,
        setNetwork,
        "Select Network"
      )}

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
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalList: {
    padding: SPACING.md,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  modalOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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