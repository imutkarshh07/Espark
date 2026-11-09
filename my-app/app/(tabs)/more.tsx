import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppHeader } from '../../components/AppHeader';
import { authService, UserProfile } from '../../services/authService';
import { useTheme } from '../../context/ThemeContext';
import { Theme } from '../../constants/Theme';
import { studyService } from '../../services/studyService';

const FAQ_ITEMS = [
  {
    q: 'How does AI Mistake Analysis work?',
    a: 'Every answer you submit is analyzed by our microservice into 5 behavioral patterns: Conceptual Gap, Careless Error, Time Pressure, Memory Lapse, or Calculation Mistake.',
  },
  {
    q: 'How does the AI Doubt Solver answer questions?',
    a: 'It uses RAG (Retrieval-Augmented Generation) with your syllabus documents and Gemini 1.5 to provide verified, step-by-step solutions.',
  },
  {
    q: 'Is Focus Mode a quiz?',
    a: 'No! Focus Mode is a distraction-free countdown timer designed for deep study with anti-abandonment lock and allowlist protection.',
  },
  {
    q: 'How are practice tests generated?',
    a: 'You can pick any Chapter from JEE, NEET, or CBSE syllabus and choose from 10 to 30 questions with an Easy-to-Hard progression.',
  },
  {
    q: 'How does the Leaderboard work?',
    a: 'You earn Study Score by solving practice questions, completing focus sessions, and maintaining daily study streaks.',
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Modals
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [showFaqModal, setShowFaqModal] = useState<boolean>(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [contactSubject, setContactSubject] = useState<string>('');
  const [contactMessage, setContactMessage] = useState<string>('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState<boolean>(false);

  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportCategory, setReportCategory] = useState<string>('Bug');
  const [reportDescription, setReportDescription] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const u = await authService.getCurrentUser();
        setCurrentUser(u);
      } catch (e) {
        // ignore
      }
    }
    loadUser();
  }, []);

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.signOut();
          } catch (e) {
            console.warn('Sign out warning:', e);
          }
          router.replace('/auth' as any);
        },
      },
    ]);
  };

  const submitTicket = async () => {
    if (!contactSubject.trim() || !contactMessage.trim()) {
      Alert.alert('Incomplete', 'Please provide both subject and message.');
      return;
    }
    setIsSubmittingTicket(true);
    try {
      await studyService.submitSupportTicket({
        subject: contactSubject,
        message: contactMessage,
      });
      Alert.alert('Message Sent', 'Support team will reply to your registered email within 24 hours.');
      setContactSubject('');
      setContactMessage('');
      setShowContactModal(false);
    } catch (err) {
      Alert.alert('Error', 'Unable to send message. Please try again.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const submitReport = async () => {
    if (!reportDescription.trim()) {
      Alert.alert('Incomplete', 'Please describe the problem you experienced.');
      return;
    }
    setIsSubmittingReport(true);
    try {
      await studyService.reportProblem({
        category: reportCategory,
        description: reportDescription,
      });
      Alert.alert('Report Received', 'Thank you! Our engineering team has logged this issue.');
      setReportDescription('');
      setShowReportModal(false);
    } catch (err) {
      Alert.alert('Error', 'Unable to submit report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader subtitle="System & Support" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Identity Card */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
          onPress={() => router.push('/profile')}
          activeOpacity={0.8}
        >
          <View style={styles.profileLeft}>
            <View style={[styles.avatarWrapper, { borderColor: colors.primary }]}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' }} style={styles.avatarImage} />
              <View style={styles.onlineBadge} />
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.profileName, { color: colors.onSurface }]}>
                  {currentUser?.name || 'Aspirant'}
                </Text>
                <MaterialIcons name="verified" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.profileRole, { color: colors.onSurfaceVariant }]}>
                {currentUser?.exam ? `${currentUser.exam} Aspirant` : 'JEE / NEET Student'}
              </Text>
              <View style={styles.streakPill}>
                <MaterialIcons name="local-fire-department" size={14} color="#D97706" />
                <Text style={styles.streakText}>Active Study Streak</Text>
              </View>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        {/* SYSTEM & SUPPORT SECTION - STRICTLY 5 ITEMS */}
        <View style={styles.settingsGroup}>
          <Text style={[styles.groupHeading, { color: colors.onSurfaceVariant }]}>SYSTEM & SUPPORT</Text>
          <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
            
            {/* 1. Theme */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowThemeModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconCircle, { backgroundColor: isDark ? '#374151' : '#E0E7FF' }]}>
                  <MaterialIcons
                    name={isDark ? 'dark-mode' : 'light-mode'}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: colors.onSurface }]}>Theme</Text>
                  <Text style={[styles.settingSub, { color: colors.onSurfaceVariant }]}>
                    {themeMode === 'light' ? 'Light Mode' : themeMode === 'dark' ? 'Dark Mode' : 'System Default'}
                  </Text>
                </View>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.tagText, { color: colors.primary }]}>
                  {themeMode.toUpperCase()}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

            {/* 2. Help & FAQ */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowFaqModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconCircle, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
                  <MaterialIcons name="quiz" size={22} color="#10B981" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: colors.onSurface }]}>Help & FAQ</Text>
                  <Text style={[styles.settingSub, { color: colors.onSurfaceVariant }]}>
                    Platform guide, mistake analysis & RAG answers
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

            {/* 3. Contact Support */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowContactModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconCircle, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
                  <MaterialIcons name="headset-mic" size={22} color="#F59E0B" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: colors.onSurface }]}>Contact Support</Text>
                  <Text style={[styles.settingSub, { color: colors.onSurfaceVariant }]}>
                    Reach study mentors & technical team
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

            {/* 4. Report a Problem */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowReportModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconCircle, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
                  <MaterialIcons name="bug-report" size={22} color="#EF4444" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: colors.onSurface }]}>Report a Problem</Text>
                  <Text style={[styles.settingSub, { color: colors.onSurfaceVariant }]}>
                    Report bugs, UI glitches, or question errors
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

            {/* 5. About */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowAboutModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconCircle, { backgroundColor: isDark ? '#312E81' : '#E0E7FF' }]}>
                  <MaterialIcons name="info-outline" size={22} color="#6366F1" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: colors.onSurface }]}>About</Text>
                  <Text style={[styles.settingSub, { color: colors.onSurfaceVariant }]}>
                    ESpark v1.2.0 • Architecture & Credits
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

          </View>
        </View>

        {/* Sign Out Card */}
        <View style={styles.settingsGroup}>
          <TouchableOpacity
            style={[styles.signOutBtn, { backgroundColor: isDark ? '#2D1515' : '#FEF2F2', borderColor: '#FCA5A5' }]}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <MaterialIcons name="logout" size={20} color="#DC2626" />
            <Text style={styles.signOutText}>Sign Out from Device</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* THEME MODAL */}
      <Modal visible={showThemeModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Choose Theme Mode</Text>
            <Text style={[styles.modalSub, { color: colors.onSurfaceVariant }]}>
              Customize the look of your distraction-free study space.
            </Text>

            <View style={{ marginVertical: 14 }}>
              {[
                { key: 'light', label: 'Light Mode', icon: 'light-mode' },
                { key: 'dark', label: 'Dark Mode', icon: 'dark-mode' },
                { key: 'system', label: 'System Default', icon: 'settings-suggest' },
              ].map((item) => {
                const isSelected = themeMode === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.themeOptionRow,
                      {
                        backgroundColor: colors.background,
                        borderColor: isSelected ? colors.primary : colors.outlineVariant,
                      },
                    ]}
                    onPress={() => {
                      setThemeMode(item.key as any);
                      setShowThemeModal(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons
                        name={item.icon as any}
                        size={22}
                        color={isSelected ? colors.primary : colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          styles.themeOptionLabel,
                          { color: isSelected ? colors.onSurface : colors.onSurfaceVariant, fontWeight: isSelected ? '700' : '500' },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={22}
                      color={isSelected ? colors.primary : colors.outlineVariant}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={{ color: colors.onSurface, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* HELP & FAQ MODAL */}
      <Modal visible={showFaqModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCardLarge, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Help & Frequently Asked Questions</Text>
              <TouchableOpacity onPress={() => setShowFaqModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 12 }}>
              {FAQ_ITEMS.map((item, index) => {
                const isExpanded = expandedFaq === index;
                return (
                  <View
                    key={index}
                    style={[
                      styles.faqItem,
                      {
                        backgroundColor: colors.background,
                        borderColor: isExpanded ? colors.primary : colors.outlineVariant,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.faqQuestionRow}
                      onPress={() => setExpandedFaq(isExpanded ? null : index)}
                    >
                      <Text style={[styles.faqQuestionText, { color: colors.onSurface }]}>{item.q}</Text>
                      <MaterialIcons
                        name={isExpanded ? 'expand-less' : 'expand-more'}
                        size={22}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    {isExpanded && (
                      <Text style={[styles.faqAnswerText, { color: colors.onSurfaceVariant }]}>
                        {item.a}
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CONTACT SUPPORT MODAL */}
      <Modal visible={showContactModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Contact Support</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.onSurfaceVariant }]}>
              Have questions regarding your curriculum, analytics, or subscription?
            </Text>

            <TextInput
              style={[styles.inputBox, { backgroundColor: colors.background, color: colors.onSurface, borderColor: colors.outlineVariant }]}
              placeholder="Subject / Topic"
              placeholderTextColor={colors.onSurfaceVariant}
              value={contactSubject}
              onChangeText={setContactSubject}
            />

            <TextInput
              style={[
                styles.inputBox,
                {
                  height: 100,
                  backgroundColor: colors.background,
                  color: colors.onSurface,
                  borderColor: colors.outlineVariant,
                  textAlignVertical: 'top',
                },
              ]}
              placeholder="Detailed message..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={contactMessage}
              onChangeText={setContactMessage}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={submitTicket}
              disabled={isSubmittingTicket}
            >
              {isSubmittingTicket ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Support Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* REPORT A PROBLEM MODAL */}
      <Modal visible={showReportModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Report a Problem</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.onSurfaceVariant }]}>
              Help us maintain precision and speed for all students.
            </Text>

            {/* Category pills */}
            <View style={styles.categoryRow}>
              {['Bug', 'UI Issue', 'Question Error', 'Other'].map((cat) => {
                const isSelected = reportCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.background,
                        borderColor: isSelected ? colors.primary : colors.outlineVariant,
                      },
                    ]}
                    onPress={() => setReportCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        { color: isSelected ? '#FFFFFF' : colors.onSurface },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[
                styles.inputBox,
                {
                  height: 100,
                  backgroundColor: colors.background,
                  color: colors.onSurface,
                  borderColor: colors.outlineVariant,
                  textAlignVertical: 'top',
                  marginTop: 12,
                },
              ]}
              placeholder="What went wrong? Describe what you saw..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#EF4444' }]}
              onPress={submitReport}
              disabled={isSubmittingReport}
            >
              {isSubmittingReport ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Bug Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ABOUT MODAL */}
      <Modal visible={showAboutModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.aboutLogoWrapper, isDark && styles.aboutLogoWrapperDark]}>
              <Image
                source={Theme.assets.logoFull}
                style={styles.aboutLogoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.modalSub, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 6 }]}>
              Version 1.2.0 • Ultra-Compact Learning Architecture
            </Text>

            <View style={[styles.aboutCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.aboutLine, { color: colors.onSurface }]}>
                🚀 <Text style={{ fontWeight: 'bold' }}>Mobile App:</Text> React Native Expo (SDK 52)
              </Text>
              <Text style={[styles.aboutLine, { color: colors.onSurface }]}>
                ⚡ <Text style={{ fontWeight: 'bold' }}>Backend API:</Text> Node.js Express on Port 5000
              </Text>
              <Text style={[styles.aboutLine, { color: colors.onSurface }]}>
                🧠 <Text style={{ fontWeight: 'bold' }}>RAG Engine:</Text> FastAPI + ChromaDB + Gemini on Port 8000
              </Text>
              <Text style={[styles.aboutLine, { color: colors.onSurface }]}>
                🛡️ <Text style={{ fontWeight: 'bold' }}>Authentication:</Text> Supabase PostgreSQL
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={() => setShowAboutModal(false)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileRole: {
    fontSize: 12,
    marginTop: 2,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 4,
  },
  settingsGroup: {
    marginBottom: 20,
  },
  groupHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 12,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  signOutText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
  },
  modalCardLarge: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalSub: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 6,
  },
  themeOptionLabel: {
    fontSize: 14,
    marginLeft: 12,
  },
  closeModalBtn: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  faqItem: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  faqAnswerText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginVertical: 6,
  },
  submitBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aboutCard: {
    padding: 14,
    borderRadius: 12,
    marginVertical: 14,
    gap: 8,
  },
  aboutLine: {
    fontSize: 13,
    lineHeight: 18,
  },
  aboutLogoWrapper: {
    width: 170,
    height: 120,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutLogoWrapperDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 8,
  },
  aboutLogoImg: {
    width: '100%',
    height: '100%',
  },
});
