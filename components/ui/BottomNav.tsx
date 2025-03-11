import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

type TabId = "portfolio" | "nft" | "pay" | "receive" | "settings";

type RootStackParamList = {
  Portfolio: undefined;
  NFT: undefined;
  Pay: undefined;
  Receive: undefined;
  Settings: undefined;
};

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  route: keyof RootStackParamList;
}

interface BottomNavProps {
  activeTab?: TabId;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function BottomNav({ activeTab = "portfolio" }: BottomNavProps): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  
  const tabs: Tab[] = [
    { id: "portfolio", label: "Portfolio", icon: "💰", route: "Portfolio" },
    { id: "nft", label: "NFT", icon: "🖼️", route: "NFT" },
    { id: "pay", label: "Pay", icon: "📤", route: "Pay" },
    { id: "receive", label: "Receive", icon: "📥", route: "Receive" },
    { id: "settings", label: "Settings", icon: "⚙️", route: "Settings" },
  ];

  return (
    <View style={styles.navContainer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => navigation.navigate(tab.route)}
          style={styles.tabButton}
        >
          <Text style={[styles.icon, activeTab === tab.id && styles.activeTab]}>{tab.icon}</Text>
          <Text style={[styles.label, activeTab === tab.id && styles.activeTab]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#1A2F6C",
    paddingVertical: 12,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabButton: {
    alignItems: "center",
  },
  icon: {
    fontSize: 20,
    color: "#6A9EFF",
  },
  label: {
    fontSize: 12,
    color: "#6A9EFF",
  },
  activeTab: {
    color: "white",
    fontWeight: "bold",
  },
}); 