import { StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#6A9EFF',
  background: '#0A1B3F',
  white: '#FFFFFF',
  error: '#FF4D4D',
  success: '#4ADE80',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
};

export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

export const FONTS = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  body: {
    fontSize: 16,
    color: COLORS.white,
  },
  caption: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
};

export const sharedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  contentContainer: {
    flex: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xl * 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginVertical: SPACING.lg,
  },
  title: {
    ...FONTS.h1,
    marginBottom: SPACING.md,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    ...FONTS.body,
    color: COLORS.white,
    fontWeight: '600',
  },
  iconSpacing: {
    marginBottom: SPACING.lg,
  },
}); 