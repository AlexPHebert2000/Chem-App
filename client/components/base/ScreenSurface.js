import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';

export default function ScreenSurface({ children, style, edges = ['top', 'bottom', 'left', 'right'] }) {
  return (
    <SafeAreaView style={[styles.surface, style]} edges={edges}>
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
