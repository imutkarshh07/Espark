import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

export interface DrillData {
  id: string;
  title: string;
  diff: string;
  time: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  bgColor: string;
  iconColor: string;
}

interface Props {
  drill: DrillData;
  onPress: () => void;
  colors?: any;
}

export const DrillItemCard: React.FC<Props> = ({ drill, onPress, colors }) => {
  const bgSurface = colors?.surface || Theme.colors.surfaceContainerLowest;
  const textColor = colors?.onSurface || Theme.colors.onSurface;
  const subColor = colors?.onSurfaceVariant || Theme.colors.onSurfaceVariant;
  const borderColor = colors?.outlineVariant || Theme.colors.borderHairline;

  const getDiffColors = (diff: string) => {
    const d = (diff || '').toLowerCase();
    if (d.includes('hard') || d.includes('tough')) {
      return { bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444' };
    }
    if (d.includes('med')) {
      return { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B' };
    }
    return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981' };
  };
  const diffColors = getDiffColors(drill.diff);

  return (
    <TouchableOpacity
      style={[styles.drillItem, { backgroundColor: bgSurface, borderColor }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.drillLeft}>
        <View style={[styles.drillIconBox, { backgroundColor: drill.bgColor }]}>
          <MaterialIcons name={drill.icon} size={20} color={drill.iconColor} />
        </View>
        <View style={styles.drillInfo}>
          <Text style={[styles.drillTitle, { color: textColor }]}>{drill.title}</Text>
          <View style={styles.drillMetaRow}>
            <View style={[styles.easyBadge, { backgroundColor: diffColors.bg }]}>
              <Text style={[styles.easyText, { color: diffColors.text }]}>{drill.diff}</Text>
            </View>
            <Text style={[styles.drillTime, { color: subColor }]}>{drill.time}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.playButton, { backgroundColor: colors?.surfaceVariant || Theme.colors.surfaceContainerHigh }]}>
        <MaterialIcons name="play-arrow" size={20} color={colors?.primary || Theme.colors.primary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  drillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  drillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  drillIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  drillInfo: {
    flex: 1,
  },
  drillTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  drillMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  easyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  easyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  drillTime: {
    fontSize: 11,
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
