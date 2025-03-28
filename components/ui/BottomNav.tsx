import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

type TabId = "portfolio" | "nft" | "pay" | "receive" | "settings";

interface Tab {
  id: TabId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

interface BottomNavProps {
  activeTab?: TabId;
}

export default function BottomNav({ activeTab = "portfolio" }: BottomNavProps): JSX.Element {
  const router = useRouter();
  
  const tabs: Tab[] = [
    { id: "portfolio", label: "Portfolio", icon: "wallet-outline", route: "/portfolio" },
    { id: "nft", label: "NFT", icon: "grid-outline", route: "/nft" },
    { id: "pay", label: "Pay", icon: "swap-horizontal-outline", route: "/pay" },
    { id: "receive", label: "Receive", icon: "download-outline", route: "/receive" },
    { id: "settings", label: "Settings", icon: "settings-outline", route: "/settings" },
  ];

  const handleTabPress = (route: string) => {
    router.push(route);
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
        <View style={styles.navContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => handleTabPress(tab.route)}
              style={styles.tabButton}
            >
              <Ionicons
                name={tab.icon}
                size={24}
                color={activeTab === tab.id ? "#FFFFFF" : "#6A9EFF"}
                style={styles.icon}
              />
              <Text style={[
                styles.label,
                activeTab === tab.id && styles.activeLabel
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  blurContainer: {
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 28,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: "#6A9EFF",
  },
  activeLabel: {
    color: "#FFFFFF",
  },
}); 