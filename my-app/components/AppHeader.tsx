import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  canGoBack?: boolean;
  showMenu?: boolean;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title = 'ESpark',
  subtitle,
  canGoBack = false,
  showMenu = true,
  rightAction,
}) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant }]}>
      <View style={styles.leftRow}>
        {canGoBack ? (
          <TouchableOpacity
            accessibilityLabel="Go back"
            style={[styles.iconButton, { backgroundColor: colors.surfaceVariant }]}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
        ) : showMenu ? (
          <TouchableOpacity
            accessibilityLabel="Leaderboard & Trophies"
            style={[styles.iconButton, { backgroundColor: isDark ? '#2D2818' : '#FEF3C7' }]}
            onPress={() => router.push('/leaderboard' as any)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="emoji-events" size={22} color="#D97706" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity 
          style={styles.brandCluster} 
          onPress={() => router.push('/(tabs)')}
          activeOpacity={0.8}
        >
          <View style={[styles.emblemWrapper, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(254, 252, 248, 0.95)' }]}>
            <Image
              source={Theme.assets.logoEmblem}
              style={styles.emblemLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]} numberOfLines={1} ellipsizeMode="tail">
                {subtitle}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.rightRow}>
        {rightAction ? (
          rightAction
        ) : (
          <TouchableOpacity
            accessibilityLabel="View Profile"
            style={[styles.avatarButton, { borderColor: colors.primary }]}
            onPress={() => router.push('/profile')}
          >
            <Image
              source={{ uri: Theme.assets.avatar }}
              style={styles.avatarImage}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexShrink: 1,
  },
  emblemWrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emblemLogo: {
    width: 28,
    height: 28,
  },
  titleContainer: {
    justifyContent: 'center',
    flex: 1,
    flexShrink: 1,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    marginTop: -2,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
