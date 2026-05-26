import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';

export default function ScreenSurface({ children, style }) {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.surface, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    backgroundColor: colors.neutral50,
  },
});
