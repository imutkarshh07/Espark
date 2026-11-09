import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

export interface RecentMistakeItem {
  id: string;
  questionNumber: number;
  subject: string;
  topic: string;
  category: string;
  categoryColor: string;
  summary: string;
  fullQuestion: string;
  studentAnswer: string;
  correctAnswer: string;
  keyTakeaway: string;
}

interface Props {
  mistake: RecentMistakeItem;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onOpenReview: () => void;
  colors?: any;
}

export const RecentMistakeCard: React.FC<Props> = ({
  mistake,
  isOpen,
  onToggle,
  onOpenReview,
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
        isOpen && styles.cardOpen,
      ]}
    >
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => onToggle(mistake.id)}
        activeOpacity={0.7}
      >
        <View style={styles.leftMeta}>
          <View style={styles.qNumBadge}>
            <Text style={styles.qNumText}>Q{mistake.questionNumber}</Text>
          </View>
          <View style={styles.metaTextCol}>
            <View style={styles.titleRow}>
              <Text style={[styles.topicTitle, { color: textColor }]}>{mistake.topic}</Text>
              <View
                style={[
                  styles.categoryTag,
                  { backgroundColor: `${mistake.categoryColor}18` },
                ]}
              >
                <Text style={[styles.categoryTagText, { color: mistake.categoryColor }]}>
                  {mistake.category}
                </Text>
              </View>
            </View>
            <Text style={[styles.summaryText, { color: subColor }]} numberOfLines={isOpen ? 3 : 1}>
              {mistake.summary}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.arrowBtn,
            { backgroundColor: colors?.surfaceVariant || Theme.colors.surfaceContainerHigh },
            isOpen && { backgroundColor: `${mistake.categoryColor}20` },
          ]}
        >
          <MaterialIcons
            name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color={isOpen ? mistake.categoryColor : subColor}
          />
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.detailsBox}>
          <Text style={[styles.fullQuestion, { color: textColor }]}>{mistake.fullQuestion}</Text>

          <View style={[styles.choiceBox, { backgroundColor: colors?.background || Theme.colors.surfaceContainerLow }]}>
            <Text style={styles.wrongChoice}>
              <Text style={{ fontWeight: '700', color: '#EF4444' }}>Your Answer: </Text>
              {mistake.studentAnswer}
            </Text>
            <Text style={styles.rightChoice}>
              <Text style={{ fontWeight: '700', color: '#10B981' }}>Correct Answer: </Text>
              {mistake.correctAnswer}
            </Text>
          </View>

          <View style={styles.takeawayBox}>
            <MaterialIcons name="verified" size={14} color="#10B981" />
            <Text style={[styles.takeawayText, { color: subColor }]}>
              <Text style={{ fontWeight: '700', color: textColor }}>Key Takeaway: </Text>
              {mistake.keyTakeaway}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={onOpenReview}
            activeOpacity={0.8}
          >
            <Text style={[styles.reviewBtnText, { color: colors?.primary || Theme.colors.primary }]}>Open in Review Mode</Text>
            <MaterialIcons name="open-in-new" size={14} color={colors?.primary || Theme.colors.primary} />
          </TouchableOpacity>
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
  cardOpen: {
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
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  qNumBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  qNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3B82F6',
  },
  metaTextCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  topicTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  summaryText: {
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
  detailsBox: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  fullQuestion: {
    fontSize: 12,
    lineHeight: 17,
  },
  choiceBox: {
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  wrongChoice: {
    fontSize: 11,
    color: '#EF4444',
  },
  rightChoice: {
    fontSize: 11,
    color: '#10B981',
  },
  takeawayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: 8,
    borderRadius: 8,
  },
  takeawayText: {
    fontSize: 11,
    flex: 1,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  reviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
});
