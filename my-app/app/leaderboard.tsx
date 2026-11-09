import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { studyService } from '../services/studyService';

type Period = 'today' | 'weekly' | 'monthly';

export default function LeaderboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [period, setPeriod] = useState<Period>('today');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);

  const fetchLeaderboard = async (selectedPeriod: Period) => {
    try {
      const res = await studyService.getLeaderboard(selectedPeriod);
      setLeaderboardData(res.data);
    } catch (err) {
      console.log('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLeaderboard(period);
    }, [period])
  );

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard(period);
  }, [period]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard(period);
  };

  const leaders = leaderboardData?.leaderboard || [];
  const top1 = leaders.length > 0 ? leaders[0] : null;
  const top2 = leaders.length > 1 ? leaders[1] : null;
  const top3 = leaders.length > 2 ? leaders[2] : null;
  // Depict all other students under top 10 (ranks 4 through 10)
  const top4to10 = leaders.slice(3, 10);

  const currentUser = leaderboardData?.currentUser || {
    rank: leaders.length > 0 ? leaders.length : 1,
    name: 'You',
    points: 0,
    studyHours: 0,
    focusHours: '0.0h',
    streak: 0,
    isCurrentUser: true,
  };

  const isUserInTop10 = currentUser.rank != null && currentUser.rank <= 10;

  const periodSubtitle =
    period === 'today'
      ? 'Daily Live Standings • Updated Real-time'
      : period === 'weekly'
      ? '7-Day Sprint Standings • Consistency Masters'
      : '30-Day Cumulative Standings • Top Performers';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Navigation */}
      <View style={[styles.headerRow, { borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Leaderboard</Text>
          <Text style={[styles.headerSub, { color: colors.onSurfaceVariant }]}>{periodSubtitle}</Text>
        </View>
        <View style={styles.streakBadge}>
          <MaterialIcons name="local-fire-department" size={18} color="#F59E0B" />
          <Text style={styles.streakText}>{currentUser.streak || 0}d streak</Text>
        </View>
      </View>

      {/* Period Tabs: Today, This Week, This Month */}
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceVariant }]}>
        {(['today', 'weekly', 'monthly'] as Period[]).map((tab) => {
          const isActive = period === tab;
          const label = tab === 'today' ? 'Today' : tab === 'weekly' ? 'This Week' : 'This Month';
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabItem,
                isActive && { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
              ]}
              onPress={() => setPeriod(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? colors.primary : colors.onSurfaceVariant, fontWeight: isActive ? '700' : '500' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>Loading standings...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          {/* Current User Standing Banner */}
          <View style={[styles.myRankCard, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: colors.primary }]}>
            <View style={styles.myRankLeft}>
              <View style={[styles.myRankBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.myRankNum}>#{currentUser.rank}</Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.myName, { color: colors.onSurface }]}>Your Standing</Text>
                  <View style={[styles.youBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                </View>
                <Text style={[styles.myExam, { color: colors.onSurfaceVariant }]}>
                  {currentUser.rank <= 10 ? '🎉 Inside Top 10 Scholars!' : 'Climbing up • Keep studying!'}
                </Text>
              </View>
            </View>
            <View style={styles.myStatsRow}>
              <View style={styles.myStatCol}>
                <Text style={[styles.myStatVal, { color: colors.primary }]}>{currentUser.points}</Text>
                <Text style={[styles.myStatLabel, { color: colors.onSurfaceVariant }]}>Points</Text>
              </View>
              <View style={styles.myStatCol}>
                <Text style={[styles.myStatVal, { color: '#F59E0B' }]}>
                  {currentUser.studyHours ? `${currentUser.studyHours}h` : (currentUser.focusHours || '0.0h')}
                </Text>
                <Text style={[styles.myStatLabel, { color: colors.onSurfaceVariant }]}>Study Hours</Text>
              </View>
            </View>
          </View>

          {/* Podium for Top 3 Scholars */}
          <View style={styles.podiumContainer}>
            {/* Rank 2 (Silver) */}
            {top2 && (
              <View style={styles.podiumCol}>
                {top2.isCurrentUser && (
                  <View style={[styles.youBadge, { backgroundColor: '#94A3B8', marginBottom: 2 }]}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                )}
                <View style={styles.podiumAvatarWrap}>
                  <View style={[styles.avatarCircle, { borderColor: '#94A3B8' }]}>
                    <Text style={styles.avatarInitials}>{top2.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={[styles.rankMedal, { backgroundColor: '#94A3B8' }]}>
                    <Text style={styles.medalText}>2</Text>
                  </View>
                </View>
                <Text style={[styles.podiumName, { color: colors.onSurface }]} numberOfLines={1}>
                  {top2.name}
                </Text>
                {/* Points AND Study Hours */}
                <Text style={[styles.podiumScore, { color: colors.onSurfaceVariant }]}>{top2.points} pts</Text>
                <Text style={[styles.podiumHours, { color: '#64748B' }]}>
                  ⏱️ {top2.studyHours ? `${top2.studyHours}h` : (top2.focusHours || '0h')}
                </Text>
                <View style={[styles.podiumPillar, { height: 75, backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
              </View>
            )}

            {/* Rank 1 (Gold) */}
            {top1 && (
              <View style={styles.podiumCol}>
                <MaterialIcons name="military-tech" size={26} color="#F59E0B" style={{ marginBottom: -2 }} />
                {top1.isCurrentUser && (
                  <View style={[styles.youBadge, { backgroundColor: '#F59E0B', marginBottom: 2 }]}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                )}
                <View style={styles.podiumAvatarWrap}>
                  <View style={[styles.avatarCircle, { borderColor: '#F59E0B', width: 62, height: 62, borderRadius: 31 }]}>
                    <Text style={[styles.avatarInitials, { fontSize: 18 }]}>{top1.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={[styles.rankMedal, { backgroundColor: '#F59E0B', width: 22, height: 22, borderRadius: 11 }]}>
                    <Text style={styles.medalText}>1</Text>
                  </View>
                </View>
                <Text style={[styles.podiumName, { color: colors.onSurface, fontWeight: 'bold' }]} numberOfLines={1}>
                  {top1.name}
                </Text>
                {/* Points AND Study Hours */}
                <Text style={[styles.podiumScore, { color: '#F59E0B', fontWeight: '700' }]}>{top1.points} pts</Text>
                <Text style={[styles.podiumHours, { color: '#D97706', fontWeight: '600' }]}>
                  ⏱️ {top1.studyHours ? `${top1.studyHours}h` : (top1.focusHours || '0h')}
                </Text>
                <View style={[styles.podiumPillar, { height: 105, backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]} />
              </View>
            )}

            {/* Rank 3 (Bronze) */}
            {top3 && (
              <View style={styles.podiumCol}>
                {top3.isCurrentUser && (
                  <View style={[styles.youBadge, { backgroundColor: '#D97706', marginBottom: 2 }]}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                )}
                <View style={styles.podiumAvatarWrap}>
                  <View style={[styles.avatarCircle, { borderColor: '#D97706' }]}>
                    <Text style={styles.avatarInitials}>{top3.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={[styles.rankMedal, { backgroundColor: '#D97706' }]}>
                    <Text style={styles.medalText}>3</Text>
                  </View>
                </View>
                <Text style={[styles.podiumName, { color: colors.onSurface }]} numberOfLines={1}>
                  {top3.name}
                </Text>
                {/* Points AND Study Hours */}
                <Text style={[styles.podiumScore, { color: colors.onSurfaceVariant }]}>{top3.points} pts</Text>
                <Text style={[styles.podiumHours, { color: '#B45309' }]}>
                  ⏱️ {top3.studyHours ? `${top3.studyHours}h` : (top3.focusHours || '0h')}
                </Text>
                <View style={[styles.podiumPillar, { height: 55, backgroundColor: isDark ? '#292524' : '#F5EBE6' }]} />
              </View>
            )}
          </View>

          {/* Top 10 Scholars List (Ranks 4 to 10) */}
          <View style={styles.listSection}>
            <View style={styles.listHeaderRow}>
              <Text style={[styles.listHeader, { color: colors.onSurfaceVariant }]}>TOP 10 SCHOLARS • RANKS 4 TO 10</Text>
              <Text style={[styles.listHeaderSub, { color: colors.onSurfaceVariant }]}>Points & Study Hours</Text>
            </View>

            {top4to10.map((user: any, idx: number) => {
              const rank = user.rank || idx + 4;
              const isMe = user.isCurrentUser || user.id === currentUser.id;
              const displayHours = user.studyHours != null ? `${user.studyHours}h` : (user.focusHours || '0.0h');

              return (
                <View
                  key={user.id || rank}
                  style={[
                    styles.userRow,
                    {
                      backgroundColor: isMe ? (isDark ? '#1E293B' : '#EFF6FF') : colors.surface,
                      borderColor: isMe ? colors.primary : colors.outlineVariant,
                      borderWidth: isMe ? 1.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.userRankText, { color: isMe ? colors.primary : colors.onSurfaceVariant }]}>
                    #{rank}
                  </Text>
                  <View style={[styles.avatarSmall, { backgroundColor: isMe ? colors.primary : colors.surfaceVariant }]}>
                    <Text style={[styles.avatarSmallText, { color: isMe ? '#FFFFFF' : colors.onSurface }]}>
                      {user.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.userName, { color: colors.onSurface, fontWeight: isMe ? 'bold' : '600' }]}>
                        {user.name}
                      </Text>
                      {isMe && (
                        <View style={[styles.youBadgeSmall, { backgroundColor: colors.primary }]}>
                          <Text style={styles.youBadgeText}>YOU</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.userExamTag, { color: colors.onSurfaceVariant }]}>
                      {user.exam || 'JEE / NEET'} • {user.streak ? `${user.streak}d streak 🔥` : 'Active Scholar'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.userPoints, { color: colors.primary }]}>{user.points} pts</Text>
                    <Text style={[styles.userHours, { color: '#F59E0B' }]}>
                      ⏱️ {displayHours}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* User Outside Top 10: Show divider and user rank card */}
          {!isUserInTop10 && (
            <View style={styles.outsideTop10Section}>
              <View style={styles.outsideDividerWrap}>
                <View style={[styles.outsideDividerLine, { backgroundColor: colors.outlineVariant }]} />
                <View style={[styles.outsideDividerBadge, { backgroundColor: colors.surfaceVariant }]}>
                  <MaterialIcons name="person-pin" size={14} color={colors.primary} />
                  <Text style={[styles.outsideDividerText, { color: colors.onSurfaceVariant }]}>YOUR RANKING</Text>
                </View>
                <View style={[styles.outsideDividerLine, { backgroundColor: colors.outlineVariant }]} />
              </View>

              <View
                style={[
                  styles.userRow,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
                    borderColor: colors.primary,
                    borderWidth: 2,
                    marginTop: 8,
                  },
                ]}
              >
                <Text style={[styles.userRankText, { color: colors.primary, fontWeight: '800' }]}>
                  #{currentUser.rank}
                </Text>
                <View style={[styles.avatarSmall, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarSmallText, { color: '#FFFFFF' }]}>
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.userName, { color: colors.onSurface, fontWeight: 'bold' }]}>
                      {currentUser.name}
                    </Text>
                    <View style={[styles.youBadgeSmall, { backgroundColor: colors.primary }]}>
                      <Text style={styles.youBadgeText}>YOU</Text>
                    </View>
                  </View>
                  <Text style={[styles.userExamTag, { color: colors.onSurfaceVariant }]}>
                    {currentUser.exam || 'NEET'} • {currentUser.streak ? `${currentUser.streak}d streak 🔥` : 'Active Scholar'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.userPoints, { color: colors.primary }]}>{currentUser.points} pts</Text>
                  <Text style={[styles.userHours, { color: '#F59E0B' }]}>
                    ⏱️ {currentUser.studyHours ? `${currentUser.studyHours}h` : (currentUser.focusHours || '0.0h')}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 11,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 4,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  myRankCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  myRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myRankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myRankNum: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  myName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  myExam: {
    fontSize: 11,
  },
  myStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  myStatCol: {
    alignItems: 'center',
  },
  myStatVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  myStatLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  podiumCol: {
    alignItems: 'center',
    width: 95,
  },
  podiumAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  avatarInitials: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  rankMedal: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  podiumName: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
  },
  podiumScore: {
    fontSize: 11,
    marginBottom: 6,
  },
  podiumPillar: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  listSection: {
    marginTop: 8,
  },
  listHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  userRankText: {
    width: 32,
    fontSize: 13,
    fontWeight: '700',
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: {
    fontSize: 13,
    fontWeight: '700',
  },
  userName: {
    fontSize: 14,
  },
  userExamTag: {
    fontSize: 11,
    marginTop: 1,
  },
  userPoints: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  userHours: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  userAccuracy: {
    fontSize: 11,
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeSmall: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  youBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  podiumHours: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listHeaderSub: {
    fontSize: 10,
    fontWeight: '600',
  },
  outsideTop10Section: {
    marginTop: 12,
  },
  outsideDividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  outsideDividerLine: {
    flex: 1,
    height: 1,
  },
  outsideDividerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  outsideDividerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
