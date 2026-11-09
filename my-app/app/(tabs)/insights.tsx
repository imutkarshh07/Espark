import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { AppHeader } from '../../components/AppHeader';
import { DonutChart } from '../../components/DonutChart';
import { studyService } from '../../services/studyService';
import { useTheme } from '../../context/ThemeContext';
import { MistakeCategoryCard, MistakeCategory } from '../../components/insights/MistakeCategoryCard';
import { RecentMistakeCard, RecentMistakeItem } from '../../components/insights/RecentMistakeCard';
export default function InsightsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'mistakes' | 'chapter' | 'topic'>('mistakes');
  
  // Arrow Ecosystem State: tracks which mistake category is expanded
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>('conceptual');
  
  // Arrow Ecosystem State: tracks which recent mistake item is expanded
  const [expandedMistakeId, setExpandedMistakeId] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategoryId((prev) => (prev === id ? null : id));
  };

  const toggleRecentMistake = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMistakeId((prev) => (prev === id ? null : id));
  };

  const defaultDetailedSegments: MistakeCategory[] = [
    {
      id: 'conceptual',
      label: 'Conceptual',
      percentage: 32,
      count: 38,
      color: '#be543c',
      subtitle: 'Knowledge gaps & definition confusions',
      rootCause: 'Inversion of core principles or terminology (e.g. Phenotype vs Genotype).',
      exampleQuestion: 'Which term describes observable structural traits in offspring?',
      userAnswer: 'Genotype (Inverted definition with heritable code)',
      correctAnswer: 'Phenotype (Observable physical manifestation)',
      aiCoachTip: 'Highlight the question stem keywords. Look for "observable" vs "heritable code" before choosing.',
      drillCount: 3,
      timeEstimate: '4 mins',
    },
    {
      id: 'time-pressure',
      label: 'Time Pressure',
      percentage: 21,
      count: 25,
      color: '#5176ac',
      subtitle: 'Rushing during the final 30 seconds',
      rootCause: 'Speed-reading under 15 seconds led to misidentifying negative qualifiers ("EXCEPT", "NOT true").',
      exampleQuestion: 'All of the following occur during Anaphase I EXCEPT:',
      userAnswer: 'Centromere splitting (Correct answer was missed because stem had EXCEPT)',
      correctAnswer: 'Homologous chromosomes separate to opposite poles',
      aiCoachTip: 'Flag negative qualifiers immediately using a quick double-check before selecting.',
      drillCount: 2,
      timeEstimate: '3 mins',
    },
    {
      id: 'careless',
      label: 'Careless',
      percentage: 18,
      count: 22,
      color: '#34675f',
      subtitle: 'Misreading numbers or parent genotypes',
      rootCause: 'Overlooking parent cross notation (e.g. heterozygous Bb × bb vs Bb × Bb).',
      exampleQuestion: 'Probability of homozygous recessive offspring from Bb × Bb cross:',
      userAnswer: '1/2 (50% - miscalculated monohybrid ratio)',
      correctAnswer: '1/4 (25% - 1 BB : 2 Bb : 1 bb)',
      aiCoachTip: 'Always sketch a 2x2 Punnett square on scratchpad before finalizing cross ratios.',
      drillCount: 3,
      timeEstimate: '5 mins',
    },
    {
      id: 'calculation',
      label: 'Calculation',
      percentage: 15,
      count: 18,
      color: '#d48b28',
      subtitle: 'Dihybrid fractions & linkage math errors',
      rootCause: 'Fraction multiplication slips when calculating double-recombinant frequencies.',
      exampleQuestion: 'Expected recombinant frequency in a testcross with 12 cM map distance:',
      userAnswer: '24% (Doubled map distance instead of direct cM translation)',
      correctAnswer: '12% (1 cM = 1% recombination frequency)',
      aiCoachTip: 'Remember: 1 centimorgan (cM) = 1% recombination frequency strictly.',
      drillCount: 4,
      timeEstimate: '6 mins',
    },
    {
      id: 'memory-gap',
      label: 'Memory Gap',
      percentage: 14,
      count: 17,
      color: '#822714',
      subtitle: 'Recall decay over 14+ days',
      rootCause: 'Enzyme name recall in DNA replication fork without active spaced retrieval.',
      exampleQuestion: 'Which enzyme relieves supercoiling tension ahead of replication fork?',
      userAnswer: 'Helicase (Unwinds strands, does not relieve torsion)',
      correctAnswer: 'Topoisomerase (DNA Gyrase)',
      aiCoachTip: 'Schedule flashcard micro-review at 48h and 7-day intervals for enzyme pathways.',
      drillCount: 2,
      timeEstimate: '2 mins',
    },
  ];

  const defaultRecentMistakes: RecentMistakeItem[] = [
    {
      id: 'm1',
      questionNumber: 3,
      subject: 'Biology',
      topic: 'Genetics',
      category: 'Conceptual',
      categoryColor: '#be543c',
      summary: 'Confused Phenotype with Genotype allelic combination',
      fullQuestion: 'Which of the following terms correctly represents the observable physiological or structural characteristics of an organism produced by the interaction of its genes and environment?',
      studentAnswer: 'Option B: Genotype',
      correctAnswer: 'Option D: Phenotype',
      keyTakeaway: 'Phenotype = Physical manifestation. Genotype = Allelic code (BB, Bb, bb).',
    },
    {
      id: 'm2',
      questionNumber: 7,
      subject: 'Biology',
      topic: 'Cell Cycle',
      category: 'Careless',
      categoryColor: '#34675f',
      summary: 'Centromere division in Meiosis Anaphase I vs II',
      fullQuestion: 'During which phase of meiotic cell division do the centromeres actually divide, allowing sister chromatids to disjoin?',
      studentAnswer: 'Option A: Anaphase I',
      correctAnswer: 'Option C: Anaphase II',
      keyTakeaway: 'In Anaphase I, homologous chromosomes separate; centromeres divide strictly in Anaphase II.',
    },
    {
      id: 'm3',
      questionNumber: 14,
      subject: 'Biology',
      topic: 'Molecular Genetics',
      category: 'Memory Gap',
      categoryColor: '#822714',
      summary: 'Topoisomerase vs Helicase catalytic functions',
      fullQuestion: 'During DNA replication in prokaryotes, tension generated by positive supercoiling ahead of the replication bubble is resolved by:',
      studentAnswer: 'Option C: DNA Helicase',
      correctAnswer: 'Option A: DNA Topoisomerase (Gyrase)',
      keyTakeaway: 'Helicase unzips hydrogen bonds; Topoisomerase / Gyrase cuts and re-ligates to release torsional strain.',
    },
  ];

  const [detailedSegments, setDetailedSegments] = useState<MistakeCategory[]>(defaultDetailedSegments);
  const [recentMistakes, setRecentMistakes] = useState<RecentMistakeItem[]>([]);
  const [totalMistakes, setTotalMistakes] = useState<number>(0);
  const [chapterStats, setChapterStats] = useState<{ chapter: string; score: number }[]>([]);
  const [topicStats, setTopicStats] = useState<{ topic: string; subject: string; count: number }[]>([]);
  const [accuracyImprovement, setAccuracyImprovement] = useState<number>(0);

  useEffect(() => {
    async function loadInsightsData() {
      try {
        const [mistakes, attempts] = await Promise.all([
          studyService.listMistakes().catch(() => []),
          studyService.listAttempts().catch(() => []),
        ]);

        const safeMistakes = mistakes || [];
        const safeAttempts = attempts || [];

        setTotalMistakes(safeMistakes.length);

        const categoryCounts: Record<string, number> = {
          conceptual: 0,
          'time-pressure': 0,
          careless: 0,
          calculation: 0,
          'memory-gap': 0,
        };
        safeMistakes.forEach((m: any) => {
          const cat = m.category?.toLowerCase() || 'conceptual';
          if (cat.includes('concept')) categoryCounts['conceptual']++;
          else if (cat.includes('time')) categoryCounts['time-pressure']++;
          else if (cat.includes('careless')) categoryCounts['careless']++;
          else if (cat.includes('calc')) categoryCounts['calculation']++;
          else categoryCounts['memory-gap']++;
        });

        const total = safeMistakes.length;
        const updated = defaultDetailedSegments.map((seg) => {
          const c = categoryCounts[seg.id] ?? 0;
          const pct = total > 0 ? Math.round((c / total) * 100) : 0;
          return {
            ...seg,
            count: c,
            percentage: pct,
          };
        });
        setDetailedSegments(updated);

        if (safeMistakes.length > 0) {
          const mappedRecent: RecentMistakeItem[] = safeMistakes.slice(0, 5).map((m: any, idx: number) => ({
            id: m.id || `m-${idx}`,
            questionNumber: idx + 1,
            subject: m.questions?.topic || m.attempts?.tests?.subject || 'Practice',
            topic: m.questions?.topic || m.topic || 'Concept Review',
            category: (m.category || 'Conceptual').charAt(0).toUpperCase() + (m.category || 'conceptual').slice(1),
            categoryColor: m.category === 'conceptual' ? '#be543c' : m.category === 'careless' ? '#34675f' : '#5176ac',
            summary: m.insight?.diagnosis || m.reason || 'Terminology Inversion',
            fullQuestion: m.questions?.question_text || m.reason || 'Practice question review',
            studentAnswer: m.student_answer,
            correctAnswer: m.correct_answer,
            keyTakeaway: m.insight?.explanation || m.reason || 'Core principle distinction.',
          }));
          setRecentMistakes(mappedRecent);

          const topicMap: Record<string, { subject: string; count: number }> = {};
          safeMistakes.forEach((m: any) => {
            const top = m.questions?.topic || m.topic || 'Core Concept';
            const subj = m.questions?.subject || m.subject || 'Syllabus';
            if (!topicMap[top]) topicMap[top] = { subject: subj, count: 0 };
            topicMap[top].count++;
          });
          const mappedTopics = Object.entries(topicMap)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([topic, data]) => ({ topic, subject: data.subject, count: data.count }));
          setTopicStats(mappedTopics);
        } else {
          setRecentMistakes([]);
          setTopicStats([]);
        }

        if (safeAttempts.length > 0) {
          const chapterMap: Record<string, { totalScore: number; count: number }> = {};
          safeAttempts.forEach((a: any) => {
            const ch = a.tests?.chapter || a.tests?.title || 'General Test';
            const sc = parseFloat(a.score) || 0;
            if (!chapterMap[ch]) chapterMap[ch] = { totalScore: 0, count: 0 };
            chapterMap[ch].totalScore += sc;
            chapterMap[ch].count++;
          });
          const mappedChapters = Object.entries(chapterMap).map(([ch, data]) => ({
            chapter: ch,
            score: Math.round(data.totalScore / data.count),
          }));
          setChapterStats(mappedChapters);

          const completed = safeAttempts.filter((a: any) => a.completed_at);
          if (completed.length > 0) {
            const lastAvg = parseFloat(completed[completed.length - 1]?.score) || 0;
            const firstAvg = parseFloat(completed[0]?.score) || 0;
            setAccuracyImprovement(Math.max(0, Math.round(lastAvg - firstAvg)));
          }
        } else {
          setChapterStats([]);
          setAccuracyImprovement(0);
        }
      } catch (e) {
        console.warn('[Insights] Warning loading live insights:', e);
      }
    }
    loadInsightsData();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader subtitle="ESpark Analytics" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Segmented Tab Filter */}
        <View style={[styles.segmentedContainer, { backgroundColor: colors.surfaceVariant }]}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'mistakes' && [
                styles.segmentBtnActive,
                { backgroundColor: isDark ? colors.surfaceContainerHighest : colors.inverseSurface },
              ],
            ]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setActiveTab('mistakes');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'mistakes' ? (isDark ? colors.onSurface : colors.inverseOnSurface) : colors.onSurfaceVariant },
              ]}
            >
              Mistake Analysis
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'chapter' && [
                styles.segmentBtnActive,
                { backgroundColor: isDark ? colors.surfaceContainerHighest : colors.inverseSurface },
              ],
            ]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setActiveTab('chapter');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'chapter' ? (isDark ? colors.onSurface : colors.inverseOnSurface) : colors.onSurfaceVariant },
              ]}
            >
              Chapter-wise
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'topic' && [
                styles.segmentBtnActive,
                { backgroundColor: isDark ? colors.surfaceContainerHighest : colors.inverseSurface },
              ],
            ]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setActiveTab('topic');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'topic' ? (isDark ? colors.onSurface : colors.inverseOnSurface) : colors.onSurfaceVariant },
              ]}
            >
              Topic-wise
            </Text>
          </TouchableOpacity>
        </View>

        {/* Milestone Banner */}
        <View style={[styles.milestoneBanner, { backgroundColor: isDark ? '#1E293B' : colors.secondaryContainer }]}>
          <View style={[styles.milestoneIcon, { backgroundColor: colors.secondary }]}>
            <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.milestoneTextContainer}>
            <View style={styles.milestoneHeader}>
              <Text style={[styles.milestoneTitle, { color: colors.onSurface }]}>
                {totalMistakes === 0 && chapterStats.length === 0 ? 'Analytics Dashboard' : 'Performance Tracking'}
              </Text>
              <View style={[styles.deltaBadge, { backgroundColor: colors.secondary }]}>
                <Text style={styles.deltaText}>
                  {totalMistakes === 0 && chapterStats.length === 0 ? 'Live' : `+${accuracyImprovement}%`}
                </Text>
              </View>
            </View>
            <Text style={[styles.milestoneBody, { color: colors.onSurfaceVariant }]}>
              {totalMistakes === 0 && chapterStats.length === 0
                ? 'Complete practice tests to unlock cognitive pattern recognition, chapter-wise mastery curves, and targeted drills.'
                : 'Tracking active based on your verified test attempts. Tap below to unpack targeted root causes.'}
            </Text>
          </View>
        </View>

        {/* --- TAB 1: MISTAKE ANALYSIS WITH ARROW ECOSYSTEM --- */}
        {activeTab === 'mistakes' && (
          <>
            {totalMistakes === 0 ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant, padding: 24, alignItems: 'center' }]}>
                <MaterialIcons name="insights" size={40} color={colors.primary} style={{ marginBottom: 10 }} />
                <Text style={[styles.cardTitle, { color: colors.onSurface, textAlign: 'center' }]}>No Mistakes Logged Yet</Text>
                <Text style={[styles.cardSub, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 4, marginBottom: 16 }]}>
                  Start practicing chapters to generate your behavioral distribution across Conceptual, Careless, and Time Pressure categories.
                </Text>
                <TouchableOpacity
                  style={[styles.drillButton, { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }]}
                  onPress={() => router.push('/practice' as any)}
                >
                  <Text style={[styles.drillButtonText, { color: '#FFFFFF' }]}>Start Practice</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Mistake Distribution Detailed Card with Arrow Ecosystem */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
                  <View style={styles.cardHeader}>
                    <View>
                      <View style={styles.titleWithHelp}>
                        <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Mistake Distribution</Text>
                        <View style={[styles.expandHelpBadge, { backgroundColor: isDark ? '#3B2018' : colors.primaryFixed }]}>
                          <MaterialIcons name="touch-app" size={12} color={colors.primary} />
                          <Text style={[styles.expandHelpText, { color: colors.primary }]}>Tap arrows to unpack</Text>
                        </View>
                      </View>
                      <Text style={[styles.cardSub, { color: colors.onSurfaceVariant }]}>Tap any category arrow to reveal deep-dive analysis</Text>
                    </View>
                    <View style={[styles.totalBadge, { backgroundColor: isDark ? '#3B2018' : colors.primaryFixed }]}>
                      <Text style={[styles.totalBadgeText, { color: colors.primary }]}>{totalMistakes} Total</Text>
                    </View>
                  </View>

                  {/* Donut Chart */}
                  <View style={styles.chartWrapper}>
                    <DonutChart
                      total={totalMistakes}
                      totalLabel="Total"
                      segments={detailedSegments}
                      size={140}
                    />
                  </View>

                  {/* Arrow Ecosystem: Expandable Category Accordion */}
                  <View style={styles.accordionContainer}>
                    {detailedSegments.map((item) => (
                      <MistakeCategoryCard
                        key={item.id}
                        item={item}
                        isExpanded={expandedCategoryId === item.id}
                        onToggle={toggleCategory}
                        onLaunchDrill={() => router.push('/quiz')}
                        colors={colors}
                      />
                    ))}
                  </View>
                </View>

                {/* Recent Exam Mistakes List (Also with Arrow Ecosystem) */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Recent Test Mistakes</Text>
                      <Text style={[styles.cardSub, { color: colors.onSurfaceVariant }]}>Click arrow to inspect specific question reasoning</Text>
                    </View>
                    <View style={[styles.iconCircleButton, { backgroundColor: colors.surfaceVariant }]}>
                      <MaterialIcons name="format-list-numbered" size={18} color={colors.onSurfaceVariant} />
                    </View>
                  </View>

                  <View style={styles.recentMistakesList}>
                    {recentMistakes.map((mistake) => (
                      <RecentMistakeCard
                        key={mistake.id}
                        mistake={mistake}
                        isOpen={expandedMistakeId === mistake.id}
                        onToggle={toggleRecentMistake}
                        onOpenReview={() => router.push('/(tabs)/mistakes')}
                        colors={colors}
                      />
                    ))}
                  </View>
                </View>
              </>
            )}
          </>
        )}

        {/* --- TAB 2: CHAPTER PERFORMANCE --- */}
        {activeTab === 'chapter' && (
          <>
            {chapterStats.length === 0 ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant, padding: 24, alignItems: 'center' }]}>
                <MaterialIcons name="assessment" size={40} color={colors.primary} style={{ marginBottom: 10 }} />
                <Text style={[styles.cardTitle, { color: colors.onSurface, textAlign: 'center' }]}>No Chapter Tests Attempted</Text>
                <Text style={[styles.cardSub, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 4, marginBottom: 16 }]}>
                  Take practice tests across your syllabus to track your percentage mastery per chapter.
                </Text>
                <TouchableOpacity
                  style={[styles.drillButton, { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }]}
                  onPress={() => router.push('/practice' as any)}
                >
                  <Text style={[styles.drillButtonText, { color: '#FFFFFF' }]}>Choose a Chapter</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Chapter Performance</Text>
                    <Text style={[styles.cardSub, { color: colors.onSurfaceVariant }]}>Average mastery based on your test attempts</Text>
                  </View>
                  <View style={[styles.iconCircleButton, { backgroundColor: colors.surfaceVariant }]}>
                    <MaterialIcons name="swap-vert" size={18} color={colors.onSurfaceVariant} />
                  </View>
                </View>

                <View style={styles.chapterList}>
                  {chapterStats.map((item, idx) => (
                    <View key={item.chapter || idx} style={styles.chapterItem}>
                      <View style={styles.chapterHeader}>
                        <Text style={[styles.chapterName, { color: colors.onSurface }]}>{item.chapter}</Text>
                        <Text style={[styles.chapterPercent, { color: item.score >= 70 ? '#10B981' : item.score >= 50 ? colors.primary : colors.error }]}>
                          {item.score}%
                        </Text>
                      </View>
                      <View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
                        <View
                          style={[
                            styles.fillTrack,
                            {
                              width: `${Math.min(100, Math.max(5, item.score))}%`,
                              backgroundColor: item.score >= 70 ? '#10B981' : item.score >= 50 ? colors.primary : colors.error,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* --- TAB 3: TOPIC-WISE WEAK AREAS --- */}
        {activeTab === 'topic' && (
          <>
            {topicStats.length === 0 ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant, padding: 24, alignItems: 'center' }]}>
                <MaterialIcons name="flag" size={40} color="#10B981" style={{ marginBottom: 10 }} />
                <Text style={[styles.cardTitle, { color: colors.onSurface, textAlign: 'center' }]}>No Weak Topics Identified</Text>
                <Text style={[styles.cardSub, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 4, marginBottom: 16 }]}>
                  You have not made recurring errors on any topics yet. Keep up the high standard!
                </Text>
                <TouchableOpacity
                  style={[styles.drillButton, { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }]}
                  onPress={() => router.push('/practice' as any)}
                >
                  <Text style={[styles.drillButtonText, { color: '#FFFFFF' }]}>Practice More Questions</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.flagTitleRow}>
                    <MaterialIcons name="flag" size={20} color={colors.primary} />
                    <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Top Weak Topics</Text>
                  </View>
                  <Text style={[styles.recFocusText, { color: colors.onSurfaceVariant }]}>Recommended focus</Text>
                </View>

                <View style={styles.weakTopicsList}>
                  {topicStats.map((item) => (
                    <View key={item.topic} style={[styles.weakTopicRow, { backgroundColor: colors.surfaceVariant }]}>
                      <View style={styles.weakTopicInfo}>
                        <Text style={[styles.weakTopicTitle, { color: colors.onSurface }]}>{item.topic}</Text>
                        <View style={styles.weakTopicMeta}>
                          <Text style={[styles.needsReviewText, { color: colors.primary }]}>{item.subject}</Text>
                          <View style={[styles.miniDot, { backgroundColor: colors.outlineVariant }]} />
                          <Text style={[styles.errorsCountText, { color: colors.onSurfaceVariant }]}>{item.count} recurring error{item.count === 1 ? '' : 's'}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.drillButton, { backgroundColor: colors.primary }]}
                        onPress={() => router.push('/quiz')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.drillButtonText, { color: colors.onPrimary }]}>Drill</Text>
                        <MaterialIcons name="arrow-forward" size={14} color={colors.onPrimary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Diagnostic Insight: Coach Tip */}
        <View style={[styles.coachCard, { backgroundColor: colors.surfaceVariant }]}>
          <View style={[styles.coachIconCircle, { backgroundColor: isDark ? '#1E3860' : Theme.colors.tertiary }]}>
            <MaterialIcons name="lightbulb" size={20} color={isDark ? '#7EA4E0' : '#FFFFFF'} />
          </View>
          <View style={styles.coachContent}>
            <Text style={[styles.coachTitle, { color: colors.onSurface }]}>AI Coach Tip</Text>
            <Text style={[styles.coachBody, { color: colors.onSurfaceVariant }]}>
              Spending 45 seconds reviewing each question’s diagram before calculating reduces careless errors by 24%.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 36,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceContainer,
    borderRadius: Theme.radii.full,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Theme.colors.inverseSurface,
    ...Theme.shadows.subtle,
  },
  segmentText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
  },
  segmentTextActive: {
    color: Theme.colors.inverseOnSurface,
  },
  milestoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.secondaryContainer,
    borderRadius: Theme.radii.xl,
    padding: 14,
    gap: 12,
  },
  milestoneIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneTextContainer: {
    flex: 1,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  milestoneTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: Theme.colors.onSecondaryContainer,
  },
  deltaBadge: {
    backgroundColor: Theme.colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.full,
  },
  deltaText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.onSecondary,
  },
  milestoneBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Theme.colors.onSecondaryContainer,
    marginTop: 2,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: Theme.radii['2xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    ...Theme.shadows.card,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWithHelp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Theme.colors.onSurface,
  },
  expandHelpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Theme.colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.full,
  },
  expandHelpText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: Theme.colors.primary,
  },
  cardSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  totalBadge: {
    backgroundColor: Theme.colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radii.full,
  },
  totalBadgeText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: Theme.colors.primary,
  },
  chartWrapper: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  // Accordion / Arrow Ecosystem Styles
  accordionContainer: {
    gap: 10,
    marginTop: 4,
  },
  categoryAccordionCard: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  categoryAccordionCardExpanded: {
    borderColor: Theme.colors.borderHairline,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    ...Theme.shadows.subtle,
  },
  accordionTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  accordionLeftContent: {
    flex: 1,
    gap: 2,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryNameText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Theme.colors.onSurface,
  },
  countPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Theme.radii.full,
  },
  countPillText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
  },
  categorySubText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
    marginLeft: 16,
  },
  arrowCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  arrowCircleBtnActive: {
    backgroundColor: Theme.colors.primaryFixed,
  },
  progressTrackWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  track: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Theme.colors.surfaceContainer,
    overflow: 'hidden',
  },
  fillTrack: {
    height: '100%',
    borderRadius: 2.5,
  },
  // Detailed Analysis Panel (revealed upon arrow click)
  detailedAnalysisPanel: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderHairline,
    padding: 14,
    backgroundColor: Theme.colors.surfaceBright,
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
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.primary,
    letterSpacing: 0.2,
  },
  analysisBodyText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
    lineHeight: 18,
  },
  exampleCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: Theme.radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    gap: 6,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exampleTag: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.error,
    letterSpacing: 0.5,
  },
  exampleQuestionText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: Theme.colors.onSurface,
    lineHeight: 17,
  },
  answerComparisonBox: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: 8,
    borderRadius: 6,
    gap: 5,
    marginTop: 2,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  boldLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  userChoiceText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.error,
    flex: 1,
  },
  correctChoiceText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.secondary,
    flex: 1,
  },
  coachTipSnippet: {
    backgroundColor: Theme.colors.surfaceContainerHighest,
    padding: 10,
    borderRadius: Theme.radii.md,
    gap: 4,
  },
  coachTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  coachTipTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: Theme.colors.tertiary,
  },
  coachTipBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
    lineHeight: 16,
  },
  accordionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    gap: 8,
  },
  drillCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.radii.full,
    flex: 1,
    justifyContent: 'center',
  },
  drillCtaText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.onPrimary,
  },
  deepDiveLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.radii.full,
    backgroundColor: Theme.colors.surfaceContainer,
  },
  deepDiveLinkText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.primary,
  },
  // Recent Mistakes List
  recentMistakesList: {
    gap: 8,
  },
  recentMistakeCard: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: Theme.radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  recentMistakeCardOpen: {
    borderColor: Theme.colors.borderHairline,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    ...Theme.shadows.subtle,
  },
  recentMistakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  recentMistakeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  qNumBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.inverseSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qNumText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    color: Theme.colors.inverseOnSurface,
  },
  recentMistakeMeta: {
    flex: 1,
  },
  recentMistakeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentTopicTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: Theme.colors.onSurface,
  },
  categoryMiniTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Theme.radii.full,
  },
  categoryMiniTagText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
  },
  recentMistakeSummary: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  recentArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Theme.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentArrowBtnOpen: {
    backgroundColor: Theme.colors.primaryFixed,
  },
  recentMistakeDetails: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderHairline,
    padding: 12,
    backgroundColor: Theme.colors.surfaceBright,
    gap: 8,
  },
  recentFullQuestion: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: Theme.colors.onSurface,
    lineHeight: 18,
  },
  recentChoiceBox: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: 8,
    borderRadius: 6,
    gap: 4,
  },
  recentWrongChoice: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
  },
  boldRed: {
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Theme.colors.error,
  },
  recentRightChoice: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
  },
  boldGreen: {
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Theme.colors.secondary,
  },
  recentTakeawayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.secondaryContainer,
    padding: 8,
    borderRadius: 6,
  },
  recentTakeawayText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: Theme.colors.onSecondaryContainer,
    flex: 1,
  },
  boldTakeaway: {
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  viewFullReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Theme.radii.full,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    backgroundColor: Theme.colors.surfaceContainerLowest,
  },
  viewFullReviewText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: Theme.colors.primary,
  },
  // Chapter Section
  iconCircleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterList: {
    gap: 12,
  },
  chapterItem: {
    gap: 5,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chapterName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: Theme.colors.onSurface,
  },
  chapterPercent: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityPill: {
    backgroundColor: Theme.colors.errorContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  priorityText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.onErrorContainer,
  },
  // Topic Section
  flagTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recFocusText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
  },
  weakTopicsList: {
    gap: 10,
  },
  weakTopicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: 12,
    borderRadius: Theme.radii.lg,
  },
  weakTopicInfo: {
    flex: 1,
  },
  weakTopicTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: Theme.colors.onSurface,
  },
  weakTopicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  needsReviewText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: Theme.colors.primary,
  },
  miniDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.outlineVariant,
  },
  errorsCountText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
  },
  drillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.radii.full,
  },
  drillButtonText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.onPrimary,
  },
  // Coach Card
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainer,
    borderRadius: Theme.radii.xl,
    padding: 14,
    gap: 12,
  },
  coachIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Theme.colors.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachContent: {
    flex: 1,
  },
  coachTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: Theme.colors.onSurface,
  },
  coachBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
    lineHeight: 16,
    marginTop: 2,
  },
});
