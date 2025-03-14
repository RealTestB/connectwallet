import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WalletHeader from "../components/ui/WalletHeader";
import BottomNav from "../components/ui/BottomNav";

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
          <Ionicons name={item.icon as any} size={20} color="#93c5fd" />
        </View>
        <Text style={styles.settingLabel}>{item.label}</Text>
      </View>
      {item.type === "toggle" && (
        <Switch
          value={item.value as boolean}
          onValueChange={item.onChange}
          trackColor={{ false: "#4B5563", true: "#2563EB" }}
          thumbColor="white"
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
          <Ionicons name="chevron-forward" size={20} color="#93c5fd" />
        </TouchableOpacity>
      )}
      {item.type === "button" && (
        <TouchableOpacity onPress={item.onClick}>
          <Ionicons name="chevron-forward" size={20} color="#93c5fd" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={["#1A2F6C", "#0A1B3F"]}
      style={styles.container}
    >
      <WalletHeader 
        pageName="Settings"
        onAccountChange={handleAccountChange}
        leftButton={{
          icon: "arrow-back-outline",
          onPress: () => router.push("/portfolio"),
        }}
      />

      <ScrollView 
        style={[
          styles.content,
          {
            paddingBottom: 64 + insets.bottom,
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customize your wallet experience</Text>
        </View>

        <View style={styles.groupsContainer}>
          {settingsGroups.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.title}</Text>
              </View>
              <View style={styles.groupContent}>
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

      <BottomNav activeTab="settings" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 100, // Adjust based on WalletHeader height
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#93c5fd",
  },
  groupsContainer: {
    gap: 24,
  },
  group: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  groupHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  groupContent: {
    // Group content styles
  },
  itemContainer: {
    padding: 16,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(37, 99, 235, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    color: "white",
    fontSize: 16,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectButtonText: {
    color: "white",
    fontSize: 14,
  },
}); 