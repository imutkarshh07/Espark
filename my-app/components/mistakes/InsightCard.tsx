import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

export interface InsightData {
  id: string;
  num: number;
  title: string;
  subtitle: string;
  badgeBg: string;
  badgeText: string;
  content: string;
  highlight?: string;
}

interface Props {
  insight: InsightData;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  colors?: any;
}

export const InsightCard: React.FC<Props> = ({
  insight,
  isExpanded,
  onToggle,
  colors,
}) => {
  const bgSurface = colors?.surface || Theme.colors.surfaceContainerLowest;
  const textColor = colors?.onSurface || Theme.colors.onSurface;
  const subColor = colors?.onSurfaceVariant || Theme.colors.onSurfaceVariant;
  const borderColor = colors?.outlineVariant || Theme.colors.borderHairline;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bgSurface, borderColor },
        isExpanded && styles.cardExpanded,
      ]}
    >
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => onToggle(insight.id)}
        activeOpacity={0.7}
      >
        <View style={styles.leftHeader}>
          <View style={[styles.stepNumberBadge, { backgroundColor: insight.badgeBg }]}>
            <Text style={[styles.stepNumberText, { color: insight.badgeText }]}>
              {insight.num}
            </Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={[styles.title, { color: textColor }]}>{insight.title}</Text>
            <Text
              style={[styles.subtitle, { color: subColor }]}
              numberOfLines={isExpanded ? 2 : 1}
            >
              {insight.subtitle}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.arrowBtn,
            { backgroundColor: colors?.surfaceVariant || Theme.colors.surfaceContainerHigh },
            isExpanded && { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
          ]}
        >
          <MaterialIcons
            name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color={isExpanded ? (colors?.primary || Theme.colors.primary) : subColor}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedBody}>
          <Text style={[styles.bodyText, { color: textColor }]}>{insight.content}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardExpanded: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '800',
  },
  headerMeta: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
    paddingTop: 10,
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
