import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  LayoutAnimation,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { AppHeader } from '../../components/AppHeader';
import { studyService } from '../../services/studyService';
import { useTheme } from '../../context/ThemeContext';
import { InsightCard } from '../../components/mistakes/InsightCard';
import { DrillItemCard } from '../../components/mistakes/DrillItemCard';

interface QuestionMistakeData {
  id: string;
  qNum: number;
  totalQ: number;
  subject: string;
  topic: string;
  category: string;
  categoryColor: string;
  examLevel: string;
  headline: string;
  patternBody: string;
  selectedOption: string;
  selectedReason: string;
  correctOption: string;
  correctReason: string;
  insights: {
    id: string;
    num: number;
    title: string;
    subtitle: string;
    badgeBg: string;
    badgeText: string;
    content: string;
    highlight?: string;
  }[];
  drills: {
    id: string;
    title: string;
    diff: string;
    time: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    bgColor: string;
    iconColor: string;
  }[];
}

const MISTAKES_DATA: QuestionMistakeData[] = [
  {
    id: 'q3',
    qNum: 3,
    totalQ: 25,
    subject: 'Genetics',
    topic: 'Mendelian Genetics',
    category: 'Conceptual',
    categoryColor: '#be543c',
    examLevel: 'NEET / AP Bio Level',
    headline: 'Terminology Inversion (Phenotype vs Genotype)',
    patternBody:
      'Phenotype refers exclusively to observable structural, physiological, or functional traits, whereas Genotype is the inherited allelic code. This was a classic terminology inversion under rapid reading.',
    selectedOption: 'Option B: "Phenotype represents the nucleotide sequence and allelic combination."',
    selectedReason: 'Confused the Greek root "phainein" (to appear/show) with genetic code sequence.',
    correctOption: 'Option D: "Phenotype is observable physical manifestation produced by genotype & environment."',
    correctReason: 'Correctly recognizes outward physical traits as phenotype.',
    insights: [
      {
        id: 'i1',
        num: 1,
        title: 'The Core Concept',
        subtitle: 'Allelic blueprint vs expressed physical reality',
        badgeBg: Theme.colors.secondaryFixed,
        badgeText: Theme.colors.onSecondaryFixedVariant,
        content:
          'Genotype is the heritable genetic makeup (e.g., Bb or BB) located inside chromosomes. Phenotype is the outward expression resulting from both that genotype and environmental influences (e.g., purple petals vs white petals, enzyme activity rates). Remember: "P" for Physical/Phenotype, "G" for Gene/Genotype.',
      },
      {
        id: 'i2',
        num: 2,
        title: 'Why This Matters in Exams',
        subtitle: 'Appears in 18% of genetics test questions',
        badgeBg: Theme.colors.tertiaryFixed,
        badgeText: Theme.colors.onTertiaryFixedVariant,
        content:
          'This distinction appears in 18% of genetics test questions. Confusing the two causes cascade mistakes when computing Monohybrid phenotypic (3:1) vs genotypic (1:2:1) ratios and Dihybrid cross test results (9:3:3:1).',
      },
      {
        id: 'i3',
        num: 3,
        title: 'AI Tutor Strategy',
        subtitle: 'Targeted spaced repetition plan',
        badgeBg: Theme.colors.primaryFixed,
        badgeText: Theme.colors.onPrimaryFixedVariant,
        content:
          'Solve 3 quick targeted drills right now. Spacing this repetition within 15 minutes cements the distinction before your next full mock exam. Look for the trigger words: "observable", "expressed", or "structural".',
      },
    ],
    drills: [
      {
        id: 'd1',
        title: 'Genotype ratios in F2 generation',
        diff: 'Easy',
        time: '2 mins',
        icon: 'format-list-numbered',
        bgColor: Theme.colors.secondaryContainer,
        iconColor: Theme.colors.secondary,
      },
      {
        id: 'd2',
        title: 'Monohybrid vs Dihybrid cross test',
        diff: 'Medium',
        time: '3 mins',
        icon: 'compare',
        bgColor: Theme.colors.primaryFixed,
        iconColor: Theme.colors.primary,
      },
    ],
  },
  {
    id: 'q7',
    qNum: 7,
    totalQ: 25,
    subject: 'Cell Biology',
    topic: 'Meiosis & Mitosis',
    category: 'Careless',
    categoryColor: '#34675f',
    examLevel: 'NEET / Medical Prep',
    headline: 'Centromere Disjunction Timing Slip',
    patternBody:
      'In Anaphase I, centromeres do NOT divide; homologous chromosome pairs separate. Centromeres divide strictly in Anaphase II and Mitotic Anaphase.',
    selectedOption: 'Option A: "Centromeres split during Anaphase I, halving chromosome number."',
    selectedReason: 'Overlooked the difference between homologous dyad separation vs sister chromatid separation.',
    correctOption: 'Option C: "Sister chromatids disjoin during Anaphase II upon centromere cleavage."',
    correctReason: 'Centromeres split only in Anaphase II of meiosis.',
    insights: [
      {
        id: 'i1',
        num: 1,
        title: 'Meiosis Disjunction Rule',
        subtitle: 'Reductional (I) vs Equational (II) division',
        badgeBg: Theme.colors.secondaryFixed,
        badgeText: Theme.colors.onSecondaryFixedVariant,
        content:
          'Meiosis I is Reductional: Homologs pair as bivalents and separate without centromere division. Meiosis II is Equational: Just like mitosis, cohesin at centromeres is cleaved, allowing sister chromatids to separate.',
      },
      {
        id: 'i2',
        num: 2,
        title: 'Chromosome Counting Trap',
        subtitle: 'Top trap in high-stakes biology papers',
        badgeBg: Theme.colors.tertiaryFixed,
        badgeText: Theme.colors.onTertiaryFixedVariant,
        content:
          'Count centromeres to count chromosomes! In Anaphase I, a cell with 2n=4 still has 4 centromeres (each with 2 chromatids). In Anaphase II, 2 centromeres split into 4 individual centromeres temporarily.',
      },
      {
        id: 'i3',
        num: 3,
        title: 'AI Coach Drill Prescription',
        subtitle: 'Visual diagram matching drill',
        badgeBg: Theme.colors.primaryFixed,
        badgeText: Theme.colors.onPrimaryFixedVariant,
        content:
          'Spend 20 seconds labeling the spindle poles on any cell division question diagram before looking at options. Diagram verification reduces careless phase errors by 35%.',
      },
    ],
    drills: [
      {
        id: 'd3',
        title: 'Anaphase I vs II Chromosome counts',
        diff: 'Medium',
        time: '3 mins',
        icon: 'hub',
        bgColor: Theme.colors.secondaryContainer,
        iconColor: Theme.colors.secondary,
      },
      {
        id: 'd4',
        title: 'Meiotic Phase Identification',
        diff: 'Hard',
        time: '4 mins',
        icon: 'biotech',
        bgColor: Theme.colors.primaryFixed,
        iconColor: Theme.colors.primary,
      },
    ],
  },
  {
    id: 'q14',
    qNum: 14,
    totalQ: 25,
    subject: 'Genetics',
    topic: 'Molecular Biology',
    category: 'Memory Gap',
    categoryColor: '#822714',
    examLevel: 'AP Bio / MCAT',
    headline: 'Enzyme Mechanism Confusion (Gyrase vs Helicase)',
    patternBody:
      'DNA Helicase unwinds the double helix by breaking hydrogen bonds, which creates positive supercoiling ahead of the fork. Topoisomerase (DNA Gyrase) introduces transient breaks to relieve that supercoiling.',
    selectedOption: 'Option C: "Helicase prevents supercoiling of the DNA strands ahead of the fork."',
    selectedReason: 'Conflated the unzipping action of Helicase with tension-relief catalytic activity.',
    correctOption: 'Option A: "Topoisomerase relieves topological tension by nicking and re-ligating phosphodiester backbones."',
    correctReason: 'Topoisomerase specifically relaxes positive supercoils.',
    insights: [
      {
        id: 'i1',
        num: 1,
        title: 'Replication Machinery Division of Labor',
        subtitle: 'Helicase, Topoisomerase, and SSBPs',
        badgeBg: Theme.colors.secondaryFixed,
        badgeText: Theme.colors.onSecondaryFixedVariant,
        content:
          'Think of rope unravelling: Helicase is your hand forcing the two strands apart. Topoisomerase is the scissor that snips the wound-up tension ahead so the rope doesn’t knot up. Single-Stranded Binding Proteins (SSBPs) prevent re-annealing.',
      },
      {
        id: 'i2',
        num: 2,
        title: 'Pharmacological & Clinical Relevance',
        subtitle: 'Fluoroquinolones & Chemotherapy targets',
        badgeBg: Theme.colors.tertiaryFixed,
        badgeText: Theme.colors.onTertiaryFixedVariant,
        content:
          'Bacterial DNA Gyrase is inhibited by ciprofloxacin, while human Topoisomerase II is targeted by etoposide in oncology. Examiners love testing this enzyme because of its direct pharmacological applications.',
      },
      {
        id: 'i3',
        num: 3,
        title: 'AI Spaced Memory Prompt',
        subtitle: 'Flashcard scheduled for 48h',
        badgeBg: Theme.colors.primaryFixed,
        badgeText: Theme.colors.onPrimaryFixedVariant,
        content:
          'A quick flashcard will appear on your dashboard tomorrow morning to lock this enzyme distinction into long-term recall.',
      },
    ],
    drills: [
      {
        id: 'd5',
        title: 'Replication Fork Enzymes Drill',
        diff: 'Easy',
        time: '2 mins',
        icon: 'science',
        bgColor: Theme.colors.secondaryContainer,
        iconColor: Theme.colors.secondary,
      },
      {
        id: 'd6',
        title: 'DNA Repair & Polymerase Mechanisms',
        diff: 'Hard',
        time: '4 mins',
        icon: 'autorenew',
        bgColor: Theme.colors.primaryFixed,
        iconColor: Theme.colors.primary,
      },
    ],
  },
];

export default function MistakesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [liveMistakes, setLiveMistakes] = useState<QuestionMistakeData[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Arrow Ecosystem State: which deep dive insights are expanded
  // Default: insight 1 expanded, others collapsed with arrows for progressive disclosure
  const [expandedInsightIds, setExpandedInsightIds] = useState<string[]>(['i1']);
  
  // Arrow Ecosystem State: toggle choice detail explanation
  const [showFullChoiceDetail, setShowFullChoiceDetail] = useState<boolean>(false);

  useEffect(() => {
    async function loadLiveMistakes() {
      try {
        setLoading(true);
        const data = await studyService.listMistakes();
        if (data && data.length > 0) {
          const mapped: QuestionMistakeData[] = data.map((m: any, idx: number) => {
            const insight = m.insight || {};
            const pq = insight.practice_questions || [];
            const cat = m.category || 'conceptual';
            return {
              id: m.id,
              qNum: idx + 1,
              totalQ: data.length,
              subject: m.questions?.topic || m.attempts?.tests?.subject || 'Biology',
              topic: m.questions?.topic || 'Genetics',
              category: cat.charAt(0).toUpperCase() + cat.slice(1),
              categoryColor: cat === 'conceptual' ? '#be543c' : cat === 'careless' ? '#be823c' : '#5176ac',
              examLevel: 'NEET Level',
              headline: insight.diagnosis || m.reason || 'Terminology Inversion Detected',
              patternBody: insight.explanation || m.reason || 'Incorrect answer pattern diagnosed by AI.',
              selectedOption: `Selected: "${m.student_answer}"`,
              selectedReason: m.reason || 'Underlying misconception identified by AI.',
              correctOption: `Correct: "${m.correct_answer}"`,
              correctReason: insight.explanation || 'Verified correct answer concept.',
              insights: [
                {
                  id: `i1-${m.id}`,
                  num: 1,
                  title: 'Cognitive Diagnosis',
                  subtitle: 'Diagnosed by Python RAG & Gemini',
                  badgeBg: Theme.colors.secondaryFixed,
                  badgeText: Theme.colors.onSecondaryFixedVariant,
                  content: insight.explanation || m.reason || 'Review foundational principles for this topic.',
                },
                {
                  id: `i2-${m.id}`,
                  num: 2,
                  title: 'Targeted Remediation Plan',
                  subtitle: 'Actionable steps to prevent recurrence',
                  badgeBg: Theme.colors.primaryFixed,
                  badgeText: Theme.colors.onPrimaryFixedVariant,
                  content: insight.recommended_action || 'Practice 3 similar concept questions and review lecture notes.',
                },
              ],
              drills: pq.length > 0 ? pq.map((q: any, qIdx: number) => ({
                id: `drill-${qIdx}`,
                title: q.question_text || `Targeted Drill on ${m.questions?.topic || 'Topic'}`,
                diff: 'Medium',
                time: '3 mins',
                icon: 'fitness-center' as keyof typeof MaterialIcons.glyphMap,
                bgColor: Theme.colors.secondaryContainer,
                iconColor: Theme.colors.secondary,
              })) : [
                {
                  id: 'd-def',
                  title: 'Targeted Remediation Practice',
                  diff: 'Medium',
                  time: '3 mins',
                  icon: 'fitness-center' as keyof typeof MaterialIcons.glyphMap,
                  bgColor: Theme.colors.secondaryContainer,
                  iconColor: Theme.colors.secondary,
                },
              ],
            };
          });
          setLiveMistakes(mapped);
        } else {
          setLiveMistakes([]);
        }
      } catch (err) {
        console.warn('[Mistakes] Could not load live mistakes:', err);
        setLiveMistakes([]);
      } finally {
        setLoading(false);
      }
    }
    loadLiveMistakes();
  }, []);

  const currentQ = liveMistakes[selectedQuestionIndex] || liveMistakes[0] || null;

  const toggleInsight = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedInsightIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAllInsights = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const allIds = currentQ.insights.map((i) => i.id);
    if (expandedInsightIds.length === allIds.length) {
      setExpandedInsightIds([]);
    } else {
      setExpandedInsightIds(allIds);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <AppHeader title="Mistake Analysis" subtitle="Review Mode" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.onSurfaceVariant, fontSize: 13 }}>Loading mistakes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentQ || liveMistakes.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <AppHeader title="Mistake Analysis" subtitle="Review Mode" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.emptyMistakesCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
            <MaterialIcons name="fact-check" size={48} color="#10B981" style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Zero Mistakes Recorded</Text>
            <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
              You currently have no unreviewed mistakes! Take a practice test to analyze question gaps, behavioral slips, and receive AI cognitive coaching.
            </Text>
            <TouchableOpacity
              style={[styles.startPracticeBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/practice' as any)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="bolt" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.startPracticeBtnText}>Start Practice Test</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title="Mistake Analysis"
        subtitle={`${currentQ.subject} • Q${currentQ.qNum} of ${currentQ.totalQ}`}
        rightAction={
          <View style={[styles.reviewModePill, { backgroundColor: colors.surfaceVariant }]}>
            <MaterialIcons name="lightbulb" size={15} color={colors.primary} />
            <Text style={[styles.reviewModeText, { color: colors.onSurfaceVariant }]}>Review Mode</Text>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Switcher Tabs (Browse Mistakes) */}
        <View style={styles.questionSwitcherContainer}>
          <Text style={[styles.switcherLabel, { color: colors.onSurfaceVariant }]}>Review Question:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.switcherScroll}
          >
            {liveMistakes.map((q, idx) => {
              const isSelected = selectedQuestionIndex === idx;
              return (
                <TouchableOpacity
                  key={q.id}
                  style={[
                    styles.qTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant },
                    isSelected && [
                      styles.qTabItemActive,
                      {
                        backgroundColor: isDark ? colors.surfaceContainerHighest : colors.inverseSurface,
                        borderColor: isDark ? colors.surfaceContainerHighest : colors.inverseSurface,
                      },
                    ],
                  ]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSelectedQuestionIndex(idx);
                    setExpandedInsightIds(['i1']); // reset to first insight expanded for clean view
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.qTabDot,
                      { backgroundColor: q.categoryColor },
                    ]}
                  />
                  <Text
                    style={[
                      styles.qTabText,
                      { color: isSelected ? (isDark ? colors.onSurface : colors.inverseOnSurface) : colors.onSurfaceVariant },
                    ]}
                  >
                    Q{q.qNum}: {q.topic}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Encouraging Context Callout */}
        <View style={[styles.encouragementCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}>
          <View style={styles.encouragementRow}>
            <View style={[styles.iconCircle, { backgroundColor: isDark ? '#114438' : colors.secondaryFixed }]}>
              <MaterialIcons name="psychology" size={22} color={isDark ? '#4ECCA3' : colors.onSecondaryFixed} />
            </View>
            <View style={styles.encouragementTextContainer}>
              <Text style={[styles.encouragementTitle, { color: colors.onSurface }]}>Errors are Data, Not Deficits</Text>
              <Text style={[styles.encouragementBody, { color: colors.onSurfaceVariant }]}>
                Tap each section's arrow to inspect detailed analysis on demand, keeping your mind uncluttered and calm.
              </Text>
            </View>
          </View>
        </View>

        {/* Root Cause Overview Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.categoryPill, { backgroundColor: `${currentQ.categoryColor}20` }]}>
              <View style={[styles.categoryDot, { backgroundColor: currentQ.categoryColor }]} />
              <Text style={[styles.categoryText, { color: currentQ.categoryColor }]}>
                Category: {currentQ.category}
              </Text>
            </View>
            <Text style={[styles.levelText, { color: colors.outline }]}>{currentQ.examLevel}</Text>
          </View>

          <Text style={[styles.sectionHeadline, { color: colors.onSurface }]}>{currentQ.headline}</Text>
          <Text style={[styles.patternBody, { color: colors.onSurfaceVariant }]}>{currentQ.patternBody}</Text>

          {/* Student Choice vs Correct with Arrow Toggle */}
          <View style={[styles.errorHighlightBox, { backgroundColor: isDark ? '#451212' : colors.errorContainer }]}>
            <View style={styles.errorHeader}>
              <MaterialIcons name="close" size={16} color={colors.error} />
              <Text style={[styles.errorTag, { color: isDark ? '#FFA0A0' : colors.onErrorContainer }]}>YOU SELECTED</Text>
            </View>
            <Text style={[styles.selectedChoiceText, { color: colors.onSurface }]}>{currentQ.selectedOption}</Text>
            <Text style={[styles.correctChoiceText, { color: colors.onSurfaceVariant }]}>
              Correct: <Text style={[styles.correctHighlight, { color: isDark ? '#4ECCA3' : colors.secondary }]}>{currentQ.correctOption}</Text>
            </Text>

            {/* Arrow Toggle for Distractor Rationale */}
            <TouchableOpacity
              style={styles.choiceDetailToggleRow}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowFullChoiceDetail(!showFullChoiceDetail);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.choiceDetailToggleText, { color: colors.primary }]}>
                {showFullChoiceDetail ? 'Hide Choice Breakdown' : 'Why You Picked This Distractor'}
              </Text>
              <MaterialIcons
                name={showFullChoiceDetail ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>

            {showFullChoiceDetail && (
              <View style={[styles.choiceDetailContent, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.7)' }]}>
                <Text style={[styles.distractorReasonText, { color: isDark ? '#FF9A9A' : colors.error }]}>
                  <Text style={[styles.boldText, { color: colors.onSurface }]}>Pitfall: </Text>
                  {currentQ.selectedReason}
                </Text>
                <Text style={[styles.correctReasonText, { color: isDark ? '#6CE3BD' : colors.secondary }]}>
                  <Text style={[styles.boldText, { color: colors.onSurface }]}>Resolution: </Text>
                  {currentQ.correctReason}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Deep Dive Breakdown Cards with Arrow Accordion */}
        <View style={styles.breakdownHeaderRow}>
          <View>
            <Text style={[styles.breakdownHeading, { color: colors.onSurface }]}>Deep Dive Breakdown</Text>
            <Text style={[styles.breakdownSub, { color: colors.outline }]}>
              {currentQ.insights.length} Insights • Tap arrows to explore
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.expandAllBtn, { backgroundColor: colors.surfaceVariant }]}
            onPress={toggleAllInsights}
            activeOpacity={0.7}
          >
            <Text style={[styles.expandAllText, { color: colors.primary }]}>
              {expandedInsightIds.length === currentQ.insights.length ? 'Collapse All' : 'Expand All'}
            </Text>
            <MaterialIcons
              name={
                expandedInsightIds.length === currentQ.insights.length
                  ? 'keyboard-arrow-up'
                  : 'keyboard-arrow-down'
              }
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Arrow Accordion for Each Insight */}
        {currentQ.insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            isExpanded={expandedInsightIds.includes(insight.id)}
            onToggle={toggleInsight}
            colors={colors}
          />
        ))}

        {/* Targeted Practice Section */}
        <View style={styles.practiceSection}>
          <View style={styles.practiceHeader}>
            <View>
              <Text style={[styles.breakdownHeading, { color: colors.onSurface }]}>Targeted Practice Questions</Text>
              <Text style={[styles.breakdownSub, { color: colors.outline }]}>
                {currentQ.drills.length} Curated drill items for {currentQ.topic}
              </Text>
            </View>
            <View style={styles.timeEstRow}>
              <MaterialIcons name="bolt" size={16} color={colors.primary} />
              <Text style={[styles.timeEstText, { color: colors.primary }]}>~5 min</Text>
            </View>
          </View>

          {currentQ.drills.map((drill) => (
            <DrillItemCard
              key={drill.id}
              drill={drill}
              onPress={() => router.push('/quiz')}
              colors={colors}
            />
          ))}
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
  reviewModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.radii.full,
  },
  reviewModeText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
  },
  // Question Switcher
  questionSwitcherContainer: {
    gap: 8,
  },
  switcherLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  switcherScroll: {
    gap: 8,
    paddingRight: 16,
  },
  qTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.radii.full,
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
  },
  qTabItemActive: {
    backgroundColor: Theme.colors.inverseSurface,
    borderColor: Theme.colors.inverseSurface,
    ...Theme.shadows.subtle,
  },
  qTabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  qTabText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
  },
  qTabTextActive: {
    color: Theme.colors.inverseOnSurface,
  },
  encouragementCard: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: Theme.radii.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
  },
  encouragementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Theme.colors.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  encouragementTextContainer: {
    flex: 1,
  },
  encouragementTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Theme.colors.onSurface,
  },
  encouragementBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 2,
  },
  card: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: Theme.radii['2xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    ...Theme.shadows.card,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radii.full,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
  },
  levelText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: Theme.colors.outline,
  },
  sectionHeadline: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Theme.colors.onSurface,
  },
  patternBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: Theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  errorHighlightBox: {
    backgroundColor: Theme.colors.errorContainer,
    padding: 12,
    borderRadius: Theme.radii.lg,
    gap: 6,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorTag: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.onErrorContainer,
    letterSpacing: 0.5,
  },
  selectedChoiceText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: Theme.colors.onSurface,
  },
  correctChoiceText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
  },
  correctHighlight: {
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Theme.colors.secondary,
  },
  choiceDetailToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(186, 26, 26, 0.15)',
    marginTop: 4,
  },
  choiceDetailToggleText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: Theme.colors.primary,
  },
  choiceDetailContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 10,
    borderRadius: Theme.radii.md,
    gap: 4,
    marginTop: 4,
  },
  distractorReasonText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.error,
    lineHeight: 16,
  },
  correctReasonText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.secondary,
    lineHeight: 16,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  breakdownHeading: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: Theme.colors.onSurface,
  },
  breakdownSub: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: Theme.colors.outline,
    marginTop: 1,
  },
  expandAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radii.full,
    backgroundColor: Theme.colors.surfaceContainerLow,
  },
  expandAllText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: Theme.colors.primary,
  },
  // Insight Card Accordion Styles
  insightCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: Theme.radii.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    ...Theme.shadows.subtle,
    overflow: 'hidden',
  },
  insightCardExpanded: {
    borderColor: Theme.colors.outlineVariant,
    ...Theme.shadows.card,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightLeftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
  },
  insightHeaderMeta: {
    flex: 1,
  },
  insightTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Theme.colors.onSurface,
  },
  insightSubtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 1,
  },
  insightArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  insightArrowBtnActive: {
    backgroundColor: Theme.colors.primaryFixed,
  },
  insightExpandedBody: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderHairline,
    marginTop: 12,
    paddingTop: 12,
    paddingLeft: 38,
  },
  insightBodyText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: Theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  boldText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Theme.colors.onSurface,
  },
  practiceSection: {
    gap: 10,
    marginTop: 6,
  },
  practiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timeEstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timeEstText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.primary,
  },
  drillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 12,
    borderRadius: Theme.radii.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    ...Theme.shadows.subtle,
  },
  drillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  drillIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillInfo: {
    flex: 1,
  },
  drillTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: Theme.colors.onSurface,
  },
  drillMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  easyBadge: {
    backgroundColor: Theme.colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.full,
  },
  easyText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.onSecondaryContainer,
  },
  drillTime: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.outline,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMistakesCard: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  startPracticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startPracticeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
