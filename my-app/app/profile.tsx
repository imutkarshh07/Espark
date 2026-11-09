import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { useAppTheme } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { studyService } from '../services/studyService';
import { authService } from '../services/authService';
import { safeStorage } from '../services/safeStorage';

export const STUDY_STRATEGIES = [
  {
    title: 'Conceptual Mastery & NCERT Foundations',
    short: 'Conceptual Mastery',
    icon: 'psychology' as const,
    desc: 'Deep focus on core foundational concepts, NCERT diagrams, and underlying laws.',
  },
  {
    title: 'High-Yield MCQ Drills & Rapid Recall',
    short: 'Speed & High-Yield MCQs',
    icon: 'bolt' as const,
    desc: 'Rapid question solving under timed conditions to maximize retention and accuracy.',
  },
  {
    title: 'Numerical Derivations & Analytical Depth',
    short: 'Analytical Problem-Solving',
    icon: 'architecture' as const,
    desc: 'Rigorous multi-step problem solving, calculus mechanics, and quantitative analysis.',
  },
  {
    title: 'NCERT Exemplars & Board Pattern Derivations',
    short: 'Board & Exemplar Mastery',
    icon: 'menu-book' as const,
    desc: 'Step-by-step descriptive answers, standard derivations, and board-marking rubrics.',
  },
  {
    title: 'PYQ (Previous Years) & Error Rectification',
    short: 'PYQ & Mistake Elimination',
    icon: 'track-changes' as const,
    desc: 'Targeting past 10-year question patterns and rectifying high-frequency error traps.',
  },
];

export function getAcademicDirectives(examName: string) {
  const norm = (examName || '').trim().toUpperCase();
  if (norm.includes('JEE')) {
    return {
      id: 'JEE',
      title: 'JEE Main & Advanced',
      targetLabel: 'JEE Preparation',
      code: 'ENGINEERING ADMISSIONS',
      subjects: 'Physics, Mathematics & Chemistry',
      subjectFocusDetail: 'Rigorous analytical mechanics, calculus, and multi-concept physical chemistry.',
      icon: 'architecture' as const,
      color: '#0066FF',
      badge: 'Analytical Stream',
    };
  } else if (norm.includes('CBSE')) {
    return {
      id: 'CBSE',
      title: 'CBSE Board Examination',
      targetLabel: 'CBSE Board Curriculum',
      code: 'CENTRAL BOARD SENIOR SEC',
      subjects: 'Physics, Chemistry, Maths & Biology',
      subjectFocusDetail: 'Full NCERT syllabus coverage, definitions, chemical reactions & exemplar solutions.',
      icon: 'menu-book' as const,
      color: '#10B981',
      badge: 'Board Syllabus',
    };
  } else {
    return {
      id: 'NEET',
      title: 'NEET (UG) Medical',
      targetLabel: 'NEET Medical Preparation',
      code: 'NATIONAL MEDICAL ENTRANCE',
      subjects: 'Biology (Botany + Zoology) & Chemistry',
      subjectFocusDetail: 'High-yield NCERT line-by-line factual recall, biological pathways & organic reactions.',
      icon: 'biotech' as const,
      color: '#8B5CF6',
      badge: 'Medical Stream',
    };
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const [name, setName] = useState<string>('');
  const [exam, setExam] = useState<string>('NEET');
  const [className, setClassName] = useState<string>('Class 12th');
  const [email, setEmail] = useState<string>('');
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [studyHours, setStudyHours] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editExam, setEditExam] = useState<string>('NEET');
  const [saving, setSaving] = useState<boolean>(false);
  const [strategyIndex, setStrategyIndex] = useState<number>(0);
  const [targetIntakeYear, setTargetIntakeYear] = useState<number>(new Date().getFullYear() + 1);

  useEffect(() => {
    async function loadProfile() {
      try {
        const [profile, attempts, currentUser, focusStats] = await Promise.all([
          studyService.getProfile().catch(() => null),
          studyService.listAttempts().catch(() => []),
          authService.getCurrentUser().catch(() => null),
          studyService.getFocusStats().catch(() => null),
        ]);
        if (currentUser?.email) {
          setEmail(currentUser.email);
          setIsDemoUser(Boolean((currentUser as any)?.isDemo || currentUser.email.includes('demo')));
        }
        const resolvedName = profile?.name || currentUser?.name || 'Student';
        setName(resolvedName);
        setEditName(resolvedName);
        if (profile?.exam) {
          setExam(profile.exam);
          setEditExam(profile.exam);
        } else if (currentUser?.exam) {
          setExam(currentUser.exam);
          setEditExam(currentUser.exam);
        }
        if (profile?.class) {
          setClassName(profile.class);
        }

        const safeAttempts = attempts || [];
        setAttemptCount(safeAttempts.length);
        const focusH = parseFloat(focusStats?.totalHours) || 0;
        const testMinutes = safeAttempts.length * 10;
        const totalH = +(focusH + (testMinutes / 60)).toFixed(1);
        setStudyHours(totalH);
        setStreakDays(focusStats?.streakDays || 0);

        // Load academic directives preferences
        const savedStrat = await safeStorage.getItem('academic_directive_strategy');
        if (savedStrat !== null) {
          const idx = parseInt(savedStrat, 10);
          if (!isNaN(idx) && idx >= 0 && idx < STUDY_STRATEGIES.length) {
            setStrategyIndex(idx);
          }
        }
        const savedIntake = await safeStorage.getItem('academic_target_intake');
        if (savedIntake !== null) {
          const yr = parseInt(savedIntake, 10);
          if (!isNaN(yr) && yr >= 2024 && yr <= 2035) {
            setTargetIntakeYear(yr);
          }
        }
      } catch (err) {
        console.warn('[Profile] Error loading profile:', err);
      }
    }
    loadProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      await authService.signOut();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    router.replace('/auth' as any);
  };

  const handleSwitchAccount = () => {
    router.push('/auth' as any);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const updated = await studyService.updateProfile({
        name: editName,
        exam: editExam,
      });
      if (updated?.name) setName(updated.name);
      if (updated?.exam) setExam(updated.exam);
      setIsEditing(false);
    } catch (e) {
      console.warn('[Profile] Save failed:', e);
      setName(editName);
      setExam(editExam);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCycleExam = async () => {
    const order = ['NEET', 'JEE', 'CBSE'];
    const current = (isEditing ? editExam : exam) || 'NEET';
    const norm = current.toUpperCase();
    const currIndex = norm.includes('JEE') ? 1 : norm.includes('CBSE') ? 2 : 0;
    const nextExam = order[(currIndex + 1) % order.length];
    setExam(nextExam);
    setEditExam(nextExam);
    try {
      await studyService.updateProfile({ exam: nextExam });
    } catch (e) {
      console.warn('[Profile] Cycle exam update failed:', e);
    }
  };

  const handleCycleStrategy = async () => {
    const next = (strategyIndex + 1) % STUDY_STRATEGIES.length;
    setStrategyIndex(next);
    await safeStorage.setItem('academic_directive_strategy', String(next));
  };

  const handleCycleIntakeYear = async () => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear + 1, currentYear + 2, currentYear + 3, currentYear];
    const currIdx = years.indexOf(targetIntakeYear);
    const nextYear = years[(currIdx + 1) % years.length];
    setTargetIntakeYear(nextYear);
    await safeStorage.setItem('academic_target_intake', String(nextYear));
  };

  const handleLaunchPractice = () => {
    const current = (isEditing ? editExam : exam) || 'NEET';
    router.push({
      pathname: '/practice' as any,
      params: { exam: current },
    });
  };

  const activeExam = (isEditing ? editExam : exam) || 'NEET';
  const directive = getAcademicDirectives(activeExam);
  const currentStrategy = STUDY_STRATEGIES[strategyIndex] || STUDY_STRATEGIES[0];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title="Student Profile"
        canGoBack
        showMenu={false}
        rightAction={
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.surfaceContainerLow }]}
            onPress={() => {
              if (isEditing) {
                handleSaveProfile();
              } else {
                setIsEditing(true);
              }
            }}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <MaterialIcons name={isEditing ? 'check' : 'edit'} size={15} color={colors.primary} />
                <Text style={[styles.editText, { color: colors.primary }]}>{isEditing ? 'Save' : 'Edit'}</Text>
              </>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Identity Card */}
        <View style={[styles.identityCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
          <View style={styles.glowCircle1} />
          <View style={styles.glowCircle2} />

          <View style={styles.avatarContainer}>
            <Image source={{ uri: Theme.assets.avatar }} style={styles.avatarImg} />
            <View style={styles.schoolBadge}>
              <MaterialIcons name="school" size={14} color={Theme.colors.onSecondary} />
            </View>
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <Text style={[styles.editInputLabel, { color: colors.primary }]}>Full Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={[
                  styles.editTextInput,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    color: colors.onSurface,
                    borderColor: colors.outlineVariant,
                  },
                ]}
                placeholder="ENTER YOUR NAME"
                placeholderTextColor={colors.outline}
              />

              <Text style={[styles.editInputLabel, { color: colors.primary }]}>Target Exam</Text>
              <TextInput
                value={editExam}
                onChangeText={setEditExam}
                style={[
                  styles.editTextInput,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    color: colors.onSurface,
                    borderColor: colors.outlineVariant,
                  },
                ]}
                placeholder="Target Exam (e.g. NEET)"
                placeholderTextColor={colors.outline}
              />
              <View style={styles.profileExamPillsRow}>
                {[
                  { id: 'NEET', label: '🩺 NEET' },
                  { id: 'JEE', label: '📐 JEE' },
                  { id: 'CBSE', label: '📚 CBSE' },
                ].map((item) => {
                  const normalized = (editExam || '').trim().toUpperCase();
                  const isSel =
                    item.id === 'CBSE'
                      ? normalized.includes('CBSE')
                      : normalized.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.profileExamPill,
                        {
                          backgroundColor: isSel ? colors.primaryFixed : colors.surfaceContainerLow,
                          borderColor: isSel ? colors.primary : colors.outlineVariant,
                        },
                        isSel && styles.profileExamPillActive,
                      ]}
                      onPress={() => setEditExam(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.profileExamPillText,
                          {
                            color: isSel ? colors.primary : colors.onSurfaceVariant,
                            fontWeight: isSel ? '700' : '600',
                          },
                          isSel && styles.profileExamPillTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.nameText, { color: colors.onSurface }]}>{name || 'Student'}</Text>
              <View style={styles.aspirantPill}>
                <View style={styles.pulsingDot} />
                <Text style={styles.aspirantText}>Student • {exam} Aspirant</Text>
              </View>
              <Text style={[styles.bioText, { color: colors.onSurfaceVariant }]}>
                Disciplined preparation with an emphasis on conceptual clarity & revision consistency.
              </Text>
            </>
          )}
        </View>

        {/* Mascot Encouragement Widget */}
        <View style={[styles.mascotWidget, { backgroundColor: colors.surfaceContainerHigh }]}>
          <View style={[styles.mascotIconBox, { backgroundColor: colors.surfaceContainerLowest }]}>
            <Image source={Theme.assets.logoEmblem} style={styles.mascotImg} resizeMode="contain" />
          </View>
          <View style={[styles.speechBubble, { backgroundColor: colors.surfaceContainerLowest }]}>
            <View style={[styles.bubbleNotch, { backgroundColor: colors.surfaceContainerLowest }]} />
            <View style={styles.bubbleHeader}>
              <Text style={[styles.buddyTitle, { color: colors.primary }]}>ESpark Coach Insight</Text>
              <MaterialIcons name="auto-awesome" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.buddyQuote, { color: colors.onSurface }]}>
              “You’re consistently targeting your weak spots, {name || 'scholar'}! Keep going.”
            </Text>
          </View>
        </View>

        {/* Consistency & Weekly Streak Hub */}
        <View style={[styles.consistencyCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
          <View style={styles.consistencyHeader}>
            <View style={styles.momentumCluster}>
              <View style={[styles.fireIconBox, { backgroundColor: colors.primaryFixed }]}>
                <MaterialIcons name="local-fire-department" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.momentumSub, { color: colors.outline }]}>MOMENTUM</Text>
                <Text style={[styles.momentumTitle, { color: colors.onSurface }]}>Consistency Hub</Text>
              </View>
            </View>
            <View style={[styles.levelBadge, { backgroundColor: colors.secondaryFixed }]}>
              <Text style={[styles.levelText, { color: colors.onSecondaryFixedVariant }]}>
                {streakDays === 0
                  ? 'Day 0 • Streak'
                  : streakDays < 3
                  ? 'Level 1 Scholar'
                  : streakDays < 7
                  ? 'Level 2 Explorer'
                  : streakDays < 14
                  ? 'Level 3 Achiever'
                  : 'Level 4 Master'}
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.surfaceContainerLow }]}>
              <View style={styles.statBoxHeader}>
                <MaterialIcons name="bolt" size={16} color={colors.primary} />
                <Text style={[styles.statBoxLabel, { color: colors.onSurfaceVariant }]}>Current Habit</Text>
              </View>
              <Text style={[styles.statLargeVal, { color: colors.onSurface }]}>{streakDays} Days</Text>
              <Text style={[styles.statSubVal, { color: colors.onSurfaceVariant }]}>Active Study Streak</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.surfaceContainerLow }]}>
              <View style={styles.statBoxHeader}>
                <MaterialIcons name="schedule" size={16} color={colors.tertiary} />
                <Text style={[styles.statBoxLabel, { color: colors.onSurfaceVariant }]}>Dedication</Text>
              </View>
              <Text style={[styles.statLargeVal, { color: colors.onSurface }]}>{studyHours} hrs</Text>
              <Text style={[styles.statSubVal, { color: colors.onSurfaceVariant }]}>Logged Study Time</Text>
            </View>
          </View>
        </View>

        {/* Academic Directives */}
        <View style={styles.directivesSection}>
          <View style={styles.directivesHeader}>
            <Text style={[styles.directivesTitle, { color: colors.onSurface }]}>Academic Directives</Text>
            <Text style={[styles.directivesSub, { color: colors.outline }]}>Interactive Curriculum Guide</Text>
          </View>

          {/* Card 1: Exam Goal */}
          <TouchableOpacity
            style={[styles.directiveCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}
            onPress={handleCycleExam}
            activeOpacity={0.8}
          >
            <View style={styles.directiveTopRow}>
              <View style={styles.directiveLeft}>
                <View style={[styles.directiveIconBox, { backgroundColor: colors.surfaceContainerHigh }]}>
                  <MaterialIcons name="flag" size={22} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.directiveTag, { color: colors.outline }]}>EXAM GOAL • {directive.code}</Text>
                  <Text style={[styles.directiveMainText, { color: colors.onSurface }]}>{directive.title}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.onTrackPill, { backgroundColor: colors.secondaryFixed }]}>
                  <View style={[styles.greenMiniDot, { backgroundColor: colors.secondary }]} />
                  <Text style={[styles.onTrackText, { color: colors.onSecondaryFixedVariant }]}>Active</Text>
                </View>
                <View style={[styles.directiveTapBadge, { backgroundColor: colors.surfaceContainerLow }]}>
                  <MaterialIcons name="swap-horiz" size={14} color={colors.primary} />
                  <Text style={[styles.directiveTapText, { color: colors.primary }]}>Switch</Text>
                </View>
              </View>
            </View>

            <View style={[styles.directiveSubRow, { backgroundColor: colors.surfaceContainerLow }]}>
              <View style={styles.intakeLeft}>
                <MaterialIcons name="event" size={16} color={colors.onSurfaceVariant} />
                <Text style={[styles.intakeLabel, { color: colors.onSurfaceVariant }]}>Target Intake</Text>
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleCycleIntakeYear();
                }}
                style={styles.intakeYearBtn}
                activeOpacity={0.7}
              >
                <Text style={[styles.intakeValue, { color: colors.onSurface }]}>Year {targetIntakeYear}</Text>
                <MaterialIcons name="sync" size={13} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Card 2: Preferred Focus */}
          <TouchableOpacity
            style={[styles.directiveCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}
            onPress={handleCycleStrategy}
            activeOpacity={0.8}
          >
            <View style={styles.directiveTopRow}>
              <View style={styles.directiveLeft}>
                <View style={[styles.directiveIconBox, { backgroundColor: colors.tertiaryFixed }]}>
                  <MaterialIcons name={directive.icon} size={22} color={colors.tertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.directiveTag, { color: colors.outline }]}>PREFERRED FOCUS • {directive.badge.toUpperCase()}</Text>
                  <Text style={[styles.directiveMainText, { color: colors.onSurface }]}>
                    {directive.subjects}
                  </Text>
                </View>
              </View>
              <View style={[styles.directiveTapBadge, { backgroundColor: colors.tertiaryFixed }]}>
                <MaterialIcons name="tune" size={14} color={colors.onTertiaryFixedVariant} />
                <Text style={[styles.directiveTapText, { color: colors.onTertiaryFixedVariant }]}>Tune</Text>
              </View>
            </View>

            <Text style={[styles.directiveStrategyDesc, { color: colors.onSurfaceVariant }]}>
              {currentStrategy.desc}
            </Text>

            <View style={[styles.directiveSubRow, { backgroundColor: colors.surfaceContainerLow }]}>
              <View style={styles.intakeLeft}>
                <MaterialIcons name={currentStrategy.icon} size={16} color={colors.onSurfaceVariant} />
                <Text style={[styles.intakeLabel, { color: colors.onSurfaceVariant }]}>Core Strategy</Text>
              </View>
              <Text style={[styles.intakeValue, { color: colors.tertiary }]}>{currentStrategy.short}</Text>
            </View>
          </TouchableOpacity>

          {/* Card 3: Active Study Plan */}
          <TouchableOpacity
            style={[styles.directiveCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}
            onPress={handleLaunchPractice}
            activeOpacity={0.8}
          >
            <View style={styles.directiveTopRow}>
              <View style={styles.directiveLeft}>
                <View style={[styles.directiveIconBox, { backgroundColor: colors.secondaryContainer }]}>
                  <MaterialIcons name="assignment" size={22} color={colors.secondary} />
                </View>
                <View>
                  <Text style={[styles.directiveTag, { color: colors.outline }]}>ACTIVE STUDY PLAN</Text>
                  <Text style={[styles.directiveMainText, { color: colors.onSurface }]}>Progressive Chapter Mastery</Text>
                </View>
              </View>
              <View style={[styles.directiveTapBadge, { backgroundColor: colors.primaryFixed }]}>
                <MaterialIcons name="play-arrow" size={14} color={colors.primary} />
                <Text style={[styles.directiveTapText, { color: colors.primary }]}>Practice Now</Text>
              </View>
            </View>

            <View style={[styles.directiveSubRow, { backgroundColor: colors.surfaceContainerLow }]}>
              <View style={styles.intakeLeft}>
                <MaterialIcons name="track-changes" size={16} color={colors.onSurfaceVariant} />
                <Text style={[styles.intakeLabel, { color: colors.onSurfaceVariant }]}>Completed Tests</Text>
              </View>
              <Text style={[styles.intakeValue, { color: colors.onSurface }]}>{attemptCount} Attempt{attemptCount === 1 ? '' : 's'}</Text>
            </View>

            <View style={styles.planActionPrompt}>
              <Text style={[styles.planPromptText, { color: colors.primary }]}>
                Tap to configure chapters & start practice →
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Account & Session Hub */}
        <View style={styles.accountSection}>
          <View style={styles.directivesHeader}>
            <Text style={[styles.directivesTitle, { color: colors.onSurface }]}>Account & Session</Text>
            <View style={[styles.authBadge, { backgroundColor: colors.surfaceContainerLow }]}>
              <View style={[styles.authDot, { backgroundColor: isDemoUser ? colors.primary : colors.secondary }]} />
              <Text style={[styles.authBadgeText, { color: colors.onSurfaceVariant }]}>{isDemoUser ? 'Demo Session' : 'Supabase Cloud'}</Text>
            </View>
          </View>

          {/* Permissions & Privacy Card */}
          <TouchableOpacity
            style={[styles.accountCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant, marginBottom: 12 }]}
            onPress={() => router.push('/permissions' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.accountRow}>
              <View style={[styles.emailIconBox, { backgroundColor: colors.secondaryContainer }]}>
                <MaterialIcons name="security" size={18} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.accountLabel, { color: colors.onSurfaceVariant }]}>Permissions & Privacy</Text>
                <Text style={[styles.accountValue, { color: colors.onSurface }]}>Camera, Photos, Focus & Notifications</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>

          <View style={[styles.accountCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
            <View style={styles.accountRow}>
              <View style={[styles.emailIconBox, { backgroundColor: colors.primaryFixed }]}>
                <MaterialIcons name="alternate-email" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.accountLabel, { color: colors.onSurfaceVariant }]}>Current Account</Text>
                <Text style={[styles.accountValue, { color: colors.onSurface }]}>{email || 'Guest Student'}</Text>
              </View>
            </View>

            <View style={styles.accountActionsRow}>
              <TouchableOpacity
                style={[styles.switchAccountBtn, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}
                onPress={handleSwitchAccount}
                activeOpacity={0.8}
              >
                <MaterialIcons name="swap-horiz" size={18} color={colors.primary} />
                <Text style={[styles.switchAccountBtnText, { color: colors.primary }]}>Switch Account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
                activeOpacity={0.8}
              >
                <MaterialIcons name="logout" size={18} color={colors.error} />
                <Text style={[styles.signOutBtnText, { color: colors.error }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
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
    gap: 16,
    paddingBottom: 40,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.radii.full,
  },
  editText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.primary,
  },
  identityCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: Theme.radii['2xl'],
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    position: 'relative',
    overflow: 'hidden',
    ...Theme.shadows.card,
  },
  glowCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Theme.colors.primaryFixed,
    opacity: 0.35,
  },
  glowCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.colors.secondaryFixed,
    opacity: 0.3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: Theme.colors.surfaceContainerLow,
  },
  schoolBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.surfaceContainerLowest,
  },
  nameText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
    color: Theme.colors.onSurface,
    letterSpacing: -0.4,
  },
  aspirantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radii.full,
    marginTop: 6,
    marginBottom: 8,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.primary,
  },
  aspirantText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: Theme.colors.onPrimaryFixedVariant,
  },
  bioText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  mascotWidget: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Theme.colors.surfaceContainerHigh,
    borderRadius: Theme.radii['2xl'],
    padding: 12,
    gap: 12,
  },
  mascotIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    ...Theme.shadows.subtle,
  },
  mascotImg: {
    width: 32,
    height: 32,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: Theme.radii.lg,
    padding: 10,
    position: 'relative',
    ...Theme.shadows.subtle,
  },
  bubbleNotch: {
    position: 'absolute',
    left: -5,
    top: 14,
    width: 10,
    height: 10,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    transform: [{ rotate: '45deg' }],
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  buddyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: Theme.colors.primary,
  },
  buddyQuote: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: Theme.colors.onSurface,
    lineHeight: 17,
  },
  consistencyCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: Theme.radii['2xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    ...Theme.shadows.card,
    gap: 12,
  },
  consistencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  momentumCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fireIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentumSub: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.outline,
    letterSpacing: 0.6,
  },
  momentumTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: Theme.colors.onSurface,
  },
  levelBadge: {
    backgroundColor: Theme.colors.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radii.full,
  },
  levelText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.onSecondaryFixedVariant,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: 12,
    borderRadius: Theme.radii.lg,
    gap: 2,
  },
  statBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statBoxLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
  },
  statLargeVal: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
    color: Theme.colors.onSurface,
    marginTop: 4,
  },
  statSubVal: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
  },
  directivesSection: {
    gap: 10,
  },
  directivesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  directivesTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: Theme.colors.onSurface,
  },
  directivesSub: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: Theme.colors.outline,
  },
  directiveCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: Theme.radii['2xl'],
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    ...Theme.shadows.subtle,
    gap: 10,
  },
  directiveTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  directiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  directiveIconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directiveTag: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 9,
    color: Theme.colors.outline,
    letterSpacing: 0.5,
  },
  directiveMainText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Theme.colors.onSurface,
  },
  onTrackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radii.full,
  },
  greenMiniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Theme.colors.secondary,
  },
  onTrackText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.onSecondaryFixedVariant,
  },
  directiveSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.radii.md,
  },
  intakeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  intakeLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
  },
  intakeValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.onSurface,
  },
  intakeYearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  directiveTapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radii.full,
  },
  directiveTapText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
  },
  directiveStrategyDesc: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 2,
    marginTop: -2,
  },
  planActionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  planPromptText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
  },
  editForm: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  editInputLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.primary,
  },
  editTextInput: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: Theme.radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: Theme.colors.onSurface,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
  },
  accountSection: {
    gap: 10,
    marginTop: 6,
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radii.full,
  },
  authDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  authBadgeText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.onSurfaceVariant,
  },
  accountCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: Theme.radii['2xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    gap: 14,
    ...Theme.shadows.subtle,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
  },
  accountValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Theme.colors.onSurface,
    marginTop: 1,
  },
  accountActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
  },
  switchAccountBtn: {
    flex: 1,
    height: 44,
    borderRadius: Theme.radii.lg,
    backgroundColor: Theme.colors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
  },
  switchAccountBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.primary,
  },
  signOutBtn: {
    flex: 1,
    height: 44,
    borderRadius: Theme.radii.lg,
    backgroundColor: 'rgba(190, 84, 60, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(190, 84, 60, 0.2)',
  },
  signOutBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.error,
  },
  profileExamPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  profileExamPill: {
    flex: 1,
    height: 34,
    borderRadius: Theme.radii.full,
    backgroundColor: Theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
  },
  profileExamPillActive: {
    backgroundColor: Theme.colors.primaryFixed,
    borderColor: Theme.colors.primary,
  },
  profileExamPillText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
  },
  profileExamPillTextActive: {
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Theme.colors.primary,
  },
});
