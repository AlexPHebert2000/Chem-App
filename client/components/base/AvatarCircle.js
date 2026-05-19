import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../../theme';

export default function AvatarCircle({ name, imageUri, size = 44, style }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.purple600,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  initials: {
    fontFamily: 'Nunito_900Black',
    color: '#FFFFFF',
  },
});
