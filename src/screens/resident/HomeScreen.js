import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Image,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, DARK } from '../../constants/theme';
import AmbientBackground from '../../components/AmbientBackground';
import BrandWordmark from '../../components/BrandWordmark';
import {
  TODAY_EVENTS,
  TODAY_CLASSES,
  UPCOMING_EVENTS,
  QUICK_STATS,
  RESIDENT_MENU,
} from '../../constants/data';
import { useAuth } from '../../context/AuthContext';
import { BRAND_LOGO } from '../../constants/branding';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isLargeScreen = width > 768;
const CARD_WIDTH = isLargeScreen ? 300 : width * 0.72;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const formatDate = () => {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ item }) {
  return (
    <View style={statStyles.card}>
      <View style={[statStyles.iconBg, { backgroundColor: item.color + '18' }]}>
        <Ionicons name={item.icon} size={20} color={item.color} />
      </View>
      <Text style={statStyles.value}>{item.value}</Text>
      <Text style={statStyles.label}>{item.label}</Text>
    </View>
  );
}

function EventCard({ item }) {
  return (
    <View style={[evtStyles.card, SHADOWS.medium]}>
      <LinearGradient
        colors={[item.color + '22', item.color + '06']}
        style={evtStyles.cardBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Status Badge */}
      {item.status === 'ongoing' && (
        <View style={evtStyles.ongoingBadge}>
          <View style={evtStyles.ongoingDot} />
          <Text style={evtStyles.ongoingText}>LIVE</Text>
        </View>
      )}
      <View style={[evtStyles.iconCircle, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon} size={22} color={COLORS.white} />
      </View>
      <Text style={evtStyles.title} numberOfLines={2}>{item.title}</Text>
      <View style={evtStyles.metaRow}>
        <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
        <Text style={evtStyles.metaText}>{item.time}</Text>
      </View>
      <View style={evtStyles.metaRow}>
        <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
        <Text style={evtStyles.metaText} numberOfLines={1}>{item.location}</Text>
      </View>
      <View style={evtStyles.footer}>
        <View style={evtStyles.attendeeBadge}>
          <Ionicons name="people-outline" size={12} color={item.color} />
          <Text style={[evtStyles.attendeeText, { color: item.color }]}>{item.attendees}</Text>
        </View>
        <View style={[evtStyles.categoryBadge, { backgroundColor: item.color + '18' }]}>
          <Text style={[evtStyles.categoryText, { color: item.color }]}>{item.category}</Text>
        </View>
      </View>
    </View>
  );
}

function ClassCard({ item }) {
  const pct = (item.enrolled / item.capacity) * 100;
  const isFull = item.slots === 'Full';
  return (
    <View style={[clsStyles.card, SHADOWS.small]}>
      <View style={clsStyles.left}>
        <View style={[clsStyles.iconBg, { backgroundColor: item.color + '18' }]}>
          <Ionicons name={item.icon} size={20} color={item.color} />
        </View>
      </View>
      <View style={clsStyles.middle}>
        <View style={clsStyles.titleRow}>
          <Text style={clsStyles.title} numberOfLines={1}>{item.title}</Text>
          {item.status === 'ongoing' && (
            <View style={clsStyles.liveBadge}>
              <Text style={clsStyles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
        <Text style={clsStyles.instructor}>👤 {item.instructor}</Text>
        <View style={clsStyles.metaRow}>
          <Text style={clsStyles.meta}>{item.time}</Text>
          <Text style={clsStyles.dot}>•</Text>
          <Text style={clsStyles.meta}>{item.duration}</Text>
          <Text style={clsStyles.dot}>•</Text>
          <Text style={[clsStyles.meta, { color: item.color }]}>{item.category}</Text>
        </View>
        {/* Progress bar */}
        <View style={clsStyles.progressBg}>
          <View style={[clsStyles.progressFill, { width: `${pct}%`, backgroundColor: item.color }]} />
        </View>
      </View>
      <View style={clsStyles.right}>
        <TouchableOpacity
          style={[
            clsStyles.bookBtn,
            { backgroundColor: isFull ? '#F3F4F6' : item.color },
          ]}
          disabled={isFull}
          activeOpacity={0.8}
        >
          <Text
            style={[
              clsStyles.bookText,
              { color: isFull ? COLORS.textLight : COLORS.white },
            ]}
          >
            {isFull ? 'Full' : 'Book'}
          </Text>
        </TouchableOpacity>
        <Text style={[clsStyles.slots, { color: isFull ? COLORS.danger : COLORS.textSecondary }]}>
          {item.slots}
        </Text>
      </View>
    </View>
  );
}

function UpcomingEventRow({ item }) {
  return (
    <TouchableOpacity style={[upStyles.row, SHADOWS.small]} activeOpacity={0.8}>
      <View style={[upStyles.iconBox, { backgroundColor: item.color + '18' }]}>
        <Ionicons name={item.icon} size={18} color={item.color} />
      </View>
      <View style={upStyles.info}>
        <Text style={upStyles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={upStyles.sub}>{item.date} · {item.location}</Text>
      </View>
      <View style={[upStyles.catBadge, { backgroundColor: item.color + '18' }]}>
        <Text style={[upStyles.catText, { color: item.color }]}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );
}

function QuickActionBtn({ item }) {
  return (
    <TouchableOpacity style={qaStyles.btn} activeOpacity={0.8}>
      <LinearGradient
        colors={[item.color + '22', item.color + '08']}
        style={qaStyles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={item.icon} size={24} color={item.color} />
        <Text style={[qaStyles.label, { color: item.color }]} numberOfLines={2}>{item.label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ResidentHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('events'); // 'events' | 'classes'
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerBg = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: ['transparent', DARK.card],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />

      {/* Floating Header */}
      <Animated.View style={[styles.floatingHeader, { backgroundColor: headerBg }]}>
        <View style={styles.headerLeft}>
          <Image source={BRAND_LOGO} style={styles.headerLogoImage} resizeMode="contain" />
          <BrandWordmark size={20} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
            <View style={styles.notifBadge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Hero Section ─────────────────────────────── */}
        <View style={styles.hero}>
          {/* Building background image */}
          <Image
            source={require('../../../assets/building.png')}
            style={styles.heroBgImage}
            resizeMode="cover"
          />
          {/* Dark gradient overlay for readability */}
          <LinearGradient
            colors={['rgba(7,10,16,0.4)', 'rgba(14,18,25,0.75)', 'rgba(7,10,16,0.95)']}
            style={styles.heroOverlay}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* User greeting */}
          <View style={styles.heroContent}>
            <View style={styles.greetRow}>
              <View>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.userName}>{user?.name?.split(' ')[0]} 👋</Text>
              </View>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </Text>
              </View>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.aptRow}>
              <View style={styles.aptBadge}>
                <Ionicons name="home" size={13} color={COLORS.accent} />
                <Text style={styles.aptText}>{user?.apartment || 'Flat'} · {user?.tower || ''}</Text>
              </View>
              <Text style={styles.dateText}>{formatDate()}</Text>
            </View>

            {/* Weather / mood banner */}
            <View style={styles.weatherCard}>
              <View style={styles.weatherLeft}>
                <Text style={styles.weatherTemp}>29°C</Text>
                <Text style={styles.weatherDesc}>Partly Cloudy · Mumbai</Text>
              </View>
              <View style={styles.weatherRight}>
                <Ionicons name="partly-sunny" size={42} color={COLORS.accentLight} />
              </View>
            </View>
          </View>
        </View>

        {/* ─── Stats Row ────────────────────────────────── */}
        <View style={styles.statsRow}>
          {QUICK_STATS.map((s) => (
            <StatCard key={s.label} item={s} />
          ))}
        </View>

        {/* ─── Main Content ─────────────────────────────── */}
        <View style={styles.mainContent}>

          {/* Section Switcher */}
          <View style={styles.sectionSwitcher}>
            <TouchableOpacity
              style={[styles.switchBtn, activeSection === 'events' && styles.switchBtnActive]}
              onPress={() => setActiveSection('events')}
            >
              <Ionicons
                name="calendar"
                size={16}
                color={activeSection === 'events' ? DARK.teal : COLORS.textSecondary}
              />
              <Text style={[styles.switchText, activeSection === 'events' && styles.switchTextActive]}>
                Today's Events
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchBtn, activeSection === 'classes' && styles.switchBtnActive]}
              onPress={() => setActiveSection('classes')}
            >
              <Ionicons
                name="fitness"
                size={16}
                color={activeSection === 'classes' ? DARK.teal : COLORS.textSecondary}
              />
              <Text style={[styles.switchText, activeSection === 'classes' && styles.switchTextActive]}>
                Today's Classes
              </Text>
            </TouchableOpacity>
          </View>

          {/* ─── Events Cards Horizontal ── */}
          {activeSection === 'events' && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🎉 Happening Today</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll}
              >
                {TODAY_EVENTS.map((item) => (
                  <View key={item.id} style={{ width: CARD_WIDTH, marginRight: 14 }}>
                    <EventCard item={item} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ─── Classes List ── */}
          {activeSection === 'classes' && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🏋️ Today's Classes</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              {TODAY_CLASSES.map((item) => (
                <ClassCard key={item.id} item={item} />
              ))}
            </View>
          )}

          {/* ─── Quick Actions ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            </View>
            <View style={styles.qaGrid}>
              {RESIDENT_MENU.slice(1).map((item) => (
                <QuickActionBtn key={item.key} item={item} />
              ))}
            </View>
          </View>

          {/* ─── Upcoming Events ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📅 Coming Up</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>View calendar</Text>
              </TouchableOpacity>
            </View>
            {UPCOMING_EVENTS.map((item) => (
              <UpcomingEventRow key={item.id} item={item} />
            ))}
          </View>

          {/* ─── Notice Board ── */}
          <View style={[styles.section, styles.noticeBoard]}>
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary]}
              style={styles.noticeBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.noticeCircle} />
              <View style={styles.noticeContent}>
                <View style={styles.noticeBadge}>
                  <Ionicons name="megaphone" size={12} color={COLORS.accent} />
                  <Text style={styles.noticeBadgeText}>NOTICE</Text>
                </View>
                <Text style={styles.noticeTitle}>Water Supply Maintenance</Text>
                <Text style={styles.noticeDesc}>
                  Scheduled maintenance on May 5, 2026 from 10 AM–2 PM. Please store water accordingly.
                </Text>
                <TouchableOpacity style={styles.noticeBtn}>
                  <Text style={styles.noticeBtnText}>Read More</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.accent} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 100 },

  // Floating Header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 36 : Platform.OS === 'web' ? 16 : 52,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  headerLogoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.2,
  },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  notifBadge: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    borderWidth: 1.5,
    borderColor: DARK.card,
  },

  // Hero
  hero: {
    overflow: 'hidden',
    minHeight: 360,
    paddingBottom: 28,
    paddingTop: Platform.OS === 'ios' ? 130 : Platform.OS === 'android' ? 100 : 90,
    position: 'relative',
  },
  heroBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: { paddingHorizontal: 20, position: 'relative', zIndex: 2 },
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  greeting: { fontSize: SIZES.fontMd, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  userName: { fontSize: 28, fontWeight: '800', color: COLORS.white },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { fontSize: SIZES.fontLg, fontWeight: '800', color: COLORS.white },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 14,
  },
  aptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  aptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SIZES.radiusFull,
  },
  aptText: { fontSize: SIZES.fontSm, color: COLORS.white, fontWeight: '600' },
  dateText: { fontSize: SIZES.fontXs, color: 'rgba(255,255,255,0.6)' },

  // Weather card
  weatherCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: SIZES.radiusLg,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  weatherLeft: {},
  weatherTemp: { fontSize: 32, fontWeight: '800', color: COLORS.white },
  weatherDesc: { fontSize: SIZES.fontXs, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  weatherRight: {},

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -20,
    gap: 10,
    zIndex: 10,
  },

  // Section
  section: { paddingHorizontal: 16, marginTop: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  seeAll: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.secondary,
  },

  // Section Switcher
  sectionSwitcher: {
    flexDirection: 'row',
    backgroundColor: DARK.input,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
  },
  switchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: SIZES.radiusFull,
  },
  switchBtnActive: {
    backgroundColor: DARK.cardHighlight,
    borderWidth: 1,
    borderColor: 'rgba(62, 232, 197, 0.25)',
  },
  switchText: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  switchTextActive: { color: DARK.teal },

  // Horizontal Scroll
  hScroll: { paddingLeft: 4, paddingRight: 16 },

  // Main Content
  mainContent: { flex: 1 },

  // Quick Actions Grid
  qaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  // Notice Board
  noticeBoard: {},
  noticeBg: {
    borderRadius: SIZES.radiusXl,
    overflow: 'hidden',
    padding: 22,
  },
  noticeCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
    right: -40,
    top: -40,
  },
  noticeContent: {},
  noticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  noticeBadgeText: {
    fontSize: SIZES.fontXs,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 1.5,
  },
  noticeTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 8,
  },
  noticeDesc: {
    fontSize: SIZES.fontSm,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 21,
    marginBottom: 16,
  },
  noticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
    paddingBottom: 2,
  },
  noticeBtnText: {
    fontSize: SIZES.fontSm,
    fontWeight: '700',
    color: COLORS.accent,
  },
});

// ─── Sub-component styles ────────────────────────────────────────────────────

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: DARK.cardHighlight,
    borderRadius: SIZES.radiusMd,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    ...SHADOWS.medium,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  value: {
    fontSize: SIZES.fontXl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  label: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500',
  },
});

const evtStyles = StyleSheet.create({
  card: {
    backgroundColor: DARK.cardHighlight,
    borderRadius: SIZES.radiusXl,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 200,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
  },
  cardBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SIZES.radiusXl,
  },
  ongoingBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
  },
  ongoingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
  },
  ongoingText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.danger,
    letterSpacing: 1,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: SIZES.fontLg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
  metaText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  attendeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeeText: {
    fontSize: SIZES.fontXs,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

const clsStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: DARK.cardHighlight,
    borderRadius: SIZES.radiusLg,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
  },
  left: {},
  iconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  title: {
    fontSize: SIZES.fontMd,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  liveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.success,
    letterSpacing: 0.8,
  },
  instructor: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  meta: { fontSize: SIZES.fontXs, color: COLORS.textSecondary },
  dot: { fontSize: SIZES.fontXs, color: COLORS.textLight },
  progressBg: {
    height: 4,
    backgroundColor: DARK.input,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  right: { alignItems: 'center', gap: 6 },
  bookBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SIZES.radiusMd,
  },
  bookText: { fontSize: SIZES.fontXs, fontWeight: '700' },
  slots: { fontSize: 10, fontWeight: '600' },
});

const upStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.cardHighlight,
    borderRadius: SIZES.radiusLg,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { fontSize: SIZES.fontMd, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  sub: { fontSize: SIZES.fontXs, color: COLORS.textSecondary },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  catText: { fontSize: 10, fontWeight: '700' },
});

const qaStyles = StyleSheet.create({
  btn: {
    width: '31%',
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
    marginBottom: 4,
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 8,
    minHeight: 86,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
});
