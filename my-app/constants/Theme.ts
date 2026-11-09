export const lightColors = {
  // Primary / Terracotta / Ember
  primary: '#9e3c26',
  primaryAccent: '#e06d53',
  primaryContainer: '#be543c',
  primaryFixed: '#ffdad2',
  primaryFixedDim: '#ffb4a3',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#fffbff',
  onPrimaryFixed: '#3d0600',
  onPrimaryFixedVariant: '#822714',

  // Secondary / Sage Teal
  secondary: '#34675f',
  secondaryAccent: '#3d7068',
  secondaryContainer: '#b7ede3',
  secondaryFixed: '#b7ede3',
  secondaryFixedDim: '#9cd1c7',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#3a6d65',
  onSecondaryFixed: '#00201c',
  onSecondaryFixedVariant: '#194f48',

  // Tertiary / Soft Slate Blue
  tertiary: '#375d92',
  tertiaryAccent: '#4a6fa5',
  tertiaryContainer: '#5176ac',
  tertiaryFixed: '#d5e3ff',
  tertiaryFixedDim: '#a7c8ff',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#fefcff',
  onTertiaryFixed: '#001c3b',
  onTertiaryFixedVariant: '#1e477b',

  // Supporting Accents
  accentOlive: '#4e8752',
  accentOliveContainer: '#eaf5eb',
  accentPurple: '#6c5ce7',
  accentPurpleContainer: '#f0eefb',
  accentEmber: '#ff7a59',

  // Canvas & Surfaces
  background: '#fbf8ff',
  surface: '#fbf8ff',
  surfaceCanvas: '#faf8f5',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f4f2ff',
  surfaceContainer: '#edecff',
  surfaceContainerHigh: '#e6e6ff',
  surfaceContainerHighest: '#e0e0fc',
  surfaceDim: '#d7d8f4',
  surfaceBright: '#fbf8ff',
  surfaceTint: '#a13e28',
  surfaceVariant: '#f1f5f9',

  // Text & Line Boundaries
  onSurface: '#181a2e',
  onSurfaceVariant: '#57423d',
  outline: '#8a726c',
  outlineVariant: '#ddc0ba',
  borderHairline: '#ebe6de',

  // Inverses & Alerts
  inverseSurface: '#2d2f44',
  inverseOnSurface: '#f1efff',
  inversePrimary: '#ffb4a3',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',
};

export const darkColors = {
  // Primary / Luminous Terracotta & Ember
  primary: '#ff7a59',
  primaryAccent: '#ff9a80',
  primaryContainer: '#a63e26',
  primaryFixed: '#3d1208',
  primaryFixedDim: '#ffb4a3',
  onPrimary: '#200701',
  onPrimaryContainer: '#ffe6e0',
  onPrimaryFixed: '#ffdad2',
  onPrimaryFixedVariant: '#ffb4a3',

  // Secondary / Luminous Mint Teal
  secondary: '#4ecca3',
  secondaryAccent: '#6ce3bd',
  secondaryContainer: '#114438',
  secondaryFixed: '#0e332a',
  secondaryFixedDim: '#9cd1c7',
  onSecondary: '#002018',
  onSecondaryContainer: '#a2f5dd',
  onSecondaryFixed: '#b7ede3',
  onSecondaryFixedVariant: '#85ebd0',

  // Tertiary / Sky Slate
  tertiary: '#7ea4e0',
  tertiaryAccent: '#a0bdf0',
  tertiaryContainer: '#1e3860',
  tertiaryFixed: '#132644',
  tertiaryFixedDim: '#a7c8ff',
  onTertiary: '#00142e',
  onTertiaryContainer: '#d8e5ff',
  onTertiaryFixed: '#d5e3ff',
  onTertiaryFixedVariant: '#99beff',

  // Supporting Accents
  accentOlive: '#6bc972',
  accentOliveContainer: '#133916',
  accentPurple: '#a29bfe',
  accentPurpleContainer: '#2c2560',
  accentEmber: '#ff9170',

  // Canvas & Surfaces - Deep Midnight
  background: '#0d0f17',
  surface: '#121520',
  surfaceCanvas: '#0d0f17',
  surfaceContainerLowest: '#181b28',
  surfaceContainerLow: '#1e2233',
  surfaceContainer: '#24293d',
  surfaceContainerHigh: '#2c324a',
  surfaceContainerHighest: '#353c58',
  surfaceDim: '#0a0b12',
  surfaceBright: '#24293d',
  surfaceTint: '#ff7a59',
  surfaceVariant: '#1e2233',

  // Text & Line Boundaries
  onSurface: '#f1f3fd',
  onSurfaceVariant: '#a2a7be',
  outline: '#535b7a',
  outlineVariant: '#353b52',
  borderHairline: '#252a3d',

  // Inverses & Alerts
  inverseSurface: '#eaeaf6',
  inverseOnSurface: '#161924',
  inversePrimary: '#9e3c26',
  error: '#ff6b6b',
  errorContainer: '#541212',
  onError: '#2d0000',
  onErrorContainer: '#ffdad6',
};

let _activeColors = lightColors;

export const setGlobalThemeColors = (newColors: typeof lightColors) => {
  _activeColors = newColors;
};

export const Theme = {
  get colors() {
    return _activeColors;
  },
  set colors(newColors: typeof lightColors) {
    _activeColors = newColors;
  },
  getColors(isDark: boolean) {
    return isDark ? darkColors : lightColors;
  },
  typography: {
    displayLg: {
      fontSize: 36,
      lineHeight: 44,
      letterSpacing: -0.8,
    },
    headlineLg: {
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.6,
    },
    headlineMd: {
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.3,
    },
    headlineSm: {
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: 0,
    },
    statMetric: {
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.6,
    },
    bodyLg: {
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: -0.2,
    },
    bodyMd: {
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
    },
    labelLg: {
      fontSize: 14,
      lineHeight: 18,
      letterSpacing: 0.1,
    },
    labelMd: {
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.2,
    },
    labelSm: {
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.3,
    },
  },
  radii: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    '2xl': 22,
    '3xl': 28,
    full: 9999,
  },
  shadows: {
    subtle: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
    floating: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
      elevation: 6,
    },
  },
  assets: {
    logoFull: require('../assets/images/espark-full.png'),
    logoEmblem: require('../assets/images/espark-emblem.png'),
    logoFullCanvas: require('../assets/images/espark-full-canvas.png'),
    logoEmblemCanvas: require('../assets/images/espark-emblem-canvas.png'),
    mascot: require('../assets/images/espark-emblem.png'),
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
  },
};
