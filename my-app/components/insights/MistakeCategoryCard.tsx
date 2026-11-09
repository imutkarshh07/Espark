import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

export interface MistakeCategory {
  id: string;
  label: string;
  percentage: number;
  count: number;
  color: string;
  subtitle: string;
  rootCause: string;
  exampleQuestion: string;
  userAnswer: string;
  correctAnswer: string;
  aiCoachTip: string;
  drillCount: number;
  timeEstimate: string;
}

interface Props {
  item: MistakeCategory;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onLaunchDrill: (category: MistakeCategory) => void;
  colors?: any;
}

export const MistakeCategoryCard: React.FC<Props> = ({
  item,
  isExpanded,
  onToggle,
  onLaunchDrill,
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
      {/* Accordion Row Header */}
      <TouchableOpacity
        style={styles.triggerRow}
        onPress={() => onToggle(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.leftContent}>
          <View style={styles.nameRow}>
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <Text style={[styles.nameText, { color: textColor }]}>{item.label}</Text>
            <View style={[styles.countPill, { backgroundColor: `${item.color}18` }]}>
              <Text style={[styles.countPillText, { color: item.color }]}>
                {item.count} err ({item.percentage}%)
              </Text>
            </View>
          </View>
          <Text style={[styles.subText, { color: subColor }]}>{item.subtitle}</Text>
        </View>

        <View
          style={[
            styles.arrowCircle,
            { backgroundColor: colors?.surfaceVariant || Theme.colors.surfaceContainerHigh },
            isExpanded && { backgroundColor: `${item.color}20` },
          ]}
        >
          <MaterialIcons
            name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={22}
            color={isExpanded ? item.color : subColor}
          />
        </View>
      </TouchableOpacity>

      {/* Progress Track */}
      <View style={styles.progressTrackWrapper}>
        <View style={[styles.track, { backgroundColor: colors?.surfaceVariant || Theme.colors.surfaceContainerHigh }]}>
          <View
            style={[
              styles.fillTrack,
              { width: `${item.percentage}%`, backgroundColor: item.color },
            ]}
          />
        </View>
      </View>

      {/* Detailed Expanded Panel */}
      {isExpanded && (
        <View style={styles.detailPanel}>
          {/* Root Cause */}
          <View style={styles.analysisSection}>
            <View style={styles.analysisLabelRow}>
              <MaterialIcons name="psychology" size={16} color={Theme.colors.primary} />
              <Text style={[styles.analysisLabelText, { color: textColor }]}>Root Cause Diagnosis</Text>
            </View>
            <Text style={[styles.analysisBodyText, { color: subColor }]}>{item.rootCause}</Text>
          </View>

          {/* Practice Mistake Snapshot */}
          <View style={[styles.exampleCard, { backgroundColor: colors?.background || Theme.colors.surfaceContainerLow }]}>
            <View style={styles.exampleHeader}>
              <MaterialIcons name="error-outline" size={14} color={Theme.colors.error} />
              <Text style={styles.exampleTag}>RECENT TEST SNAPSHOT</Text>
            </View>
            <Text style={[styles.exampleQuestionText, { color: textColor }]}>"{item.exampleQuestion}"</Text>

            <View style={styles.answerComparisonBox}>
              <View style={styles.choiceRow}>
                <MaterialIcons name="close" size={14} color={Theme.colors.error} />
                <Text style={styles.userChoiceText}>
                  <Text style={styles.boldLabel}>You chose: </Text>
                  {item.userAnswer}
                </Text>
              </View>
              <View style={styles.choiceRow}>
                <MaterialIcons name="check" size={14} color="#10B981" />
                <Text style={styles.correctChoiceText}>
                  <Text style={styles.boldLabel}>Correct: </Text>
                  {item.correctAnswer}
                </Text>
              </View>
            </View>
          </View>

          {/* AI Coach Strategy */}
          <View style={[styles.coachTipSnippet, { backgroundColor: colors?.background || Theme.colors.tertiaryFixed }]}>
            <View style={styles.coachTipHeader}>
              <MaterialIcons name="lightbulb" size={15} color="#F59E0B" />
              <Text style={[styles.coachTipTitle, { color: textColor }]}>AI Coach Fix</Text>
            </View>
            <Text style={[styles.coachTipBody, { color: subColor }]}>{item.aiCoachTip}</Text>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.drillBtn, { backgroundColor: item.color }]}
              onPress={() => onLaunchDrill(item)}
              activeOpacity={0.85}
            >
              <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
              <Text style={styles.drillBtnText}>
                Launch Targeted Drill ({item.drillCount} Qs • {item.timeEstimate})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.radii.xl,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardExpanded: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subText: {
    fontSize: 12,
    marginTop: 4,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrackWrapper: {
    marginTop: 10,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fillTrack: {
    height: '100%',
    borderRadius: 2,
  },
  detailPanel: {
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
    paddingTop: 12,
    gap: 12,
  },
  analysisSection: {
    gap: 4,
  },
  analysisLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  analysisLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  analysisBodyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  exampleCard: {
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exampleTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  exampleQuestionText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  answerComparisonBox: {
    marginTop: 4,
    gap: 4,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userChoiceText: {
    fontSize: 11,
    color: '#EF4444',
  },
  correctChoiceText: {
    fontSize: 11,
    color: '#10B981',
  },
  boldLabel: {
    fontWeight: '700',
  },
  coachTipSnippet: {
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  coachTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coachTipTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  coachTipBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  actionRow: {
    marginTop: 2,
  },
  drillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  drillBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
