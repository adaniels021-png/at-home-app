export const premiumTheme = {
  colors: {
    background: '#F8F8FC',

    textPrimary: '#101828',
    textSecondary: '#667085',

    purple: '#7C4DFF',
    purpleLight: '#F3EEFF',

    green: '#11A36A',
    greenLight: '#ECFDF3',

    orange: '#F97316',
    orangeLight: '#FFF4ED',

    pink: '#DB2777',
    pinkLight: '#FDF2F8',

    blue: '#2563EB',
    blueLight: '#EFF6FF',

    border: '#E9EAF2',

    white: '#FFFFFF',
  },

  radius: {
    sm: 16,
    md: 24,
    lg: 32,
  },

  spacing: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 40,
  },

  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.06,
      shadowRadius: 20,
      elevation: 6,
    },
  },

  typography: {
    hero: {
      fontSize: 34,
      fontWeight: '800' as const,
      lineHeight: 40,
    },

    sectionTitle: {
      fontSize: 30,
      fontWeight: '800' as const,
    },

    cardTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
    },

    body: {
      fontSize: 17,
      lineHeight: 26,
      fontWeight: '500' as const,
    },

    caption: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
  },
};