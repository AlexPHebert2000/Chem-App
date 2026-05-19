import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

export default function StudentClassScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Class — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutral50, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.neutral400 },
});
