import React from 'react';
import { View } from 'react-native';
import { sharedStyles } from '../../styles/shared';

interface ProgressBarProps {
  progress: number; // Value between 0 and 1
}

export default function ProgressBar({ progress }: ProgressBarProps): JSX.Element {
  return (
    <View style={[sharedStyles.progressBar, { width: `${progress * 100}%` }]} />
  );
} 