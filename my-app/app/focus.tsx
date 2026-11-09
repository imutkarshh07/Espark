import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Animated,
  Easing,
  Vibration,
  Platform,
  BackHandler,
  AppState,
  ScrollView,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { studyService } from '../services/studyService';
import {
  focusSessionService,
  ActiveFocusSession,
  DISTRACTING_APPS_PREVIEW,
} from '../services/focusSessionService';
import {
  focusProtectionService,
  InstalledApp,
  FocusProtectionStatus,
} from '../services/focusProtectionService';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const PRESETS = [
  { label: '25m', minutes: 25, title: 'Pomodoro' },
  { label: '50m', minutes: 50, title: 'Deep Work' },
  { label: '90m', minutes: 90, title: 'Ultra Block' },
  { label: 'Custom', minutes: 0, title: 'Custom' },
];

const MOTIVATIONAL_QUOTES = [
  "“Focus is a muscle. The more you practice, the stronger it gets.”",
  "“Small disciplined hours yield extraordinary rank results.”",
  "“Deep focus beats 10 hours of distracted study every single day.”",
  "“Clear mind, sharp problem solving. Stay in the zone.”",
  "“Success in JEE & NEET is built one distraction-free session at a time.”",
];

export default function FocusModeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // Duration & Session State
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [subjectTag, setSubjectTag] = useState<string>('Physics / Deep Study');
  const [distractionViolations, setDistractionViolations] = useState<number>(0);

  // Timestamps for accurate elapsed time tracking
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<number | null>(null);

  // Real Installed Applications
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [appSearchQuery, setAppSearchQuery] = useState<string>('');
  const [isLoadingApps, setIsLoadingApps] = useState<boolean>(false);

  // Protection & Environment Status
  const [protectionStatus, setProtectionStatus] = useState<FocusProtectionStatus | null>(null);

  // Modals
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('45');
  const [showAllowedConfigModal, setShowAllowedConfigModal] = useState<boolean>(false);
  const [showControlledMenuModal, setShowControlledMenuModal] = useState<boolean>(false);
  const [showProtectionModal, setShowProtectionModal] = useState<boolean>(false);
  const [showInterruptedModal, setShowInterruptedModal] = useState<boolean>(false);
  const [interruptedSession, setInterruptedSession] = useState<ActiveFocusSession | null>(null);
  const [showQuitConfirmModal, setShowQuitConfirmModal] = useState<boolean>(false);
  const [showPowerUninstallModal, setShowPowerUninstallModal] = useState<boolean>(false);

  // Always-On Minimalistic Clock & Ambient States
  const [isZenClockMode, setIsZenClockMode] = useState<boolean>(true);
  const [wallClockTime, setWallClockTime] = useState<Date>(new Date());
  const [soundscape, setSoundscape] = useState<'none' | 'rain' | 'whitenoise' | 'library'>('none');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isKioskPinned, setIsKioskPinned] = useState<boolean>(false);

  // Quotes
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Pulse animation for active timer
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Refresh protection status check
  const refreshProtectionStatus = useCallback(async () => {
    try {
      const status = await focusProtectionService.getProtectionStatus();
      setProtectionStatus(status);
    } catch (err) {
      console.warn('[Focus] Failed to check protection status:', err);
    }
  }, []);

  // 1. Initial Load: Load real installed apps, protection status, and check interrupted sessions
  useEffect(() => {
    let isMounted = true;

    async function init() {
      await refreshProtectionStatus();

      // Load installed apps from PackageManager
      setIsLoadingApps(true);
      try {
        const apps = await focusProtectionService.getInstalledApps();
        const savedPackages = await focusSessionService.getSavedAllowedPackages();
        const savedSet = new Set(savedPackages);

        // Mark apps enabled if in saved set (default to first 3 if none saved)
        const appsWithEnabled = apps.map((app, index) => ({
          ...app,
          enabled: savedSet.size > 0 ? savedSet.has(app.packageName) : index < 3,
        }));

        if (isMounted) {
          setInstalledApps(appsWithEnabled);
        }
      } catch (err) {
        console.warn('[Focus] Error loading installed apps:', err);
      } finally {
        if (isMounted) setIsLoadingApps(false);
      }

      // Check if an active session was previously interrupted
      const existing = await focusSessionService.getActiveSession();
      if (existing && existing.status === 'active') {
        const remaining = focusSessionService.computeRemainingSeconds(existing.endTime);
        if (remaining > 0) {
          if (isMounted) {
            setInterruptedSession(existing);
            setShowInterruptedModal(true);
          }
        } else {
          // Timer finished while app was closed
          await focusSessionService.clearActiveSession();
          await focusProtectionService.stopFocusProtection();
          studyService.recordFocusSession({
            durationSeconds: existing.durationMinutes * 60,
            durationMinutes: existing.durationMinutes,
            subject: existing.subjectTag,
            completed: true,
          }).catch(() => {});
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [refreshProtectionStatus]);

  // 2. Rotate motivational quotes every 20 seconds
  useEffect(() => {
    const qInterval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 20000);
    return () => clearInterval(qInterval);
  }, []);

  // 3. Keep display awake during active focus session (Always-On Minimalist Clock)
  useEffect(() => {
    if (isActive) {
      activateKeepAwakeAsync('focus-clock').catch((e) => console.log('KeepAwake note:', e));
    } else {
      deactivateKeepAwake('focus-clock').catch(() => {});
    }
    return () => {
      deactivateKeepAwake('focus-clock').catch(() => {});
    };
  }, [isActive]);

  // 4. Live Wall Clock heartbeat (updates every second for real-time time of day)
  useEffect(() => {
    const tInterval = setInterval(() => {
      setWallClockTime(new Date());
    }, 1000);
    return () => clearInterval(tInterval);
  }, []);

  // 5. Pulse animation during active session
  useEffect(() => {
    if (isActive && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive, isPaused]);

  // 6. Robust Timestamp-Based Timer Heartbeat (survives re-renders and backgrounding)
  useEffect(() => {
    let interval: any = null;

    if (isActive && sessionEndTime && !isPaused) {
      interval = setInterval(() => {
        const remaining = focusSessionService.computeRemainingSeconds(sessionEndTime);
        setRemainingSeconds(remaining);

        if (remaining <= 0) {
          // Session Finished Successfully!
          clearInterval(interval);
          setIsActive(false);
          setIsCompleted(true);
          setRemainingSeconds(0);
          deactivateKeepAwake('focus-clock').catch(() => {});

          if (Platform.OS !== 'web') {
            Vibration.vibrate([0, 500, 200, 500]);
          }

          // Record session completion
          const totalSec = selectedMinutes * 60;
          studyService.recordFocusSession({
            durationSeconds: totalSec,
            durationMinutes: selectedMinutes,
            subject: subjectTag,
            completed: true,
          }).catch((err) => console.warn('[Focus] Failed to record completed session:', err));

          focusSessionService.clearActiveSession().catch(() => {});
          focusProtectionService.stopFocusProtection().catch(() => {});
          focusProtectionService.stopLockTask().catch(() => {});
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, sessionEndTime, selectedMinutes, subjectTag]);

  // 5. AppState Lifecycle Handling (survives backgrounding, tracks distraction violations, updates protection check)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshProtectionStatus();

        if (isActive && sessionEndTime) {
          const syncedRemaining = focusSessionService.computeRemainingSeconds(sessionEndTime);
          setRemainingSeconds(syncedRemaining);

          if (syncedRemaining <= 0) {
            setIsActive(false);
            setIsCompleted(true);
            focusSessionService.clearActiveSession().catch(() => {});
            focusProtectionService.stopFocusProtection().catch(() => {});
          }
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (isActive) {
          // Student left the ESpark app during active focus
          setDistractionViolations((prev) => {
            const nextVal = prev + 1;
            if (sessionStartTime && sessionEndTime) {
              const approvedPkgs = installedApps.filter((a) => a.enabled).map((a) => a.packageName);
              focusSessionService.saveActiveSession({
                id: `foc-${sessionStartTime}`,
                startTime: sessionStartTime,
                endTime: sessionEndTime,
                durationMinutes: selectedMinutes,
                subjectTag,
                allowedApps: installedApps.filter((a) => a.enabled).map((a) => a.name),
                allowedPackages: approvedPkgs,
                distractionViolations: nextVal,
                status: 'active',
              }).catch(() => {});
            }
            return nextVal;
          });

          if (Platform.OS !== 'web') {
            Vibration.vibrate([0, 300, 150, 300]);
          }
        }
      }
    });

    return () => subscription.remove();
  }, [isActive, sessionEndTime, sessionStartTime, selectedMinutes, subjectTag, installedApps, refreshProtectionStatus]);

  // 6. Strict Hardware Back Button Interception (NO QUIT DURING ACTIVE FOCUS)
  useEffect(() => {
    const onBackPress = () => {
      if (isActive) {
        Alert.alert(
          '🛡️ Focus Mode Locked',
          'Focus session is in progress.\n\nExit is disabled until your study timer completes. Keep going!',
          [{ text: 'Stay in Focus', style: 'cancel' }]
        );
        return true; // Strictly consume event and prevent leaving
      }
      return false; // Allow standard back when not focusing
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [isActive]);

  // Start Focus Session
  const handleStartFocus = async () => {
    const now = Date.now();
    const durationMs = selectedMinutes * 60 * 1000;
    const end = now + durationMs;

    const approvedApps = installedApps.filter((a) => a.enabled);
    const approvedPackages = approvedApps.map((a) => a.packageName);

    setSessionStartTime(now);
    setSessionEndTime(end);
    setRemainingSeconds(selectedMinutes * 60);
    setDistractionViolations(0);
    setIsActive(true);

    // 1. Sync with native Android Accessibility Service via SharedPreferences
    await focusProtectionService.startFocusProtection(end, approvedPackages);

    // 2. Persist active session in local storage
    await focusSessionService.saveActiveSession({
      id: `foc-${now}`,
      startTime: now,
      endTime: end,
      durationMinutes: selectedMinutes,
      subjectTag,
      allowedApps: approvedApps.map((a) => a.name),
      allowedPackages: approvedPackages,
      distractionViolations: 0,
      status: 'active',
    });

    // 3. Save preferred allowed packages
    await focusSessionService.saveAllowedPackages(approvedPackages);

    if (Platform.OS !== 'web') {
      Vibration.vibrate(200);
    }
  };

  // Resume an interrupted session
  const handleResumeInterrupted = async () => {
    if (!interruptedSession) return;
    const remaining = focusSessionService.computeRemainingSeconds(interruptedSession.endTime);
    setSelectedMinutes(interruptedSession.durationMinutes);
    setRemainingSeconds(remaining);
    setSessionStartTime(interruptedSession.startTime);
    setSessionEndTime(interruptedSession.endTime);
    setSubjectTag(interruptedSession.subjectTag || 'Physics / Deep Study');
    setDistractionViolations(interruptedSession.distractionViolations || 0);

    // Sync with native protection
    await focusProtectionService.startFocusProtection(
      interruptedSession.endTime,
      interruptedSession.allowedPackages || []
    );

    setIsActive(true);
    setShowInterruptedModal(false);
  };

  // Discard interrupted session
  const handleDiscardInterrupted = async () => {
    if (interruptedSession) {
      const elapsedSec = Math.max(0, Math.round((Date.now() - interruptedSession.startTime) / 1000));
      if (elapsedSec >= 30) {
        studyService.recordFocusSession({
          durationSeconds: elapsedSec,
          durationMinutes: Math.max(1, Math.round(elapsedSec / 60)),
          subject: interruptedSession.subjectTag,
          completed: false,
        }).catch(() => {});
      }
      await focusSessionService.clearActiveSession();
      await focusProtectionService.stopFocusProtection();
    }
    setShowInterruptedModal(false);
    setInterruptedSession(null);
  };

  // Preset Selection
  const selectPreset = (mins: number) => {
    if (isActive) {
      Alert.alert('Session in progress', 'Duration cannot be changed during an active focus session.');
      return;
    }
    if (mins === 0) {
      setShowCustomModal(true);
    } else {
      setSelectedMinutes(mins);
      setRemainingSeconds(mins * 60);
    }
  };

  const applyCustomDuration = () => {
    const parsed = parseInt(customInput, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 300) {
      Alert.alert('Invalid Duration', 'Please enter a duration between 1 and 300 minutes.');
      return;
    }
    setSelectedMinutes(parsed);
    setRemainingSeconds(parsed * 60);
    setShowCustomModal(false);
  };

  // Allowed Apps Selection & Management
  const toggleAllowedApp = (packageName: string) => {
    if (isActive) {
      Alert.alert('Focus Active', 'Allowed apps cannot be modified while Focus Mode is active.');
      return;
    }
    setInstalledApps((prev) => {
      const updated = prev.map((app) =>
        app.packageName === packageName ? { ...app, enabled: !app.enabled } : app
      );
      const enabledPackages = updated.filter((a) => a.enabled).map((a) => a.packageName);
      focusSessionService.saveAllowedPackages(enabledPackages).catch(() => {});
      return updated;
    });
  };

  // Launch a REAL installed app during active focus
  const handleLaunchApp = async (app: InstalledApp) => {
    const launched = await focusProtectionService.launchApp(app.packageName);
    if (!launched) {
      Alert.alert(
        app.name,
        `Could not directly launch ${app.name}. You may switch to it, but remember that opening unapproved apps will bring you back to ESpark.`
      );
    }
  };

  // Time formatters
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalSeconds = selectedMinutes * 60;
  const progressRatio = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;

  // Filtered approved real apps
  const activeApprovedApps = installedApps.filter((a) => a.enabled);

  // Filtered list for search modal
  const filteredApps = installedApps.filter((a) =>
    a.name.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
    a.packageName.toLowerCase().includes(appSearchQuery.toLowerCase())
  );

  // Wall Clock Time Formatters
  const formattedWallClock = wallClockTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const formattedWallDate = wallClockTime.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // SVG Circular Ring Constants
  const RING_SIZE = 260;
  const STROKE_WIDTH = 10;
  const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2; // 125
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~785.4
  const strokeDashoffset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progressRatio)));

  // In-Session Handlers
  const handleTogglePause = () => {
    if (!isActive) return;
    if (!isPaused) {
      setIsPaused(true);
    } else {
      const newEndTime = Date.now() + remainingSeconds * 1000;
      setSessionEndTime(newEndTime);
      setIsPaused(false);
      focusProtectionService
        .startFocusProtection(
          newEndTime,
          installedApps.filter((a) => a.enabled).map((a) => a.packageName)
        )
        .catch(() => {});
    }
  };

  const handleAdd5Minutes = () => {
    if (!isActive) return;
    const addedSec = 5 * 60;
    const newRemaining = remainingSeconds + addedSec;
    const newEndTime = (sessionEndTime || Date.now()) + addedSec * 1000;
    setRemainingSeconds(newRemaining);
    setSessionEndTime(newEndTime);
    setSelectedMinutes((prev) => prev + 5);
    focusProtectionService
      .startFocusProtection(
        newEndTime,
        installedApps.filter((a) => a.enabled).map((a) => a.packageName)
      )
      .catch(() => {});
    if (Platform.OS !== 'web') {
      Vibration.vibrate(80);
    }
  };

  const handleToggleKiosk = async () => {
    if (!isActive) return;
    if (!isKioskPinned) {
      const started = await focusProtectionService.startLockTask();
      if (started) {
        setIsKioskPinned(true);
        Alert.alert(
          '📌 Screen Pinned (Kiosk Mode)',
          'ESpark is pinned to your screen. Navigation bar, notification pull-down, and power menus are strictly locked.\n\nTap the Pin icon again or finish the session to unpin.'
        );
      } else {
        Alert.alert(
          'Screen Pinning',
          'Lock task mode requested. Multi-layered accessibility protection and device administrator policies are actively defending against power-off and uninstallation.'
        );
      }
    } else {
      const stopped = await focusProtectionService.stopLockTask();
      if (stopped) {
        setIsKioskPinned(false);
        Alert.alert('Screen Unpinned', 'Kiosk mode turned off. Focus protection remains active.');
      }
    }
  };

  const handleEmergencyQuit = () => {
    setShowQuitConfirmModal(true);
  };

  const handleForceQuitConfirmed = async () => {
    setShowQuitConfirmModal(false);
    setIsActive(false);
    setIsPaused(false);
    deactivateKeepAwake('focus-clock').catch(() => {});
    await focusProtectionService.stopLockTask().catch(() => {});
    await focusProtectionService.stopFocusProtection().catch(() => {});
    await focusSessionService.clearActiveSession().catch(() => {});

    const elapsedSec = sessionStartTime ? Math.max(0, Math.round((Date.now() - sessionStartTime) / 1000)) : 0;
    if (elapsedSec >= 60) {
      studyService.recordFocusSession({
        durationSeconds: elapsedSec,
        durationMinutes: Math.max(1, Math.round(elapsedSec / 60)),
        subject: subjectTag,
        completed: false,
      }).catch(() => {});
    }

    Alert.alert('Session Terminated Early', 'Distraction penalty logged. Consistency builds rank — resume your next session strong!');
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isActive && isZenClockMode ? '#070A11' : colors.background },
      ]}
      edges={['top', 'bottom']}
    >
      <StatusBar
        barStyle={isActive && isZenClockMode || isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isActive && isZenClockMode ? '#070A11' : colors.background}
      />

      {/* ======================================================== */}
      {/* 1. ALWAYS-ON MINIMALIST ZEN CLOCK VIEW (ACTIVE MODE)     */}
      {/* ======================================================== */}
      {isActive && isZenClockMode ? (
        <LinearGradient
          colors={['#070A11', '#0B1222', '#070A11']}
          style={styles.zenGradientWrapper}
        >
          {/* Top Status & Security Bar */}
          <View style={styles.zenTopBar}>
            {/* Live Wall Clock */}
            <View style={styles.zenWallClockWrap}>
              <MaterialIcons name="schedule" size={15} color="#94A3B8" />
              <Text style={styles.zenWallClockText}>{formattedWallClock}</Text>
              <Text style={styles.zenWallDateText}>• {formattedWallDate}</Text>
            </View>

            {/* Clickable Security Badge */}
            <TouchableOpacity
              style={styles.zenGuardBadge}
              onPress={() => setShowPowerUninstallModal(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="shield" size={13} color="#10B981" />
              <Text style={styles.zenGuardBadgeText}>Strict Guard</Text>
            </TouchableOpacity>

            {/* Switch to standard view */}
            <TouchableOpacity
              style={styles.zenSwitchBtn}
              onPress={() => setIsZenClockMode(false)}
              accessibilityLabel="Switch to standard dashboard"
            >
              <MaterialIcons name="view-quilt" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Distraction Penalty Warning if any */}
          {distractionViolations > 0 && (
            <View style={styles.zenViolationBanner}>
              <MaterialIcons name="warning" size={14} color="#EF4444" />
              <Text style={styles.zenViolationText}>
                {distractionViolations} {distractionViolations === 1 ? 'penalty' : 'penalties'} logged! Keep ESpark in foreground.
              </Text>
            </View>
          )}

          {/* Center Minimalist Pomodoro Clock Ring */}
          <View style={styles.zenCenterRingContainer}>
            <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
                <Defs>
                  <SvgGradient id="zenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#818CF8" stopOpacity="1" />
                    <Stop offset="50%" stopColor="#6366F1" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#10B981" stopOpacity="1" />
                  </SvgGradient>
                </Defs>
                {/* Back Track */}
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  stroke="#1E293B"
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                />
                {/* Animated Progress Arc */}
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  stroke="url(#zenGrad)"
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${CIRCUMFERENCE}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                  rotation="-90"
                />
              </Svg>

              {/* Inside Clock Center Info */}
              <View style={styles.zenClockCenterContent}>
                <Animated.Text
                  style={[
                    styles.zenDigits,
                    { transform: [{ scale: isPaused ? 1 : pulseAnim }] },
                  ]}
                >
                  {timeDisplay}
                </Animated.Text>
                <View
                  style={[
                    styles.zenStatusChip,
                    { backgroundColor: isPaused ? '#78350F' : '#064E3B' },
                  ]}
                >
                  <View
                    style={[
                      styles.zenDot,
                      { backgroundColor: isPaused ? '#F59E0B' : '#10B981' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.zenStatusLabel,
                      { color: isPaused ? '#FCD34D' : '#6EE7B7' },
                    ]}
                  >
                    {isPaused ? 'PAUSED' : 'DEEP FOCUS'}
                  </Text>
                </View>
                <Text style={styles.zenSubjectTag} numberOfLines={1}>
                  ⚡ {subjectTag || 'Deep Study'}
                </Text>
                <Text style={styles.zenProgressSubtext}>
                  {Math.round(progressRatio * 100)}% Complete • {Math.max(0, Math.ceil(remainingSeconds / 60))}m left
                </Text>
              </View>
            </View>
          </View>

          {/* Ambient Soundscapes Selector (Flocus / Forest / Endel style) */}
          <View style={styles.zenSoundscapeSection}>
            <Text style={styles.zenSoundscapeHeader}>AMBIENT SOUNDSCAPE</Text>
            <View style={styles.zenSoundscapeRow}>
              {[
                { id: 'none', label: 'Silent', icon: 'volume-off' },
                { id: 'rain', label: 'Rain', icon: 'water-drop' },
                { id: 'whitenoise', label: 'White Noise', icon: 'graphic-eq' },
                { id: 'library', label: 'Library', icon: 'menu-book' },
              ].map((item) => {
                const isSel = soundscape === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.zenSoundChip, isSel && styles.zenSoundChipActive]}
                    onPress={() => setSoundscape(item.id as any)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={item.icon as any}
                      size={13}
                      color={isSel ? '#FFFFFF' : '#94A3B8'}
                    />
                    <Text style={[styles.zenSoundChipText, isSel && styles.zenSoundChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {soundscape !== 'none' && (
              <View style={styles.soundIndicatorRow}>
                <View style={[styles.soundWaveBar, { height: 8 }]} />
                <View style={[styles.soundWaveBar, { height: 14 }]} />
                <View style={[styles.soundWaveBar, { height: 6 }]} />
                <View style={[styles.soundWaveBar, { height: 12 }]} />
                <Text style={styles.soundIndicatorText}>
                  Atmospheric {soundscape} ambiance active
                </Text>
              </View>
            )}
          </View>

          {/* Motivational Ambient Affirmation */}
          <Text style={styles.zenQuoteText}>
            {MOTIVATIONAL_QUOTES[quoteIndex]}
          </Text>

          {/* Floating Action Dock */}
          <View style={styles.zenDock}>
            <TouchableOpacity
              style={[
                styles.dockActionBtn,
                isPaused ? styles.dockActionResume : styles.dockActionPause,
              ]}
              onPress={handleTogglePause}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={isPaused ? 'play-arrow' : 'pause'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.dockActionBtnText}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockSecondaryBtn}
              onPress={handleAdd5Minutes}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={17} color="#CBD5E1" />
              <Text style={styles.dockSecondaryBtnText}>+5m</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockSecondaryBtn}
              onPress={() => setShowControlledMenuModal(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="apps" size={17} color="#CBD5E1" />
              <Text style={styles.dockSecondaryBtnText}>
                Apps ({activeApprovedApps.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dockSecondaryBtn, isKioskPinned && styles.dockPinnedBtn]}
              onPress={handleToggleKiosk}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={isKioskPinned ? 'screen-lock-portrait' : 'lock-outline'}
                size={17}
                color={isKioskPinned ? '#10B981' : '#CBD5E1'}
              />
              <Text
                style={[
                  styles.dockSecondaryBtnText,
                  isKioskPinned && { color: '#10B981' },
                ]}
              >
                {isKioskPinned ? 'Pinned' : 'Pin'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockEmergencyBtn}
              onPress={handleEmergencyQuit}
              activeOpacity={0.8}
            >
              <MaterialIcons name="power-settings-new" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      ) : (
        /* ======================================================== */
        /* 2. STANDARD FOCUS DASHBOARD VIEW                         */
        /* ======================================================== */
        <>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            {!isActive ? (
              <TouchableOpacity
                style={[styles.backNavBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => router.back()}
                accessibilityLabel="Back to Dashboard"
              >
                <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.lockedBadge, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                  <MaterialIcons name="lock" size={14} color="#EF4444" />
                  <Text style={[styles.lockedBadgeText, { color: '#B91C1C' }]}>LOCKDOWN</Text>
                </View>
                <TouchableOpacity
                  style={[styles.zenPillButton, { backgroundColor: colors.primary }]}
                  onPress={() => setIsZenClockMode(true)}
                >
                  <MaterialIcons name="alarm" size={14} color="#FFFFFF" />
                  <Text style={styles.zenPillButtonText}>Zen Clock</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? '#10B981' : colors.primary }]} />
              <Text style={[styles.statusText, { color: colors.onSurfaceVariant }]}>
                {isActive ? 'FOCUS ACTIVE' : 'DISTRACTION FREE'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.protectionHeaderBtn, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => setShowProtectionModal(true)}
              accessibilityLabel="Focus Protection Settings"
            >
              <MaterialIcons name="security" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Distraction Penalty Warning */}
            {isActive && distractionViolations > 0 && (
              <View style={styles.violationBanner}>
                <MaterialIcons name="warning" size={18} color="#DC2626" />
                <Text style={styles.violationBannerText}>
                  {distractionViolations} {distractionViolations === 1 ? 'distraction penalty' : 'distraction penalties'} logged! Keep ESpark in foreground.
                </Text>
              </View>
            )}

            {/* Subject Goal Tag */}
            <View style={[styles.subjectContainer, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
              <MaterialIcons name="local-fire-department" size={18} color="#F59E0B" />
              <TextInput
                style={[styles.subjectInput, { color: colors.onSurface }]}
                value={subjectTag}
                onChangeText={setSubjectTag}
                editable={!isActive}
                placeholder="What are you mastering right now?"
                placeholderTextColor={colors.onSurfaceVariant}
                maxLength={40}
              />
            </View>

            {/* Countdown Timer Display */}
            <View style={styles.timerCenterArea}>
              <Animated.View
                style={[
                  styles.timerRing,
                  {
                    borderColor: isActive ? colors.primary : colors.outline,
                    transform: [{ scale: pulseAnim }],
                    backgroundColor: isDark ? '#131B2A' : '#F1F5F9',
                  },
                ]}
              >
                <Text style={[styles.timerDigits, { color: colors.onSurface }]}>{timeDisplay}</Text>
                <Text style={[styles.timerSubLabel, { color: colors.onSurfaceVariant }]}>
                  {isActive ? 'FOCUS ACTIVE' : 'TARGET TIME'}
                </Text>
                <View style={styles.progressBarWrapper}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(0, progressRatio * 100))}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
              </Animated.View>

              {isActive && (
                <TouchableOpacity
                  style={[styles.openZenClockBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline }]}
                  onPress={() => setIsZenClockMode(true)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="fullscreen" size={18} color={colors.primary} />
                  <Text style={[styles.openZenClockBtnText, { color: colors.primary }]}>
                    Open Always-On Minimalist Clock
                  </Text>
                </TouchableOpacity>
              )}

              {/* Motivational Ambient Quote */}
              <Text style={[styles.quoteText, { color: colors.onSurfaceVariant }]}>
                {MOTIVATIONAL_QUOTES[quoteIndex]}
              </Text>
            </View>

            {/* ======================================================== */}
            {/* PRE-SESSION SETUP (Only visible when not active) */}
            {/* ======================================================== */}
            {!isActive && (
              <View style={styles.preSessionContainer}>
                {/* Duration Presets */}
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Duration</Text>
                <View style={styles.presetRow}>
                  {PRESETS.map((p) => {
                    const isSelected = p.minutes === selectedMinutes && p.minutes !== 0;
                    return (
                      <TouchableOpacity
                        key={p.label}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.outline,
                          },
                        ]}
                        onPress={() => selectPreset(p.minutes)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.presetLabel,
                            { color: isSelected ? '#FFFFFF' : colors.onSurface },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Allowed Apps Preview & Config Button */}
                <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                  <View style={styles.cardHeaderRow}>
                    <View>
                      <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Selected Allowed Apps</Text>
                      <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
                        {activeApprovedApps.length} permitted Android applications
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.configureBtn, { backgroundColor: colors.surfaceVariant }]}
                      onPress={() => setShowAllowedConfigModal(true)}
                    >
                      <MaterialIcons name="tune" size={16} color={colors.primary} />
                      <Text style={[styles.configureBtnText, { color: colors.primary }]}>Configure</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.allowedChipsWrap}>
                    {activeApprovedApps.map((app) => (
                      <View key={app.packageName} style={[styles.allowedChip, { backgroundColor: colors.background }]}>
                        {app.icon ? (
                          <Image source={{ uri: app.icon }} style={styles.chipAppIcon} resizeMode="contain" />
                        ) : (
                          <MaterialIcons name="check" size={14} color="#10B981" />
                        )}
                        <Text style={[styles.allowedChipText, { color: colors.onSurface }]} numberOfLines={1}>
                          {app.name}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Blocked Distracting Apps Info */}
                  <View style={styles.blockedSection}>
                    <Text style={[styles.blockedTitle, { color: colors.onSurfaceVariant }]}>
                      Blocked / distracting apps:
                    </Text>
                    <Text style={[styles.blockedListText, { color: colors.onSurfaceVariant }]}>
                      Instagram • YouTube • Chrome • WhatsApp • Games & more
                    </Text>
                  </View>
                </View>

                {/* Focus Protection & Anti-Tamper Card */}
                <TouchableOpacity
                  style={[styles.protectionCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
                  onPress={() => setShowProtectionModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.protectionIconWrapper}>
                    <MaterialIcons name="security" size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.protectionCardTitle, { color: colors.onSurface }]}>
                      Focus Protection & Tamper Defense
                    </Text>
                    <View style={{ marginTop: 2, gap: 2 }}>
                      <Text style={[styles.protectionCardRow, { color: '#10B981' }]}>
                        ✓ Power-off & Uninstall Guard: Ready
                      </Text>
                      <Text style={[styles.protectionCardRow, { color: '#10B981' }]}>
                        ✓ Always-On Minimalist Clock: Enabled
                      </Text>
                      <Text style={[styles.protectionCardRow, { color: colors.onSurfaceVariant }]}>
                        {protectionStatus?.isExpoGo
                          ? '⚠ In Expo Go (Build for strict native lock)'
                          : protectionStatus?.hasAccessibilityPermission
                          ? '✓ Accessibility Protection: Active'
                          : '⚠ Tap to verify Accessibility access'}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
                </TouchableOpacity>

                {/* START FOCUS BUTTON */}
                <TouchableOpacity
                  style={[styles.startFocusButton, { backgroundColor: colors.primary }]}
                  onPress={handleStartFocus}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="play-arrow" size={28} color="#FFFFFF" />
                  <Text style={styles.startFocusButtonText}>START FOCUS ({selectedMinutes}m)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ======================================================== */}
            {/* ACTIVE FOCUS CONTROLS (Standard Mode)                     */}
            {/* ======================================================== */}
            {isActive && (
              <View style={styles.activeControlsContainer}>
                {/* Controlled Allowed Apps Menu Button */}
                <TouchableOpacity
                  style={[styles.controlledMenuButton, { backgroundColor: colors.surface, borderColor: colors.outline }]}
                  onPress={() => setShowControlledMenuModal(true)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="apps" size={22} color={colors.primary} />
                  <Text style={[styles.controlledMenuButtonText, { color: colors.onSurface }]}>
                    Allowed Apps ({activeApprovedApps.length})
                  </Text>
                  <MaterialIcons name="keyboard-arrow-up" size={22} color={colors.onSurfaceVariant} />
                </TouchableOpacity>

                {/* Action Buttons Row: Pause/Resume, +5m, Pin */}
                <View style={styles.standardActionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.stdActionBtn, isPaused ? styles.stdActionResume : styles.stdActionPause]}
                    onPress={handleTogglePause}
                  >
                    <MaterialIcons name={isPaused ? 'play-arrow' : 'pause'} size={18} color="#FFFFFF" />
                    <Text style={styles.stdActionBtnText}>{isPaused ? 'Resume' : 'Pause'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.stdActionBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline, borderWidth: 1 }]}
                    onPress={handleAdd5Minutes}
                  >
                    <MaterialIcons name="add" size={18} color={colors.onSurface} />
                    <Text style={[styles.stdActionBtnText, { color: colors.onSurface }]}>+5m</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.stdActionBtn, isKioskPinned ? styles.stdActionPinned : { backgroundColor: colors.surfaceVariant, borderColor: colors.outline, borderWidth: 1 }]}
                    onPress={handleToggleKiosk}
                  >
                    <MaterialIcons
                      name={isKioskPinned ? 'screen-lock-portrait' : 'lock-outline'}
                      size={18}
                      color={isKioskPinned ? '#FFFFFF' : colors.onSurface}
                    />
                    <Text style={[styles.stdActionBtnText, { color: isKioskPinned ? '#FFFFFF' : colors.onSurface }]}>
                      {isKioskPinned ? 'Pinned' : 'Pin'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Anti-Tamper & Security Pill Button */}
                <TouchableOpacity
                  style={[styles.strictLockdownPill, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
                  onPress={() => setShowPowerUninstallModal(true)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="shield" size={18} color="#10B981" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.strictLockdownPillTitle, { color: colors.onSurface }]}>
                      Power-Off & Uninstall Guard Active
                    </Text>
                    <Text style={[styles.strictLockdownPillText, { color: colors.onSurfaceVariant }]}>
                      Interception active. Tap to view defense protocols.
                    </Text>
                  </View>
                  <MaterialIcons name="info-outline" size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>

                {/* Emergency Quit Button */}
                <TouchableOpacity
                  style={styles.emergencyQuitLink}
                  onPress={handleEmergencyQuit}
                  activeOpacity={0.6}
                >
                  <MaterialIcons name="exit-to-app" size={16} color="#DC2626" />
                  <Text style={styles.emergencyQuitLinkText}>Emergency Exit (Penalty Applies)</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: PRE-SESSION ALLOWED APPS CONFIGURATION */}
      {/* Lists REAL applications discovered via PackageManager */}
      {/* ======================================================== */}
      <Modal visible={showAllowedConfigModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="shield" size={24} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Allowed Applications</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAllowedConfigModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
              Select real installed applications you want to permit during Focus Mode. All other apps will be blocked.
            </Text>

            {/* App Search Bar */}
            <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.outline }]}>
              <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} />
              <TextInput
                style={[styles.searchInput, { color: colors.onSurface }]}
                value={appSearchQuery}
                onChangeText={setAppSearchQuery}
                placeholder="Search installed applications..."
                placeholderTextColor={colors.onSurfaceVariant}
              />
            </View>

            <ScrollView style={{ maxHeight: 320, marginVertical: 8 }}>
              {filteredApps.map((item) => (
                <TouchableOpacity
                  key={item.packageName}
                  style={[
                    styles.allowAppRow,
                    {
                      backgroundColor: colors.background,
                      borderColor: item.enabled ? colors.primary : colors.outline,
                    },
                  ]}
                  onPress={() => toggleAllowedApp(item.packageName)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    {item.icon ? (
                      <Image source={{ uri: item.icon }} style={styles.appIconThumbnail} resizeMode="contain" />
                    ) : (
                      <MaterialIcons
                        name="android"
                        size={24}
                        color={item.enabled ? colors.primary : colors.onSurfaceVariant}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.allowAppName,
                          { color: item.enabled ? colors.onSurface : colors.onSurfaceVariant },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text style={[styles.appPackageName, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                        {item.packageName}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons
                    name={item.enabled ? 'check-circle' : 'radio-button-unchecked'}
                    size={22}
                    color={item.enabled ? colors.primary : colors.outline}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
              onPress={() => setShowAllowedConfigModal(false)}
            >
              <Text style={styles.modalActionBtnText}>
                Save Allowed Apps ({activeApprovedApps.length} Selected)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: IN-SESSION CONTROLLED ALLOWED APPS MENU */}
      {/* (Shows ONLY pre-approved REAL apps; launches real app; editing locked) */}
      {/* ======================================================== */}
      <Modal visible={showControlledMenuModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="verified-user" size={24} color="#10B981" />
                <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Allowed Apps</Text>
              </View>
              <TouchableOpacity onPress={() => setShowControlledMenuModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
              Approved applications for this session. Tapping launches the real Android app.
            </Text>

            <View style={styles.lockedNoticePill}>
              <MaterialIcons name="lock" size={14} color={colors.primary} />
              <Text style={[styles.lockedNoticeText, { color: colors.primary }]}>
                Allowed app list cannot be modified during active focus.
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 280, marginVertical: 10 }}>
              {activeApprovedApps.length === 0 ? (
                <Text style={[styles.emptyNotice, { color: colors.onSurfaceVariant }]}>
                  No external applications were permitted for this session. Complete lockdown active.
                </Text>
              ) : (
                activeApprovedApps.map((item) => (
                  <View
                    key={item.packageName}
                    style={[styles.controlledAppRow, { backgroundColor: colors.background, borderColor: colors.outline }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      {item.icon ? (
                        <Image source={{ uri: item.icon }} style={styles.appIconThumbnail} resizeMode="contain" />
                      ) : (
                        <MaterialIcons name="apps" size={24} color={colors.primary} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.controlledAppName, { color: colors.onSurface }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.appPackageName, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                          {item.packageName}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.launchBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleLaunchApp(item)}
                    >
                      <Text style={[styles.launchBtnText, { color: '#FFFFFF' }]}>Open</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline, borderWidth: 1 }]}
              onPress={() => setShowControlledMenuModal(false)}
            >
              <Text style={[styles.modalActionBtnText, { color: colors.onSurface }]}>Return to Timer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: FOCUS PROTECTION & ACCESSIBILITY SETTINGS */}
      {/* ======================================================== */}
      <Modal visible={showProtectionModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="security" size={24} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Focus Protection</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProtectionModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
              Focus Protection uses Android Accessibility access to detect when a distracting app is opened during an active Focus Session.
            </Text>

            {/* Environment Specific Guidance */}
            {protectionStatus?.isExpoGo ? (
              <View style={[styles.expoGoNoticeBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                <MaterialIcons name="info" size={20} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.expoGoNoticeTitle, { color: '#B45309' }]}>
                    Full Focus Protection is unavailable in Expo Go
                  </Text>
                  <Text style={[styles.expoGoNoticeBody, { color: '#92400E' }]}>
                    Expo Go cannot install ESpark's native AccessibilityService. To enable system-level app blocking, build the ESpark Android development build using:
                  </Text>
                  <Text style={styles.codeSnippet}>npx expo run:android</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.protectionStatusBox, { backgroundColor: colors.background, borderColor: colors.outline }]}>
                <View style={styles.statusRowItem}>
                  <MaterialIcons
                    name={protectionStatus?.hasAccessibilityPermission ? 'check-circle' : 'warning'}
                    size={20}
                    color={protectionStatus?.hasAccessibilityPermission ? '#10B981' : '#DC2626'}
                  />
                  <Text style={[styles.statusRowLabel, { color: colors.onSurface }]}>Status:</Text>
                  <Text
                    style={{
                      color: protectionStatus?.hasAccessibilityPermission ? '#10B981' : '#DC2626',
                      fontWeight: '800',
                    }}
                  >
                    {protectionStatus?.hasAccessibilityPermission
                      ? '✓ Focus Protection Enabled'
                      : '⚠ Focus Protection Disabled'}
                  </Text>
                </View>
              </View>
            )}

            {!protectionStatus?.isExpoGo && (
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                onPress={async () => {
                  await focusProtectionService.openAccessibilitySettings();
                  setShowProtectionModal(false);
                }}
              >
                <Text style={styles.modalActionBtnText}>
                  {protectionStatus?.hasAccessibilityPermission
                    ? 'Manage in Android Settings'
                    : 'Enable Focus Protection in Settings'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline, borderWidth: 1, marginTop: 8 }]}
              onPress={() => setShowProtectionModal(false)}
            >
              <Text style={[styles.modalActionBtnText, { color: colors.onSurface }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: INTERRUPTED SESSION RESUMPTION */}
      {/* ======================================================== */}
      <Modal visible={showInterruptedModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="history" size={48} color={colors.primary} style={{ alignSelf: 'center' }} />
            <Text style={[styles.modalTitle, { color: colors.onSurface, textAlign: 'center', marginTop: 10 }]}>
              Resume Focus Session?
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 6 }]}>
              You had an active Focus Session for{' '}
              <Text style={{ fontWeight: '700', color: colors.primary }}>
                {interruptedSession?.subjectTag || 'Deep Study'}
              </Text>.
            </Text>

            {interruptedSession && (
              <View style={[styles.resumeInfoBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.resumeInfoText, { color: colors.onSurface }]}>
                  Remaining time: ~{Math.max(1, Math.round(focusSessionService.computeRemainingSeconds(interruptedSession.endTime) / 60))} minutes
                </Text>
              </View>
            )}

            <View style={{ marginTop: 16, gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleResumeInterrupted}
              >
                <Text style={styles.modalActionBtnText}>Resume Focus</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline, borderWidth: 1 }]}
                onPress={handleDiscardInterrupted}
              >
                <Text style={[styles.modalActionBtnText, { color: colors.onSurface }]}>Discard Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 5: CUSTOM DURATION */}
      {/* ======================================================== */}
      <Modal visible={showCustomModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Custom Focus Duration</Text>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
              Enter time in minutes (1 to 300).
            </Text>

            <TextInput
              style={[styles.customTextInput, { backgroundColor: colors.background, color: colors.onSurface, borderColor: colors.outline }]}
              value={customInput}
              onChangeText={setCustomInput}
              keyboardType="number-pad"
              placeholder="e.g. 45"
              placeholderTextColor={colors.onSurfaceVariant}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtnHalf, { borderColor: colors.outline, borderWidth: 1 }]}
                onPress={() => setShowCustomModal(false)}
              >
                <Text style={{ color: colors.onSurface }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnHalf, { backgroundColor: colors.primary }]}
                onPress={applyCustomDuration}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Set Timer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 6: SESSION COMPLETED CELEBRATION */}
      {/* (Only normal exit path) */}
      {/* ======================================================== */}
      <Modal visible={isCompleted} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="workspace-premium" size={60} color="#F59E0B" style={{ alignSelf: 'center' }} />
            <Text style={[styles.completionTitle, { color: colors.onSurface }]}>Focus Complete</Text>
            <Text style={[styles.completionPraise, { color: colors.primary }]}>Excellent work!</Text>

            <View style={[styles.completionStatsBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.completionStatLabel, { color: colors.onSurfaceVariant }]}>Focused for:</Text>
              <Text style={[styles.completionStatValue, { color: colors.onSurface }]}>
                {selectedMinutes} minutes
              </Text>
              <Text style={[styles.completionStatSubject, { color: colors.onSurfaceVariant }]}>
                Subject: {subjectTag}
              </Text>
            </View>

            <View style={{ marginTop: 20, gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setIsCompleted(false);
                  setRemainingSeconds(selectedMinutes * 60);
                }}
              >
                <Text style={styles.modalActionBtnText}>Start Another Session</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline, borderWidth: 1 }]}
                onPress={() => {
                  setIsCompleted(false);
                  router.back();
                }}
              >
                <Text style={[styles.modalActionBtnText, { color: colors.onSurface }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 7: ANTI-POWER-OFF & UNINSTALL PROTECTION EXPLAINER */}
      {/* ======================================================== */}
      <Modal visible={showPowerUninstallModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="security" size={24} color="#10B981" />
                <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                  Anti-Tamper Protection
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPowerUninstallModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
              ESpark activates multi-layered Android OS guards during active focus sessions to eliminate loopholes:
            </Text>

            <View style={{ marginTop: 14, gap: 12 }}>
              {/* Feature 1: Power Off Interception */}
              <View style={[styles.guardFeatureCard, { backgroundColor: colors.background, borderColor: colors.outline }]}>
                <View style={[styles.guardIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialIcons name="power-settings-new" size={20} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.guardFeatureTitle, { color: colors.onSurface }]}>
                    Power-Off & Restart Interception
                  </Text>
                  <Text style={[styles.guardFeatureDesc, { color: colors.onSurfaceVariant }]}>
                    Android Accessibility Service detects shutdown and restart confirmation dialogs, closes them immediately via system intents, and restores ESpark to foreground.
                  </Text>
                </View>
              </View>

              {/* Feature 2: Anti-Uninstall via Device Administrator */}
              <View style={[styles.guardFeatureCard, { backgroundColor: colors.background, borderColor: colors.outline }]}>
                <View style={[styles.guardIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialIcons name="delete-forever" size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.guardFeatureTitle, { color: colors.onSurface }]}>
                    App Uninstall & Force-Stop Blocker
                  </Text>
                  <Text style={[styles.guardFeatureDesc, { color: colors.onSurfaceVariant }]}>
                    When registered as a Device Administrator, Android disables the "Uninstall" button in Settings and prevents uninstallation attempts during active study.
                  </Text>
                </View>
              </View>

              {/* Feature 3: Screen Pinning (Kiosk Mode) */}
              <View style={[styles.guardFeatureCard, { backgroundColor: colors.background, borderColor: colors.outline }]}>
                <View style={[styles.guardIconWrap, { backgroundColor: '#F0FDF4' }]}>
                  <MaterialIcons name="screen-lock-portrait" size={20} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.guardFeatureTitle, { color: colors.onSurface }]}>
                    Screen Pinning (Lock Task)
                  </Text>
                  <Text style={[styles.guardFeatureDesc, { color: colors.onSurfaceVariant }]}>
                    Locks the phone screen strictly onto ESpark, disabling notification pull-down, app switching, and home navigation until the timer completes.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={() => setShowPowerUninstallModal(false)}
            >
              <Text style={styles.modalActionBtnText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 8: QUIT CONFIRMATION WARNING                       */}
      {/* ======================================================== */}
      <Modal visible={showQuitConfirmModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="warning" size={44} color="#DC2626" style={{ alignSelf: 'center' }} />
            <Text style={[styles.modalTitle, { color: colors.onSurface, textAlign: 'center', marginTop: 10 }]}>
              Quit Focus Session Early?
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 6 }]}>
              Ending your session early will forfeit bonus focus points, log a distraction mark, and reset your active streak.
            </Text>

            <View style={[styles.penaltyWarningBox, { backgroundColor: '#FEF2F2', borderColor: '#F87171' }]}>
              <Text style={{ color: '#991B1B', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                ⚠ Consistency builds top ranks. Give it 5 more minutes!
              </Text>
            </View>

            <View style={{ marginTop: 16, gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowQuitConfirmModal(false)}
              >
                <Text style={styles.modalActionBtnText}>Keep Studying (Recommended)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: 'transparent', borderColor: '#DC2626', borderWidth: 1 }]}
                onPress={handleForceQuitConfirmed}
              >
                <Text style={[styles.modalActionBtnText, { color: '#DC2626' }]}>Forfeit & Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  protectionHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  violationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    marginVertical: 6,
  },
  violationBannerText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  subjectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 10,
  },
  subjectInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  timerCenterArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  timerRing: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  timerDigits: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timerSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  progressBarWrapper: {
    width: '60%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  lockdownNotice: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  preSessionContainer: {
    marginTop: 10,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: -6,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardContainer: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  configureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  configureBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  allowedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  allowedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: 160,
  },
  chipAppIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  allowedChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  blockedSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  blockedTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  blockedListText: {
    fontSize: 12,
    marginTop: 2,
  },
  protectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  protectionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  protectionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  protectionCardRow: {
    fontSize: 11,
    fontWeight: '600',
  },
  startFocusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  startFocusButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeControlsContainer: {
    marginTop: 20,
    gap: 14,
  },
  controlledMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  controlledMenuButtonText: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginLeft: 10,
  },
  strictLockdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  strictLockdownPillText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  allowAppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  allowAppName: {
    fontSize: 14,
    fontWeight: '700',
  },
  appPackageName: {
    fontSize: 11,
    marginTop: 1,
  },
  appIconThumbnail: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  modalActionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  lockedNoticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    marginVertical: 10,
  },
  lockedNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  emptyNotice: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 20,
  },
  controlledAppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  controlledAppName: {
    fontSize: 14,
    fontWeight: '700',
  },
  launchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  launchBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  expoGoNoticeBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
  },
  expoGoNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  expoGoNoticeBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  codeSnippet: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#B45309',
    marginTop: 6,
    fontSize: 12,
  },
  protectionStatusBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
    gap: 8,
  },
  statusRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusRowLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  resumeInfoBox: {
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
    alignItems: 'center',
  },
  resumeInfoText: {
    fontSize: 14,
    fontWeight: '700',
  },
  customTextInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
    marginVertical: 14,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtnHalf: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  completionPraise: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  completionStatsBox: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  completionStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  completionStatValue: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  completionStatSubject: {
    fontSize: 12,
    marginTop: 4,
  },
  // Zen Minimalist Clock Styles (Flocus / Pomofocus / Forest / Endel aesthetics)
  zenGradientWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  zenTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 6 : 0,
  },
  zenWallClockWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  zenWallClockText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 0.5,
  },
  zenWallDateText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  zenGuardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  zenGuardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 0.3,
  },
  zenSwitchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zenViolationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 4,
  },
  zenViolationText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  zenCenterRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  zenClockCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
  },
  zenDigits: {
    fontSize: 54,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  zenStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  zenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  zenStatusLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  zenSubjectTag: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginTop: 8,
    maxWidth: 200,
    textAlign: 'center',
  },
  zenProgressSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 4,
  },
  zenSoundscapeSection: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  zenSoundscapeHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#64748B',
  },
  zenSoundscapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  zenSoundChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  zenSoundChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#6366F1',
  },
  zenSoundChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  zenSoundChipTextActive: {
    color: '#FFFFFF',
  },
  soundIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  soundWaveBar: {
    width: 3,
    backgroundColor: '#818CF8',
    borderRadius: 1.5,
  },
  soundIndicatorText: {
    fontSize: 11,
    color: '#818CF8',
    fontWeight: '600',
    marginLeft: 4,
  },
  zenQuoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
    marginVertical: 4,
  },
  zenDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 8,
    gap: 8,
  },
  dockActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  dockActionPause: {
    backgroundColor: '#374151',
  },
  dockActionResume: {
    backgroundColor: '#059669',
  },
  dockActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dockSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
  },
  dockSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  dockPinnedBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  dockEmergencyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zenPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  zenPillButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  openZenClockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  openZenClockBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  standardActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stdActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  stdActionPause: {
    backgroundColor: '#4B5563',
  },
  stdActionResume: {
    backgroundColor: '#059669',
  },
  stdActionPinned: {
    backgroundColor: '#10B981',
  },
  stdActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  strictLockdownPillTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  emergencyQuitLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  emergencyQuitLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  guardFeatureCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  guardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardFeatureTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  guardFeatureDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  penaltyWarningBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 12,
  },
});
