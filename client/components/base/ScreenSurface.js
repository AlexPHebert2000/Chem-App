import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';

export default function ScreenSurface({ children, style }) {
  return (
    <View style={styles.outer}>
      {/* Transparent top-edge SafeAreaView — purple outer View shows through the inset */}
      <SafeAreaView style={styles.topInset} edges={['top']}>
        {/* White content area handles remaining edges */}
        <SafeAreaView style={[styles.surface, style]} edges={['left', 'right']}>
          {children}
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.purple600,
  },
  topInset: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  surface: {
    flex: 1,
    backgroundColor: colors.neutral50,
  },
});
