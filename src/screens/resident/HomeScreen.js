/**
 * Resident Home — quick-action dashboard.
 *
 * Layout:
 *   1. Header (brand + greeting + notifications + avatar/logout)
 *   2. Greeting hero with date
 *   3. Quick Actions row — Pre-Approve, Payments, Helpdesk
 *   4. Today's Updates — recent visitor / delivery / staff activity
 *   5. Community Posts & Notices
 *   6. Floating Concierge FAB (bottom-right) → opens chatbot modal
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { DARK } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { BRAND_LOGO } from '../../constants/branding';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function initialsOf(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || 'U';
}

function formatTodayLong() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

const QUICK_ACTIONS = [
  {
    key: 'pre-approve',
    label: 'Pre-Approve',
    sub: 'Visitor pass',
    icon: 'shield-checkmark',
    gradient: ['#0F3D3A', '#1A6B5F'],
    glow: 'rgba(62, 232, 197, 0.22)',
    border: 'rgba(62, 232, 197, 0.45)',
    iconColor: '#3EE8C5',
  },
  {
    key: 'payments',
    label: 'Payments',
    sub: 'Maintenance',
    icon: 'card-outline',
    gradient: ['#2B2410', '#4A3A1A'],
    glow: 'rgba(242, 201, 76, 0.22)',
    border: 'rgba(242, 201, 76, 0.45)',
    iconColor: '#F2C94C',
  },
  {
    key: 'helpdesk',
    label: 'Helpdesk',
    sub: 'Raise ticket',
    icon: 'headset-outline',
    gradient: ['#10223D', '#1E3D6B'],
    glow: 'rgba(79, 142, 247, 0.22)',
    border: 'rgba(79, 142, 247, 0.45)',
    iconColor: '#6CA0FF',
  },
];

const TODAY_UPDATES = [
  {
    id: 'u1',
    icon: 'car-sport',
    iconColor: '#3EE8C5',
    title: 'Cab arrived at Gate 2',
    sub: 'BluSmart · KA01 AB 1234 · for B-1402',
    time: '6:18 PM',
    statusLabel: 'Arrived',
    statusColor: '#3EE8C5',
    statusBg: 'rgba(62, 232, 197, 0.12)',
  },
  {
    id: 'u2',
    icon: 'cube-outline',
    iconColor: '#F2C94C',
    title: 'Amazon parcel delivered',
    sub: 'Drop-off at lobby reception',
    time: '4:42 PM',
    statusLabel: 'Delivered',
    statusColor: '#F2C94C',
    statusBg: 'rgba(242, 201, 76, 0.12)',
  },
  {
    id: 'u3',
    icon: 'sparkles-outline',
    iconColor: '#6CA0FF',
    title: 'Housekeeping in your block',
    sub: '4 staff on-duty · common-area cleaning',
    time: '9:30 AM',
    statusLabel: 'On-duty',
    statusColor: '#6CA0FF',
    statusBg: 'rgba(108, 160, 255, 0.12)',
  },
];

const COMMUNITY_POSTS = [
  {
    id: 'p1',
    tag: 'NOTICE',
    tagColor: '#F2C94C',
    tagBg: 'rgba(242, 201, 76, 0.14)',
    title: 'Water tanker maintenance — Tue, 28 May',
    snippet:
      'Bulk water supply will pause between 11:00 AM and 1:00 PM for routine cleaning. Please plan ahead.',
    author: 'Society Office',
    date: 'Today',
    pinned: true,
  },
  {
    id: 'p2',
    tag: 'EVENT',
    tagColor: '#3EE8C5',
    tagBg: 'rgba(62, 232, 197, 0.14)',
    title: 'Yoga class moves to Terrace Garden',
    snippet:
      'For the next two weeks, evening yoga (6–7 PM, Mon/Wed/Fri) will be held at the terrace instead of the clubhouse.',
    author: 'Wellness Committee',
    date: 'Yesterday',
  },
  {
    id: 'p3',
    tag: 'COMMUNITY',
    tagColor: '#A78BFA',
    tagBg: 'rgba(167, 139, 250, 0.14)',
    title: 'Block-party planning meet',
    snippet:
      'Join us this Saturday at 5 PM in the Clubhouse Hall to plan the upcoming Diwali block party.',
    author: 'Events Crew',
    date: '23 May',
  },
];

function Header({ user, onLogout, insets }) {
  return (
    <View
      style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}
    >
      <View style={styles.headerLeft}>
        <View style={styles.logoBox}>
          <Image source={BRAND_LOGO} style={styles.logoImg} resizeMode="contain" />
        </View>
        <View>
          <Text style={styles.brand}>Godrej Air</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Concierge online</Text>
          </View>
        </View>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={20} color={DARK.text} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.avatar}
          activeOpacity={0.85}
          onPress={onLogout}
        >
          <Text style={styles.avatarText}>{initialsOf(user?.name)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function GreetingHero({ firstName }) {
  return (
    <LinearGradient
      colors={['rgba(62, 232, 197, 0.10)', 'rgba(79, 142, 247, 0.06)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <Text style={styles.heroDate}>{formatTodayLong().toUpperCase()}</Text>
      <Text style={styles.heroGreeting}>
        {getGreeting()},{' '}
        <Text style={styles.heroName}>{firstName}</Text>
      </Text>
      <Text style={styles.heroSub}>
        Here&apos;s what&apos;s happening around your home today.
      </Text>
    </LinearGradient>
  );
}

function QuickActions({ onAction }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.quickRow}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.key}
            activeOpacity={0.85}
            style={[styles.quickCard, { borderColor: a.border }]}
            onPress={() => onAction(a.key)}
          >
            <LinearGradient
              colors={a.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickGradient}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: a.glow }]}>
                <Ionicons name={a.icon} size={22} color={a.iconColor} />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
              <Text style={styles.quickSub}>{a.sub}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TodaysUpdates() {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Today&apos;s updates</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.sectionLink}>See all</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        {TODAY_UPDATES.map((item, idx) => (
          <View
            key={item.id}
            style={[
              styles.updateRow,
              idx === TODAY_UPDATES.length - 1 && styles.updateRowLast,
            ]}
          >
            <View
              style={[
                styles.updateIcon,
                { backgroundColor: item.statusBg, borderColor: item.statusColor + '55' },
              ]}
            >
              <Ionicons name={item.icon} size={18} color={item.iconColor} />
            </View>
            <View style={styles.updateBody}>
              <View style={styles.updateTopRow}>
                <Text style={styles.updateTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.updateTime}>{item.time}</Text>
              </View>
              <Text style={styles.updateSub} numberOfLines={1}>
                {item.sub}
              </Text>
              <View style={styles.updatePillRow}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: item.statusBg,
                      borderColor: item.statusColor + '55',
                    },
                  ]}
                >
                  <View
                    style={[styles.statusPillDot, { backgroundColor: item.statusColor }]}
                  />
                  <Text style={[styles.statusPillText, { color: item.statusColor }]}>
                    {item.statusLabel}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function CommunityPosts() {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Community & notices</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.sectionLink}>View all</Text>
        </TouchableOpacity>
      </View>
      {COMMUNITY_POSTS.map((post) => (
        <View key={post.id} style={[styles.card, styles.postCard]}>
          <View style={styles.postTopRow}>
            <View
              style={[
                styles.postTag,
                { backgroundColor: post.tagBg, borderColor: post.tagColor + '55' },
              ]}
            >
              <Text style={[styles.postTagText, { color: post.tagColor }]}>
                {post.tag}
              </Text>
            </View>
            {post.pinned ? (
              <View style={styles.pinnedRow}>
                <Ionicons name="bookmark" size={11} color={DARK.muted} />
                <Text style={styles.pinnedText}>Pinned</Text>
              </View>
            ) : null}
            <Text style={styles.postDate}>{post.date}</Text>
          </View>
          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postSnippet} numberOfLines={2}>
            {post.snippet}
          </Text>
          <View style={styles.postFootRow}>
            <Text style={styles.postAuthor}>{post.author}</Text>
            <Ionicons name="chevron-forward" size={14} color={DARK.muted} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ChatbotFab({ onPress, bottomInset }) {
  return (
    <View
      pointerEvents="box-none"
      style={[styles.fabWrap, { bottom: 18 + bottomInset }]}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        accessibilityLabel="Open Concierge chat"
      >
        <LinearGradient
          colors={['#3EE8C5', '#4F8EF7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Ionicons name="sparkles" size={22} color="#08121A" />
        </LinearGradient>
        <View style={styles.fabBadge}>
          <Text style={styles.fabBadgeText}>Ask AI</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function ResidentHomeScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const firstName = useMemo(
    () => (user?.name ? user.name.split(' ')[0] : 'Resident'),
    [user?.name],
  );

  // Hooks for real screens to wire later:
  //   pre-approve → visitor pass form
  //   payments    → maintenance / dues screen
  //   helpdesk    → ticket-raise screen (Concierge AI sits in the FAB, not here)
  const handleQuickAction = (key) => {
    console.log('[resident-home] quick action:', key);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />
      <Header user={user} onLogout={logout} insets={insets} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <GreetingHero firstName={firstName} />
        <QuickActions onAction={handleQuickAction} />
        <TodaysUpdates />
        <CommunityPosts />
      </ScrollView>
      <ChatbotFab
        onPress={() => navigation.navigate('Chatbot')}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK.bg },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: DARK.card,
    borderBottomWidth: 1,
    borderBottomColor: DARK.inputBorder,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0F3D3A',
    borderWidth: 1,
    borderColor: DARK.teal + '55',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: 30, height: 30 },
  brand: { color: DARK.text, fontSize: 15, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: { color: DARK.muted, fontSize: 11 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DARK.bg,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: DARK.card,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DARK.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#08121A', fontWeight: '800', fontSize: 13 },

  // ── Scroll & sections ──────────────────────────────────────────────────────
  scrollContent: { paddingHorizontal: 14, paddingTop: 14 },
  section: { marginTop: 18 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: DARK.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sectionLink: { color: DARK.teal, fontSize: 12, fontWeight: '700' },

  // ── Greeting hero ──────────────────────────────────────────────────────────
  hero: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(62, 232, 197, 0.18)',
    overflow: 'hidden',
  },
  heroDate: {
    color: DARK.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroGreeting: {
    color: DARK.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  heroName: { color: DARK.teal },
  heroSub: { color: DARK.muted, fontSize: 12, marginTop: 4 },

  // ── Quick actions ──────────────────────────────────────────────────────────
  quickRow: { flexDirection: 'row', gap: 10 },
  quickCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 4,
      },
    }),
  },
  quickGradient: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 110,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  quickIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    color: DARK.text,
    fontSize: 13,
    fontWeight: '800',
  },
  quickSub: {
    color: DARK.muted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // ── Card primitive ─────────────────────────────────────────────────────────
  card: {
    backgroundColor: DARK.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    padding: 12,
  },

  // ── Today's updates ────────────────────────────────────────────────────────
  updateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: DARK.inputBorder,
  },
  updateRowLast: { borderBottomWidth: 0, paddingBottom: 2 },
  updateIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBody: { flex: 1, minWidth: 0 },
  updateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  updateTitle: {
    color: DARK.text,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  updateTime: { color: DARK.muted, fontSize: 11, fontWeight: '700' },
  updateSub: { color: DARK.muted, fontSize: 11, marginTop: 2 },
  updatePillRow: { flexDirection: 'row', marginTop: 8 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  // ── Community posts ────────────────────────────────────────────────────────
  postCard: { marginBottom: 10 },
  postTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  postTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  postTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pinnedText: { color: DARK.muted, fontSize: 10, fontWeight: '700' },
  postDate: {
    color: DARK.muted,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  postTitle: { color: DARK.text, fontSize: 14, fontWeight: '700' },
  postSnippet: {
    color: DARK.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  postFootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: DARK.inputBorder,
  },
  postAuthor: { color: DARK.muted, fontSize: 11, fontWeight: '700' },

  // ── Floating chatbot FAB ───────────────────────────────────────────────────
  fabWrap: {
    position: 'absolute',
    right: 18,
    alignItems: 'center',
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(62, 232, 197, 0.35)' },
      default: {
        shadowColor: '#3EE8C5',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
        elevation: 12,
      },
    }),
  },
  fabBadge: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: DARK.card,
    borderWidth: 1,
    borderColor: DARK.teal + '55',
  },
  fabBadgeText: {
    color: DARK.teal,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
