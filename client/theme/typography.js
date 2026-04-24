// Font family names match the expo-google-fonts package exports.
// Load these once in App.js via useFonts() before rendering any UI.
export const fontFamilies = {
  display: 'Nunito_900Black',
  h1: 'Nunito_900Black',
  h2: 'Nunito_800ExtraBold',
  h3: 'Nunito_700Bold',
  body: 'Outfit_400Regular',
  small: 'Outfit_500Medium',
  caption: 'Outfit_500Medium',
  label: 'Nunito_800ExtraBold',
  button: 'Nunito_800ExtraBold',
};

export const typeScale = {
  display: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    lineHeight: 31, // 1.1
  },
  h1: {
    fontFamily: fontFamilies.h1,
    fontSize: 22,
    lineHeight: 25, // 1.15
  },
  h2: {
    fontFamily: fontFamilies.h2,
    fontSize: 20,
    lineHeight: 24, // 1.2
  },
  h3: {
    fontFamily: fontFamilies.h3,
    fontSize: 16,
    lineHeight: 21, // 1.3
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 24, // 1.6
  },
  small: {
    fontFamily: fontFamilies.small,
    fontSize: 13,
    lineHeight: 20, // 1.5
  },
  caption: {
    fontFamily: fontFamilies.caption,
    fontSize: 12,
    lineHeight: 17, // 1.4
  },
  label: {
    fontFamily: fontFamilies.label,
    fontSize: 11,
    lineHeight: 13, // 1.2
    textTransform: 'uppercase',
    letterSpacing: 1.1, // ~0.1em at 11px
  },
  button: {
    fontFamily: fontFamilies.button,
    fontSize: 15,
    lineHeight: 15,
  },
};
