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
  bottomContent?: React.ReactNode;
}

export default function OnboardingLayout({
  progress,
  title,
  subtitle,
  icon,
  children,
  bottomContent
}: OnboardingLayoutProps): JSX.Element {
  return (
    <View style={sharedStyles.container}>
      <Image source={require('../../assets/background.png')} style={sharedStyles.backgroundImage} />
      
      {/* Progress Bar */}
      {progress !== undefined && (
        <View style={[sharedStyles.progressBar, { width: `${progress * 100}%` }]} />
      )}
      
      <View style={{ flex: 1 }}>
        <ScrollView 
          style={sharedStyles.contentContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SPACING.xl }}
        >
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

        {/* Fixed bottom content area */}
        {bottomContent && (
          <View style={{ 
            paddingHorizontal: SPACING.lg,
            paddingBottom: SPACING.lg,
            paddingTop: SPACING.md,
            backgroundColor: COLORS.background
          }}>
            {bottomContent}
          </View>
        )}
      </View>
    </View>
  );
} 