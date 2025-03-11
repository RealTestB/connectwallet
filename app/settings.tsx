import { useSettings } from "../contexts/SettingsContext";
import { Picker } from "@react-native-picker/picker";
import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

interface Settings {
  darkMode: boolean;
  language: string;
  currency: string;
}

interface SettingsContextType {
  settings: Settings;
  updateSetting: (key: keyof Settings, value: string | boolean) => void;
}

export default function SettingsScreen(): JSX.Element {
  const { settings, updateSetting } = useSettings() as SettingsContextType;

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Settings</Text>

      {/* 🔹 Dark Mode Toggle */}
      <View style={styles.settingRow}>
        <Text style={styles.label}>Dark Mode</Text>
        <Switch
          value={settings.darkMode}
          onValueChange={(value: boolean) => updateSetting("darkMode", value)}
        />
      </View>

      {/* 🔹 Language Selection */}
      <View style={styles.settingRow}>
        <Text style={styles.label}>Language</Text>
        <Picker
          selectedValue={settings.language}
          onValueChange={(value: string) => updateSetting("language", value)}
          style={styles.picker}
        >
          {/* Language Options */}
          <Picker.Item label="English" value="en" />
          <Picker.Item label="Español" value="es" />
          <Picker.Item label="Français" value="fr" />
        </Picker>
      </View>

      {/* 🔹 Currency Selection */}
      <View style={styles.settingRow}>
        <Text style={styles.label}>Currency</Text>
        <Picker
          selectedValue={settings.currency}
          onValueChange={(value: string) => updateSetting("currency", value)}
          style={styles.picker}
        >
          {/* Currency Options */}
          <Picker.Item label="USD - US Dollar" value="USD" />
          <Picker.Item label="EUR - Euro" value="EUR" />
          <Picker.Item label="GBP - British Pound" value="GBP" />
          <Picker.Item label="JPY - Japanese Yen" value="JPY" />
        </Picker>
      </View>
    </View>
  );
}

/* Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1B3F",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 20,
  },
  settingRow: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  label: {
    color: "white",
    fontSize: 16,
    marginBottom: 5,
  },
  picker: {
    color: "white",
  },
}); 