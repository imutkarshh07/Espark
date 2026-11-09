import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppHeader } from '../../components/AppHeader';
import { DonutChart } from '../../components/DonutChart';
import { studyService } from '../../services/studyService';
import { useTheme } from '../../context/ThemeContext';

export default function HomeDashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [studentName, setStudentName] = useState<string>('Aspirant');
  const [targetExam, setTargetExam] = useState<string>('NEET');
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [accuracyPct, setAccuracyPct] = useState<number>(0);
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  const [studyHours, setStudyHours] = useState<number>(0);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [weakChapters, setWeakChapters] = useState<{ topic: string; subject: string; mistakes: number }[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ label: string; pct: string; color: string; count: number }[]>([]);

  const loadDashboardData = useCallback(async () => {
      try {
        const [profile, attempts, mistakes, focusStats] = await Promise.all([
          studyService.getProfile().catch(() => null),
          studyService.listAttempts().catch(() => []),
          studyService.listMistakes().catch(() => []),
          studyService.getFocusStats().catch(() => null),
        ]);

        if (profile?.name) {
          setStudentName(profile.name);
        }
        if (profile?.exam) {
          setTargetExam(profile.exam);
        }

        const safeAttempts = attempts || [];
        const safeMistakes = mistakes || [];

        setAttemptCount(safeAttempts.length);
        const completed = safeAttempts.filter((a: any) => a.completed_at);
        if (completed.length > 0) {
          const avg = Math.round(
            completed.reduce((sum: number, c: any) => sum + (parseFloat(c.score) || 0), 0) / completed.length
          );
          setAccuracyPct(avg);
        } else {
          setAccuracyPct(0);
        }

        setMistakeCount(safeMistakes.length);

        // Real dynamic study hours from focus timer and test attempts
        const focusHours = parseFloat(focusStats?.totalHours) || 0;
        const testMinutes = safeAttempts.length * 10;
        const totalHours = +(focusHours + (testMinutes / 60)).toFixed(1);
        setStudyHours(totalHours);
        setStreakDays(focusStats?.streakDays || 0);

        // Dynamic mistake categories
        if (safeMistakes.length > 0) {
          const catMap: Record<string, number> = {
            Conceptual: 0,
            Careless: 0,
            'Time Pressure': 0,
            'Memory Lapse': 0,
            Calculation: 0,
          };
          safeMistakes.forEach((m: any) => {
            const cat = (m.category || 'conceptual').toLowerCase();
            if (cat.includes('concept')) catMap['Conceptual']++;
            else if (cat.includes('careless')) catMap['Careless']++;
            else if (cat.includes('time')) catMap['Time Pressure']++;
            else if (cat.includes('calc')) catMap['Calculation']++;
            else catMap['Memory Lapse']++;
          });
          const colorsMap: Record<string, string> = {
            Conceptual: '#EF4444',
            Careless: '#10B981',
            'Time Pressure': '#3B82F6',
            'Memory Lapse': '#F59E0B',
            Calculation: '#8B5CF6',
          };
          const total = safeMistakes.length;
          const breakdown = Object.entries(catMap).map(([label, count]) => ({
            label,
            count,
            pct: `${Math.round((count / total) * 100)}%`,
            color: colorsMap[label] || '#6B7280',
          })).filter((b) => b.count > 0);
          setCategoryBreakdown(breakdown);

          // Dynamic priority weak chapters from user's actual mistakes
          const chapterCounts: Record<string, { subject: string; count: number }> = {};
          safeMistakes.forEach((m: any) => {
            const topic = m.questions?.topic || m.topic || 'Core Concept';
            const subject = m.questions?.subject || m.subject || profile?.exam || 'Practice';
            if (!chapterCounts[topic]) {
              chapterCounts[topic] = { subject, count: 0 };
            }
            chapterCounts[topic].count++;
          });
          const sortedTopics = Object.entries(chapterCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 3)
            .map(([topic, data]) => ({
              topic,
              subject: data.subject,
              mistakes: data.count,
            }));
          setWeakChapters(sortedTopics);
        } else {
          setCategoryBreakdown([]);
          setWeakChapters([]);
        }
      } catch (e) {
        console.warn('Dashboard data fetch warning:', e);
      }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader subtitle="Home" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Greeting Cluster */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingTextContainer}>
            <Text style={[styles.greetingTitle, { color: colors.onSurface }]} numberOfLines={1}>
              Good day, {studentName}
            </Text>
            <Text style={[styles.greetingSubtitle, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
              Master one concept at a time.
            </Text>
          </View>
          <View style={[styles.calmMindBadge, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}>
            <MaterialIcons name="school" size={15} color={colors.primary} />
            <Text style={[styles.calmMindText, { color: colors.primary }]}>{targetExam.toUpperCase()}</Text>
          </View>
        </View>

        {/* 4 Essential Quick Actions */}
        <View style={styles.actionGrid}>
          {/* Practice by Chapter */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
            onPress={() => router.push('/practice' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}>
              <MaterialIcons name="bolt" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.onSurface }]}>Practice Test</Text>
            <Text style={[styles.actionSubtitle, { color: colors.onSurfaceVariant }]}>10-30 Chapter Qs</Text>
          </TouchableOpacity>

          {/* AI Doubt Solver */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
            onPress={() => router.push('/doubt' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <MaterialIcons name="psychology" size={24} color="#10B981" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.onSurface }]}>Doubt Solver</Text>
            <Text style={[styles.actionSubtitle, { color: colors.onSurfaceVariant }]}>RAG + Gemini Help</Text>
          </TouchableOpacity>

          {/* Focus Mode */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
            onPress={() => router.push('/focus' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: isDark ? '#78350F' : '#FFFBEB' }]}>
              <MaterialIcons name="timer" size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.onSurface }]}>Focus Timer</Text>
            <Text style={[styles.actionSubtitle, { color: colors.onSurfaceVariant }]}>Shielded Study</Text>
          </TouchableOpacity>

          {/* Leaderboard */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
            onPress={() => router.push('/leaderboard' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: isDark ? '#581C87' : '#FAF5FF' }]}>
              <MaterialIcons name="emoji-events" size={24} color="#A855F7" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.onSurface }]}>Leaderboard</Text>
            <Text style={[styles.actionSubtitle, { color: colors.onSurfaceVariant }]}>Study Score & Streaks</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Progress Card */}
        <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleCluster}>
              <MaterialIcons name="insights" size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Today’s Progress</Text>
            </View>
            <View style={[styles.tagPill, { backgroundColor: isDark ? '#374151' : '#F1F5F9' }]}>
              <Text style={[styles.tagText, { color: colors.onSurfaceVariant }]}>{mistakeCount} Gaps Identified</Text>
            </View>
          </View>

          <View style={styles.progressGrid}>
            {/* Attempted */}
            <View style={[styles.gridItem, { backgroundColor: colors.background }]}>
              <View style={styles.metricHeader}>
                <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>Attempted</Text>
                <MaterialIcons name="edit-note" size={16} color={colors.onSurfaceVariant} />
              </View>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricLargeNumber, { color: colors.onSurface }]}>{attemptCount}</Text>
                <Text style={[styles.metricSubNumber, { color: colors.onSurfaceVariant }]}> Tests</Text>
              </View>
            </View>

            {/* Accuracy */}
            <View style={[styles.gridItem, { backgroundColor: colors.background }]}>
              <View style={styles.metricHeader}>
                <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>Accuracy</Text>
                <MaterialIcons name="verified" size={16} color="#10B981" />
              </View>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricLargeNumber, { color: '#10B981' }]}>{accuracyPct}%</Text>
                <View style={[styles.deltaBadge, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
                  <Text style={[styles.deltaText, { color: '#10B981' }]}>Live</Text>
                </View>
              </View>
            </View>

            {/* Study Time */}
            <View style={[styles.gridItem, { backgroundColor: colors.background }]}>
              <View style={styles.metricHeader}>
                <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>Deep Study</Text>
                <MaterialIcons name="timer" size={16} color={colors.onSurfaceVariant} />
              </View>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricLargeNumber, { color: colors.onSurface }]}>
                  {Math.floor(studyHours)}<Text style={styles.metricUnit}>h</Text> {Math.round((studyHours % 1) * 60)}<Text style={styles.metricUnit}>m</Text>
                </Text>
              </View>
            </View>

            {/* Streak */}
            <View style={[styles.gridItem, { backgroundColor: colors.background }]}>
              <View style={styles.metricHeader}>
                <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>Streak</Text>
                <MaterialIcons name="local-fire-department" size={16} color="#F59E0B" />
              </View>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricLargeNumber, { color: '#F59E0B' }]}>{streakDays}</Text>
                <Text style={[styles.metricUnit, { color: '#F59E0B', marginLeft: 4 }]}>Days</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Mistake Distribution Card */}
        <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleCluster}>
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Mistake Categorization</Text>
              <MaterialIcons name="pie-chart" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.timeframeText, { color: colors.onSurfaceVariant }]}>Live Breakdown</Text>
          </View>

          {mistakeCount === 0 ? (
            <View style={styles.emptyCardContent}>
              <MaterialIcons name="check-circle" size={28} color="#10B981" style={{ marginBottom: 6 }} />
              <Text style={[styles.emptyCardTitle, { color: colors.onSurface }]}>No Mistakes Identified</Text>
              <Text style={[styles.emptyCardSub, { color: colors.onSurfaceVariant }]}>
                Complete practice tests to generate your personalized behavioral and conceptual mistake breakdown.
              </Text>
            </View>
          ) : (
            <View style={styles.distributionBody}>
              <DonutChart total={mistakeCount} size={115} />

              <View style={styles.legendContainer}>
                {categoryBreakdown.map((item) => (
                  <View key={item.label} style={styles.legendRow}>
                    <View style={styles.legendLabelGroup}>
                      <View style={[styles.dot, { backgroundColor: item.color }]} />
                      <Text style={[styles.legendLabel, { color: colors.onSurface }]}>{item.label}</Text>
                    </View>
                    <Text style={[styles.legendPercent, { color: colors.onSurfaceVariant }]}>{item.pct}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Top Weak Areas Card */}
        <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleCluster}>
              <MaterialIcons name="warning" size={18} color="#F59E0B" />
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Priority Weak Chapters</Text>
            </View>
            {weakChapters.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/mistakes')}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {weakChapters.length === 0 ? (
            <View style={styles.emptyCardContent}>
              <MaterialIcons name="verified" size={28} color={colors.primary} style={{ marginBottom: 6 }} />
              <Text style={[styles.emptyCardTitle, { color: colors.onSurface }]}>No Priority Weak Areas</Text>
              <Text style={[styles.emptyCardSub, { color: colors.onSurfaceVariant }]}>
                As you solve chapter tests, your weak topics will automatically be pinpointed here for quick review.
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/practice' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyActionBtnText}>Practice by Chapter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.weakAreasList}>
              {weakChapters.map((item, i) => (
                <TouchableOpacity
                  key={item.topic}
                  style={[styles.weakAreaItem, { borderColor: colors.outlineVariant }]}
                  onPress={() => router.push('/practice' as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.weakAreaLeft}>
                    <View style={[styles.statusDot, { backgroundColor: i === 0 ? '#EF4444' : '#F59E0B' }]} />
                    <View>
                      <Text style={[styles.weakAreaTopic, { color: colors.onSurface }]}>{item.topic}</Text>
                      <Text style={[styles.weakAreaSubject, { color: colors.onSurfaceVariant }]}>{item.subject}</Text>
                    </View>
                  </View>
                  <View style={styles.weakAreaRight}>
                    <View style={[styles.mistakePill, { backgroundColor: isDark ? '#374151' : '#FEE2E2' }]}>
                      <Text style={[styles.mistakeText, { color: '#EF4444' }]}>{item.mistakes} errors</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 30,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: 8,
  },
  greetingTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  calmMindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    flexShrink: 0,
  },
  calmMindText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  actionTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 140,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  actionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  cardContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 140,
    padding: 12,
    borderRadius: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  metricLargeNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  metricSubNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricUnit: {
    fontSize: 13,
    fontWeight: '600',
  },
  deltaBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deltaText: {
    fontSize: 10,
    fontWeight: '700',
  },
  distributionBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 16,
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexShrink: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  legendPercent: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 0,
    marginLeft: 6,
  },
  timeframeText: {
    fontSize: 11,
  },
  weakAreasList: {
    gap: 8,
  },
  weakAreaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  weakAreaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  weakAreaTopic: {
    fontSize: 13,
    fontWeight: '600',
  },
  weakAreaSubject: {
    fontSize: 11,
    marginTop: 1,
  },
  weakAreaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mistakePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mistakeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyCardSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActionBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
