import { Platform } from 'react-native';

// Purple-tinted shadow color matches brand (purple-800)
const shadowColor = '#3D1A82';

export const shadows = {
  sm: Platform.select({
    ios: { shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: { shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: { shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
    android: { elevation: 8 },
  }),
  xl: Platform.select({
    ios: { shadowColor, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.18, shadowRadius: 32 },
    android: { elevation: 16 },
  }),
};

// Chunky "pressable" button shadows.
// In React Native, render a colored View 4px below/behind the button (the offset layer),
// then position the button View on top. On press: translateY(3) + swap to shadows.sm.
export const chunkyShadowColors = {
  purple: '#4A2690',
  gold: '#C78A00',
  teal: '#00695C',
  coral: '#A02D14',
  neutral: '#B0ABCC',
};
