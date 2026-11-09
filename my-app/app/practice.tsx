import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { studyService } from '../services/studyService';
import { authService } from '../services/authService';
import { getNcertChaptersBySubject, NcertChapter } from '../constants/ncertCurriculum';

export default function PracticeConfigScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedExam, setSelectedExam] = useState('NEET');
  const [selectedClass, setSelectedClass] = useState('Class 12th');
  
  // Single vs Multi-subject test mode
  const [isMultiSubject, setIsMultiSubject] = useState(false);
  const [subjects, setSubjects] = useState<string[]>(['Physics', 'Chemistry', 'Biology', 'Mathematics']);
  const [selectedSubject, setSelectedSubject] = useState('Physics');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Physics', 'Chemistry']);

  // Chapters & Subtopics (Official NCERT Catalog)
  const [allChapters, setAllChapters] = useState<NcertChapter[]>(() => getNcertChaptersBySubject('Physics'));
  const [chapterClassFilter, setChapterClassFilter] = useState<string>('All');
  const [chapterSearchQuery, setChapterSearchQuery] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [selectedSubtopic, setSelectedSubtopic] = useState('All Subtopics');

  // Question count & Difficulty
  const [questionCount, setQuestionCount] = useState<number>(25);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'tough' | 'all'>('all');

  // Duration
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDurationMinutes, setCustomDurationMinutes] = useState<number>(35);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Computed recommended duration (~1.5 min/question)
  const recommendedMinutes = Math.max(3, Math.round(questionCount * 1.5));
  const effectiveDuration = isCustomDuration ? customDurationMinutes : recommendedMinutes;

  // Compute filtered visible chapters based on Class Filter & Search Query
  const visibleChapters = allChapters.filter((ch) => {
    const matchesClass =
      chapterClassFilter === 'All' ||
      ch.class === chapterClassFilter ||
      (chapterClassFilter === 'Class 10th' && (ch.class === 'Class 10th' || ch.id?.includes('_10_'))) ||
      (chapterClassFilter === 'Class 11th' && (ch.class === 'Class 11th' || ch.id?.includes('_11_'))) ||
      (chapterClassFilter === 'Class 12th' && (ch.class === 'Class 12th' || ch.id?.includes('_12_')));

    const query = chapterSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      ch.name.toLowerCase().includes(query) ||
      (ch.subtopics && ch.subtopics.some((s: string) => s.toLowerCase().includes(query)));

    return matchesClass && matchesSearch;
  });

  // Keep selected chapter in sync when visible chapters change
  useEffect(() => {
    if (visibleChapters.length > 0) {
      const exists = visibleChapters.some((c) => c.name === selectedChapter);
      if (!exists) {
        const first = visibleChapters[0];
        setSelectedChapter(first.name);
        setSubtopics(first.subtopics || []);
        setSelectedSubtopic('All Subtopics');
      }
    }
  }, [visibleChapters, selectedChapter]);

  // Load profile and initial curriculum
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const user = await authService.getCurrentUser();
        const initialExam = user?.exam || 'NEET';
        const initialClass = user?.class || 'Class 12th';
        setSelectedExam(initialExam);
        setSelectedClass(initialClass);

        await refreshSubjectsAndChapters(initialExam, initialClass, 'Physics');
      } catch (err) {
        console.warn('[PracticeConfig] Failed to initialize curriculum:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Compute available subjects: For Class 10th, 11th, 12th, Mathematics is ALWAYS included!
  const getAvailableSubjects = (exam: string, cls: string) => {
    let base = ['Physics', 'Chemistry', 'Biology'];
    if (exam === 'JEE') {
      base = ['Physics', 'Chemistry', 'Mathematics'];
    } else if (exam === 'CBSE') {
      base = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
    }

    // Always include Mathematics for Class 10, 11, or 12
    const isClass10to12 = cls.includes('10') || cls.includes('11') || cls.includes('12');
    if (isClass10to12 && !base.includes('Mathematics')) {
      base.push('Mathematics');
    }
    return base;
  };

  const refreshSubjectsAndChapters = async (exam: string, cls: string, targetSub?: string) => {
    const avail = getAvailableSubjects(exam, cls);
    setSubjects(avail);

    const activeSub = targetSub && avail.includes(targetSub) ? targetSub : avail[0] || 'Physics';
    setSelectedSubject(activeSub);

    // Set class filter default to match selected class if not Dropper
    const classFilterDefault = cls.includes('10')
      ? 'Class 10th'
      : cls.includes('11')
      ? 'Class 11th'
      : cls.includes('12')
      ? 'Class 12th'
      : 'All';
    setChapterClassFilter(classFilterDefault);

    // Guaranteed instant offline-first baseline with official NCERT chapters
    const localBaseline = getNcertChaptersBySubject(activeSub);
    setAllChapters(localBaseline);

    try {
      const chRes = await studyService.getCurriculumChapters(exam, activeSub, cls);
      const chList = chRes?.data?.allChapters || chRes?.data?.chapters || localBaseline;
      if (chList && chList.length > 0) {
        setAllChapters(chList);
      }
    } catch (e) {
      console.warn('Using offline NCERT catalog:', e);
      setAllChapters(localBaseline);
    }
  };

  const handleExamChange = (examId: string) => {
    setSelectedExam(examId);
    refreshSubjectsAndChapters(examId, selectedClass, selectedSubject);
  };

  const handleClassChange = (cls: string) => {
    setSelectedClass(cls);
    refreshSubjectsAndChapters(selectedExam, cls, selectedSubject);
  };

  const handleSingleSubjectChange = async (sub: string) => {
    setSelectedSubject(sub);
    const localBaseline = getNcertChaptersBySubject(sub);
    setAllChapters(localBaseline);

    try {
      const chRes = await studyService.getCurriculumChapters(selectedExam, sub, selectedClass);
      const chList = chRes?.data?.allChapters || chRes?.data?.chapters || localBaseline;
      if (chList && chList.length > 0) {
        setAllChapters(chList);
      }
    } catch (e) {
      console.warn('Using offline NCERT catalog:', e);
      setAllChapters(localBaseline);
    }
  };

  const toggleMultiSubject = (sub: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(sub)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter((s) => s !== sub);
      } else {
        return [...prev, sub];
      }
    });
  };

  const handleChapterSelect = (ch: any) => {
    setSelectedChapter(ch.name);
    setSubtopics(ch.subtopics || []);
    setSelectedSubtopic('All Subtopics');
  };

  const handleStartPractice = async () => {
    if (!isMultiSubject && !selectedChapter) {
      setErrorMsg('Please select a specific chapter to practice.');
      return;
    }

    if (isMultiSubject && selectedSubjects.length === 0) {
      setErrorMsg('Please select at least one subject for multi-subject test.');
      return;
    }

    setErrorMsg(null);
    setGenerating(true);

    try {
      const generated = await studyService.generateChapterTest({
        exam: selectedExam,
        classLevel: selectedClass,
        subject: isMultiSubject ? selectedSubjects[0] : selectedSubject,
        subjects: isMultiSubject ? selectedSubjects : undefined,
        chapter: selectedChapter || 'Curriculum Overview',
        subtopic: selectedSubtopic !== 'All Subtopics' ? selectedSubtopic : undefined,
        difficulty,
        count: questionCount,
        durationMinutes: effectiveDuration,
      });

      const testData = generated?.data || generated;
      if (testData?.id) {
        router.push({
          pathname: '/quiz',
          params: {
            testId: testData.id,
            exam: selectedExam,
            subject: isMultiSubject ? selectedSubjects.join(' + ') : selectedSubject,
            chapter: selectedChapter,
            durationMinutes: String(effectiveDuration),
            difficulty,
          },
        });
      } else {
        throw new Error('Test generation could not produce questions. Please try again.');
      }
    } catch (err: any) {
      console.warn('[Practice] Test generation error:', err);
      Alert.alert(
        'Practice Generation Notice',
        err?.message || 'Could not generate test questions at this time. Please check backend connection and try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <AppHeader canGoBack title="Personalized Practice" />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>Loading Academic Curriculum...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        canGoBack
        title="Practice & Mock Exam"
        subtitle={`${selectedExam} • ${isMultiSubject ? selectedSubjects.join(' + ') : selectedSubject}`}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step 1: Exam & Class Selection */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderHairline }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepNumberBadge, { backgroundColor: colors.primaryFixed }]}>
              <Text style={[styles.stepNumberText, { color: colors.onPrimaryFixedVariant }]}>1</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>EXAM & CLASS TARGET</Text>
          </View>

          {/* Exam Chips */}
          <View style={styles.examGrid}>
            {[
              { id: 'NEET', label: '🩺 NEET (UG)', tag: 'Medical' },
              { id: 'JEE', label: '📐 JEE (Main/Adv)', tag: 'Engineering' },
              { id: 'CBSE', label: '📚 CBSE Board', tag: 'Class 10-12th' },
            ].map((e) => {
              const isSelected = selectedExam === e.id;
              return (
                <TouchableOpacity
                  key={e.id}
                  style={[
                    styles.examCard,
                    {
                      backgroundColor: isSelected ? colors.primaryFixed : colors.surfaceContainerLow,
                      borderColor: isSelected ? colors.primary : colors.borderHairline,
                    },
                  ]}
                  onPress={() => handleExamChange(e.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.examCardLabel,
                      {
                        color: isSelected ? colors.onPrimaryFixedVariant : colors.onSurface,
                        fontFamily: isSelected ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold',
                      },
                    ]}
                  >
                    {e.label}
                  </Text>
                  <Text style={[styles.examCardTag, { color: isSelected ? colors.onPrimaryFixedVariant : colors.onSurfaceVariant }]}>
                    {e.tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Class Level Selector */}
          <Text style={[styles.subLabel, { color: colors.onSurfaceVariant }]}>Current Class Level:</Text>
          <View style={styles.chipsRow}>
            {['Class 10th', 'Class 11th', 'Class 12th', 'Dropper'].map((cls) => {
              const isSelected = selectedClass === cls;
              return (
                <TouchableOpacity
                  key={cls}
                  style={[
                    styles.classPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceContainerLow,
                      borderColor: isSelected ? colors.primary : colors.borderHairline,
                    },
                  ]}
                  onPress={() => handleClassChange(cls)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.classPillText,
                      {
                        color: isSelected ? colors.onPrimary : colors.onSurface,
                        fontFamily: isSelected ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold',
                      },
                    ]}
                  >
                    {cls}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 2: Test Mode & Subject Selection */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderHairline }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepNumberBadge, { backgroundColor: colors.secondaryContainer }]}>
              <Text style={[styles.stepNumberText, { color: colors.onSecondaryContainer }]}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>SUBJECT SELECTION</Text>
              <Text style={[styles.sectionSubhint, { color: colors.onSurfaceVariant }]}>
                {isMultiSubject ? 'Select multiple subjects for a combined mock test' : 'Focus on a single subject'}
              </Text>
            </View>

            {/* Multi-subject toggle button */}
            <TouchableOpacity
              style={[
                styles.modeToggleBtn,
                {
                  backgroundColor: isMultiSubject ? colors.secondary : colors.surfaceContainerLow,
                  borderColor: isMultiSubject ? colors.secondary : colors.borderHairline,
                },
              ]}
              onPress={() => setIsMultiSubject(!isMultiSubject)}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={isMultiSubject ? 'layers' : 'layers-clear'}
                size={16}
                color={isMultiSubject ? colors.onSecondary : colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.modeToggleText,
                  { color: isMultiSubject ? colors.onSecondary : colors.onSurface },
                ]}
              >
                {isMultiSubject ? 'Multi-Subject' : 'Single'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Subjects Chips (includes Maths for Class 10, 11, 12) */}
          <View style={styles.chipsRow}>
            {subjects.map((sub) => {
              const isSelected = isMultiSubject
                ? selectedSubjects.includes(sub)
                : selectedSubject === sub;

              return (
                <TouchableOpacity
                  key={sub}
                  style={[
                    styles.subjectChip,
                    {
                      backgroundColor: isSelected ? colors.secondary : colors.surfaceContainerLow,
                      borderColor: isSelected ? colors.secondary : colors.borderHairline,
                    },
                  ]}
                  onPress={() => {
                    if (isMultiSubject) {
                      toggleMultiSubject(sub);
                    } else {
                      handleSingleSubjectChange(sub);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <MaterialIcons
                    name={
                      sub === 'Biology'
                        ? 'spa'
                        : sub === 'Physics'
                        ? 'bolt'
                        : sub === 'Chemistry'
                        ? 'science'
                        : 'calculate'
                    }
                    size={16}
                    color={isSelected ? colors.onSecondary : colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.subjectChipText,
                      {
                        color: isSelected ? colors.onSecondary : colors.onSurface,
                        fontFamily: isSelected ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_500Medium',
                      },
                    ]}
                  >
                    {sub}
                  </Text>
                  {isMultiSubject && isSelected && (
                    <MaterialIcons name="check" size={14} color={colors.onSecondary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 3: Chapter & Subtopic Selection (Enabled in Single Subject mode) */}
        {!isMultiSubject ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderHairline }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepNumberBadge, { backgroundColor: colors.tertiaryContainer }]}>
                <Text style={[styles.stepNumberText, { color: colors.onTertiaryContainer }]}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>OFFICIAL NCERT CHAPTERS</Text>
                <Text style={[styles.sectionSubhint, { color: colors.onSurfaceVariant }]}>
                  {selectedSubject} • {visibleChapters.length} Chapters Available
                </Text>
              </View>
            </View>

            {/* Class Filter Tabs */}
            <Text style={[styles.subLabel, { color: colors.onSurfaceVariant }]}>Filter by Class:</Text>
            <View style={styles.chipsRow}>
              {[
                { id: 'All', label: `All (${allChapters.length})` },
                { id: 'Class 10th', label: `Class 10th (${allChapters.filter((c) => c.class === 'Class 10th').length})` },
                { id: 'Class 11th', label: `Class 11th (${allChapters.filter((c) => c.class === 'Class 11th').length})` },
                { id: 'Class 12th', label: `Class 12th (${allChapters.filter((c) => c.class === 'Class 12th').length})` },
              ].map((filterItem) => {
                const isSelected = chapterClassFilter === filterItem.id;
                return (
                  <TouchableOpacity
                    key={filterItem.id}
                    style={[
                      styles.classPill,
                      {
                        backgroundColor: isSelected ? colors.tertiary : colors.surfaceContainerLow,
                        borderColor: isSelected ? colors.tertiary : colors.borderHairline,
                      },
                    ]}
                    onPress={() => setChapterClassFilter(filterItem.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.classPillText,
                        {
                          color: isSelected ? colors.onTertiary : colors.onSurface,
                          fontFamily: isSelected ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_500Medium',
                        },
                      ]}
                    >
                      {filterItem.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Search Bar */}
            <View
              style={[
                styles.chapterSearchBox,
                {
                  backgroundColor: colors.surfaceContainerLow,
                  borderColor: colors.borderHairline,
                },
              ]}
            >
              <MaterialIcons name="search" size={18} color={colors.onSurfaceVariant} />
              <TextInput
                style={[styles.chapterSearchInput, { color: colors.onSurface }]}
                placeholder="Search NCERT chapter or topic..."
                placeholderTextColor={colors.onSurfaceVariant}
                value={chapterSearchQuery}
                onChangeText={setChapterSearchQuery}
              />
              {chapterSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setChapterSearchQuery('')} style={{ padding: 4 }}>
                  <MaterialIcons name="close" size={16} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              )}
            </View>

            {/* Chapter Selection list */}
            <Text style={[styles.subLabel, { color: colors.onSurfaceVariant }]}>
              Select Chapter ({visibleChapters.length}):
            </Text>
            {visibleChapters.length > 0 ? (
              <View style={styles.chaptersList}>
                {visibleChapters.map((ch, idx) => {
                  const isSelected = selectedChapter === ch.name;
                  return (
                    <TouchableOpacity
                      key={ch.id || idx}
                      style={[
                        styles.chapterItem,
                        {
                          backgroundColor: isSelected ? colors.primaryFixed : colors.surfaceContainerLow,
                          borderColor: isSelected ? colors.primary : colors.borderHairline,
                        },
                      ]}
                      onPress={() => handleChapterSelect(ch)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.chapterItemLeft}>
                        <MaterialIcons
                          name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                          size={20}
                          color={isSelected ? colors.primary : colors.outline}
                        />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text
                              style={[
                                styles.chapterName,
                                {
                                  color: isSelected ? colors.onPrimaryFixedVariant : colors.onSurface,
                                  fontFamily: isSelected ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold',
                                },
                              ]}
                            >
                              {ch.name}
                            </Text>
                          </View>
                          <View style={styles.chapterMetaRow}>
                            <View
                              style={[
                                styles.ncertBadge,
                                {
                                  backgroundColor: isSelected ? colors.primary : colors.surfaceContainerHigh,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.ncertBadgeText,
                                  { color: isSelected ? colors.onPrimary : colors.onSurfaceVariant },
                                ]}
                              >
                                NCERT Ch {ch.ncertChapterNo || idx + 1}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.chapterClassTag,
                                { color: isSelected ? colors.onPrimaryFixedVariant : colors.onSurfaceVariant },
                              ]}
                            >
                              {ch.class || 'Class 12th'}
                              {ch.highYield ? ' • 🔥 High Yield' : ''}
                              {ch.subtopics?.length ? ` • ${ch.subtopics.length} Subtopics` : ''}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View
                style={[
                  styles.emptyChaptersBox,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.borderHairline,
                  },
                ]}
              >
                <MaterialIcons name="menu-book" size={32} color={colors.primary} />
                <Text style={[styles.emptyChaptersText, { color: colors.onSurface }]}>
                  No NCERT chapters match "{chapterSearchQuery}" in {chapterClassFilter}
                </Text>
                <TouchableOpacity
                  style={[styles.clearFilterBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setChapterSearchQuery('');
                    setChapterClassFilter('All');
                  }}
                >
                  <Text style={[styles.clearFilterBtnText, { color: colors.onPrimary }]}>
                    Reset Filters & Show All
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Subtopic Chips if available */}
            {subtopics.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.subLabel, { color: colors.onSurfaceVariant }]}>
                  Target Specific Subtopic in {selectedChapter}:
                </Text>
                <View style={styles.subtopicsWrap}>
                  {['All Subtopics', ...subtopics].map((subt) => {
                    const isSelected = selectedSubtopic === subt;
                    return (
                      <TouchableOpacity
                        key={subt}
                        style={[
                          styles.subtopicPill,
                          {
                            backgroundColor: isSelected ? colors.tertiary : colors.surfaceContainerLow,
                            borderColor: isSelected ? colors.tertiary : colors.borderHairline,
                          },
                        ]}
                        onPress={() => setSelectedSubtopic(subt)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.subtopicPillText,
                            {
                              color: isSelected ? colors.onTertiary : colors.onSurface,
                              fontFamily: isSelected ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_500Medium',
                            },
                          ]}
                        >
                          {subt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.sectionCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderHairline }]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="auto-awesome" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>MULTI-SUBJECT CURATION</Text>
            </View>
            <Text style={[styles.sectionSubhint, { color: colors.onSurfaceVariant }]}>
              Questions will be distributed evenly across{' '}
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: colors.primary }}>
                {selectedSubjects.join(', ')}
              </Text>
              .
            </Text>
          </View>
        )}

        {/* Step 4: Question Difficulty */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderHairline }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepNumberBadge, { backgroundColor: isDark ? '#3D1208' : '#FFDAD2' }]}>
              <Text style={[styles.stepNumberText, { color: colors.primary }]}>4</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>QUESTION DIFFICULTY</Text>
          </View>

          <View style={styles.difficultyRow}>
            {[
              { id: 'easy', label: 'Easy', icon: 'sentiment-satisfied', color: '#10B981' },
              { id: 'medium', label: 'Medium', icon: 'trending-up', color: '#F59E0B' },
              { id: 'tough', label: 'Tough', icon: 'fitness-center', color: '#EF4444' },
              { id: 'all', label: 'Mixed', icon: 'tune', color: colors.primary },
            ].map((diff) => {
              const isSelected = difficulty === diff.id;
              return (
                <TouchableOpacity
                  key={diff.id}
                  style={[
                    styles.diffButton,
                    {
                      backgroundColor: isSelected ? diff.color : colors.surfaceContainerLow,
                      borderColor: isSelected ? diff.color : colors.borderHairline,
                    },
                  ]}
                  onPress={() => setDifficulty(diff.id as any)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={diff.icon as any}
                    size={16}
                    color={isSelected ? '#FFFFFF' : colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.diffButtonText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.onSurface,
                        fontFamily: isSelected ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold',
                      },
                    ]}
                  >
                    {diff.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 5: Number of Questions & Custom Duration */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderHairline }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepNumberBadge, { backgroundColor: colors.accentOliveContainer }]}>
              <Text style={[styles.stepNumberText, { color: colors.accentOlive }]}>5</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>QUESTION COUNT & TIMER</Text>
              <Text style={[styles.sectionSubhint, { color: colors.onSurfaceVariant }]}>
                Timer scales proportionally with question count or set custom duration
              </Text>
            </View>
          </View>

          {/* Question Count Presets */}
          <Text style={[styles.subLabel, { color: colors.onSurfaceVariant }]}>Choose Question Count:</Text>
          <View style={styles.countButtonsRow}>
            {[10, 25, 50, 75, 100].map((num) => {
              const isSelected = questionCount === num;
              return (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.countPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceContainerLow,
                      borderColor: isSelected ? colors.primary : colors.borderHairline,
                    },
                  ]}
                  onPress={() => setQuestionCount(num)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.countPillText,
                      {
                        color: isSelected ? colors.onPrimary : colors.onSurface,
                        fontFamily: isSelected ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold',
                      },
                    ]}
                  >
                    {num} Qs
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Stepper for Question Count */}
          <View style={[styles.customCountBox, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.borderHairline }]}>
            <Text style={[styles.customCountLabel, { color: colors.onSurface }]}>Questions: {questionCount}</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[styles.stepperBtn, { backgroundColor: colors.surfaceContainerHighest }]}
                onPress={() => setQuestionCount(Math.max(5, questionCount - 5))}
              >
                <MaterialIcons name="remove" size={18} color={colors.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stepperBtn, { backgroundColor: colors.surfaceContainerHighest }]}
                onPress={() => setQuestionCount(Math.min(150, questionCount + 5))}
              >
                <MaterialIcons name="add" size={18} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Test Timer Configuration */}
          <View style={[styles.timerCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.borderHairline }]}>
            <View style={styles.timerCardHeader}>
              <MaterialIcons name="timer" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.timerCardTitle, { color: colors.onSurface }]}>
                  Test Duration: {effectiveDuration} Minutes
                </Text>
                <Text style={[styles.timerCardSub, { color: colors.onSurfaceVariant }]}>
                  {isCustomDuration
                    ? 'Custom duration active'
                    : `Auto-computed (~1.5 min per question)`}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.timerToggleBtn,
                  { backgroundColor: isCustomDuration ? colors.primaryFixed : colors.surfaceContainerHighest },
                ]}
                onPress={() => setIsCustomDuration(!isCustomDuration)}
              >
                <Text style={[styles.timerToggleText, { color: isCustomDuration ? colors.onPrimaryFixedVariant : colors.onSurface }]}>
                  {isCustomDuration ? 'Reset Auto' : 'Customize'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Duration Presets & Stepper */}
            {isCustomDuration && (
              <View style={styles.customDurationSection}>
                <View style={styles.countButtonsRow}>
                  {[15, 30, 45, 60, 90, 120].map((mins) => {
                    const isSelected = customDurationMinutes === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        style={[
                          styles.countPill,
                          {
                            backgroundColor: isSelected ? colors.secondary : colors.surfaceContainerHighest,
                            borderColor: isSelected ? colors.secondary : colors.borderHairline,
                          },
                        ]}
                        onPress={() => setCustomDurationMinutes(mins)}
                      >
                        <Text
                          style={[
                            styles.countPillText,
                            {
                              color: isSelected ? colors.onSecondary : colors.onSurface,
                              fontSize: 12,
                            },
                          ]}
                        >
                          {mins}m
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.stepperRowSmall}>
                  <TouchableOpacity
                    style={[styles.stepperBtnSmall, { backgroundColor: colors.surfaceContainerHighest }]}
                    onPress={() => setCustomDurationMinutes(Math.max(5, customDurationMinutes - 5))}
                  >
                    <Text style={{ color: colors.onSurface, fontWeight: '700' }}>- 5m</Text>
                  </TouchableOpacity>
                  <Text style={[styles.timerLiveVal, { color: colors.onSurface }]}>{customDurationMinutes} Minutes</Text>
                  <TouchableOpacity
                    style={[styles.stepperBtnSmall, { backgroundColor: colors.surfaceContainerHighest }]}
                    onPress={() => setCustomDurationMinutes(Math.min(240, customDurationMinutes + 5))}
                  >
                    <Text style={{ color: colors.onSurface, fontWeight: '700' }}>+ 5m</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: colors.errorContainer }]}>
            <MaterialIcons name="error-outline" size={18} color={colors.error} />
            <Text style={[styles.errorBoxText, { color: colors.onErrorContainer }]}>{errorMsg}</Text>
          </View>
        )}

        {/* Start Practice Action */}
        <TouchableOpacity
          style={[
            styles.startPracticeBtn,
            { backgroundColor: colors.primary, opacity: generating ? 0.7 : 1 },
          ]}
          onPress={handleStartPractice}
          disabled={generating}
          activeOpacity={0.88}
        >
          {generating ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <>
              <Text style={[styles.startPracticeBtnText, { color: colors.onPrimary }]}>
                Start {questionCount} Qs Test ({effectiveDuration} mins)
              </Text>
              <MaterialIcons name="play-arrow" size={22} color={colors.onPrimary} />
            </>
          )}
        </TouchableOpacity>
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
    gap: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  sectionSubhint: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  subLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    marginTop: 4,
  },
  examGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  examCard: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  examCardLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  examCardTag: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  classPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  classPillText: {
    fontSize: 12,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  modeToggleText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  subjectChipText: {
    fontSize: 13,
  },
  chapterSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  chapterSearchInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    padding: 0,
  },
  chaptersList: {
    gap: 8,
  },
  chapterItem: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  chapterItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chapterName: {
    fontSize: 13,
  },
  chapterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  ncertBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ncertBadgeText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  chapterClassTag: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
  },
  emptyChaptersBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  emptyChaptersText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    textAlign: 'center',
  },
  clearFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  clearFilterBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
  },
  subtopicsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  subtopicPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  subtopicPillText: {
    fontSize: 11,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  diffButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  diffButtonText: {
    fontSize: 12,
  },
  countButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countPill: {
    flex: 1,
    minWidth: 50,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: {
    fontSize: 13,
  },
  customCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  customCountLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  timerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timerCardTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  timerCardSub: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
  },
  timerToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  timerToggleText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
  },
  customDurationSection: {
    gap: 8,
    paddingTop: 6,
  },
  stepperRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  stepperBtnSmall: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  timerLiveVal: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  errorBoxText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    flex: 1,
  },
  startPracticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  startPracticeBtnText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
  },
});
