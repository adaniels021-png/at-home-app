/**
 * ABA at Home - Professional Theme Definition
 * Focused on clinical accessibility and modern mobile UI.
 */

export const Colors = {
  // Primary Clinical Palette
  primary: '#4F46E5', // Indigo 600
  primaryLight: '#EEF2FF',
  primaryDark: '#3730A3',

  // Secondary/Accent - Success (Correct Response)
  success: '#10B981', // Emerald 500
  successLight: '#ECFDF5',

  // Warning/Pro-Tip
  warning: '#F59E0B', // Amber 500
  warningLight: '#FFFBEB',

  // Error/Danger
  error: '#EF4444', // Red 500
  errorLight: '#FEF2F2',

  // Neutral Palette for UI Surface
  background: '#F8FAFC', // Slate 50
  surface: '#FFFFFF',
  border: '#E2E8F0',
  
  // Text
  text: '#0F172A', // Slate 900
  textLight: '#64748B', // Slate 500
  textMuted: '#94A3B8', // Slate 400
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Typography = {
  header: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  subheader: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.text,
    lineHeight: 24,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textLight,
  },
};

export const Shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
};

export default { Colors, Spacing, Typography, Shadows };
