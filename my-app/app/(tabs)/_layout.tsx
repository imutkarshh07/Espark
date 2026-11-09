import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Platform, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../../constants/Theme';
import { useAppTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  // Dynamic bottom padding: handles 3-button navigation on Android (up to 48dp on Galaxy S9+)
  // and home indicator on iOS (34dp), while providing a clean compact 8dp when inset is 0
  const bottomInset = insets.bottom;
  const paddingBottom = Platform.OS === 'ios' ? Math.max(bottomInset, 20) : Math.max(bottomInset, 8);
  const tabHeight = 58 + paddingBottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: isDark ? colors.surface : 'rgba(251, 248, 255, 0.98)',
          borderTopWidth: 1,
          borderTopColor: colors.outlineVariant,
          height: tabHeight,
          paddingBottom,
          paddingTop: 6,
          elevation: 8,
          shadowColor: isDark ? '#000000' : '#181a2e',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.35 : 0.04,
          shadowRadius: 12,
        },
        tabBarItemStyle: {
          paddingTop: 4,
          paddingBottom: 2,
          height: 52,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: 10.5,
          lineHeight: 13,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="home" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="mistakes"
        options={{
          title: 'Mistakes',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="error-outline" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="bar-chart" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="grid-view" size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
