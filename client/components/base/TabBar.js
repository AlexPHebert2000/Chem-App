import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typeScale } from '../../theme';

const STUDENT_TABS = [
  { id: 'Home',    label: 'Home',    icon: 'home-outline',  iconActive: 'home' },
  { id: 'Class',   label: 'Class',   icon: 'medal-outline', iconActive: 'medal' },
  { id: 'Profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

const TEACHER_TABS = [
  { id: 'TeacherHome',  label: 'Home',  icon: 'home-outline',    iconActive: 'home' },
  { id: 'QuestionBank', label: 'Bank',  icon: 'library-outline', iconActive: 'library' },
];

export default function TabBar({ state, descriptors, navigation, role = 'STUDENT' }) {
  const tabs = role === 'TEACHER' ? TEACHER_TABS : STUDENT_TABS;

  return (
    <View style={styles.bar}>
      {tabs.map(tab => {
        const route = state?.routes.find(r => r.name === tab.id);
        const focused = route && state.routes[state.index]?.name === tab.id;

        return (
          <Pressable
            key={tab.id}
            style={styles.tab}
            onPress={() => navigation?.navigate(tab.id)}
          >
            <View style={[styles.iconPill, focused && styles.iconPillActive]}>
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={20}
                color={focused ? colors.purple600 : colors.neutral600}
              />
            </View>
            <Text style={[styles.label, focused && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.neutral200,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 26 : 8,
    shadowColor: colors.purple800,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconPill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  iconPillActive: {
    backgroundColor: colors.purple50,
  },
  label: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.2,
    color: colors.neutral600,
  },
  labelActive: {
    color: colors.purple600,
    fontFamily: 'Nunito_800ExtraBold',
  },
});
