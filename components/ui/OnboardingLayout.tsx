import React from 'react';
import { View, Text, Image, ScrollView } from 'react-native';
import { sharedStyles, COLORS, SPACING } from '../../styles/shared';
import { MaterialIcons } from '@expo/vector-icons';

interface OnboardingLayoutProps {
  progress?: number;
  title: string;
  subtitle: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  children: React.ReactNode;
}

export default function OnboardingLayout({
  progress,
  title,
  subtitle,
  icon,
  children
}: OnboardingLayoutProps): JSX.Element {
  return (
    <View style={sharedStyles.container}>
      <Image source={require('../../assets/background.png')} style={sharedStyles.backgroundImage} />
      
      {/* Progress Bar */}
      {progress !== undefined && (
        <View style={[sharedStyles.progressBar, { width: `${progress * 100}%` }]} />
      )}
      
      <ScrollView style={sharedStyles.contentContainer} showsVerticalScrollIndicator={false}>
        {icon && (
          <MaterialIcons 
            name={icon}
            size={32}
            color={COLORS.primary}
            style={sharedStyles.iconSpacing}
          />
        )}
        
        <Text style={sharedStyles.title}>{title}</Text>
        <Text style={sharedStyles.subtitle}>{subtitle}</Text>
        
        {children}
      </ScrollView>
    </View>
  );
} 