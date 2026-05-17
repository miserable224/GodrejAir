import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { ADMIN_MENU } from '../../constants/data';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const isLarge = width > 768;

const ADMIN_STATS = [
  { label: 'Water Level', value: '85%', trend: 'Stable', icon: 'water', color: '#3B82F6' },
  { label: 'Pending Tickets', value: '12', trend: '-2', icon: 'construct', color: '#EF4444' },
  { label: 'Monthly Expenses', value: '₹4.2L', trend: '+8%', icon: 'wallet', color: '#10B981' },
  { label: 'HK Staff', value: '22', trend: '95%', icon: 'people', color: '#F5A623' },
  { label: 'Active AMCs', value: '18', trend: '0', icon: 'document-text', color: '#8B5CF6' },
  { label: 'Guards on Duty', value: '9', trend: '0', icon: 'shield', color: '#06B6D4' },
];

const RECENT_ACTIVITY = [
  { title: 'New resident registered', sub: 'Tower B - B-403 · Ramesh Kumar', time: '2 min ago', icon: 'person-add', color: '#10B981' },
  { title: 'Maintenance request', sub: 'Plumbing issue - A-1106', time: '15 min ago', icon: 'construct', color: '#F5A623' },
  { title: 'Visitor check-in', sub: 'Mr. Arvind Gupta for C-205', time: '32 min ago', icon: 'enter', color: '#3B82F6' },
  { title: 'AMC renewal due', sub: 'Elevator - Tower A · May 15', time: '1 hr ago', icon: 'alert-circle', color: '#EF4444' },
  { title: 'Payment received', sub: 'Maintenance fee - A-802 · ₹8,500', time: '2 hr ago', icon: 'card', color: '#8B5CF6' },
];

const VENDOR_AGREEMENTS = [
  { id: '1', name: 'SecureTech Guards', type: 'Security', expiry: 'Expires in 12 days', status: 'Renew', color: '#EF4444', icon: 'shield-checkmark' },
  { id: '2', name: 'AquaFlow Services', type: 'Plumbing', expiry: 'Expires in 3 months', status: 'Active', color: '#10B981', icon: 'water' },
  { id: '3', name: 'GreenScapes', type: 'Landscaping', expiry: 'Expires in 6 months', status: 'Active', color: '#3B82F6', icon: 'leaf' },
];

const RENTALS = [
  { id: '1', unit: 'A-402', tenant: 'Kavita Menon', rent: '₹35,000', status: 'Due Soon', color: '#F5A623', icon: 'home' },
  { id: '2', unit: 'C-1105', tenant: 'Rahul Sharma', rent: '₹42,000', status: 'Paid', color: '#10B981', icon: 'home' },
  { id: '3', unit: 'B-801', tenant: 'Aman Singh', rent: '₹28,500', status: 'Overdue', color: '#EF4444', icon: 'home' },
];

export default function AdminDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerCircle} />
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={[styles.headerLeft, { flexDirection: 'row', alignItems: 'center' }]}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="menu" size={24} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={[styles.headerName, { marginLeft: 12, fontSize: 18 }]}>Dashboard</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
                <View style={styles.notifDot} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={logout}>
                <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Overview</Text>
          <View style={styles.statsGrid}>
            {ADMIN_STATS.map((s) => (
              <TouchableOpacity 
                 key={s.label} 
                 style={[styles.statCard, SHADOWS.medium]} 
                 activeOpacity={0.7}
                 onPress={() => {
                   if (s.label === 'Water Level') navigation.navigate('WaterTracking');
                 }}
              >
                <View style={[styles.statIconBg, { backgroundColor: s.color + '18' }]}>
                  <Ionicons name={s.icon} size={20} color={s.color} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
                <View style={[styles.trendBadge, {
                  backgroundColor: s.trend.startsWith('-') ? '#FEE2E2' : '#DCFCE7'
                }]}>
                  <Text style={[styles.trendText, {
                    color: s.trend.startsWith('-') ? COLORS.danger : COLORS.success
                  }]}>{s.trend}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>




        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>⚡ Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>View all</Text>
            </TouchableOpacity>
          </View>
          {RECENT_ACTIVITY.map((item, i) => (
            <TouchableOpacity key={i} style={[styles.activityRow, SHADOWS.small]} activeOpacity={0.7}>
              <View style={[styles.actIconBg, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <View style={styles.actInfo}>
                <Text style={styles.actTitle}>{item.title}</Text>
                <Text style={styles.actSub}>{item.sub}</Text>
              </View>
              <Text style={styles.actTime}>{item.time}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 100 },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
    right: -50,
    top: -50,
  },
  headerContent: { paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: {},
  headerActions: { flexDirection: 'row', gap: 8 },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  adminBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.white, letterSpacing: 1 },
  headerName: { fontSize: SIZES.fontXxl, fontWeight: '800', color: COLORS.white },
  headerSub: { fontSize: SIZES.fontXs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },

  // Section
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: SIZES.fontLg, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 14 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAll: { fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.secondary },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 14,
    width: (width - 52) / 3,
    minWidth: isLarge ? 160 : undefined,
    alignItems: 'center',
  },
  statIconBg: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: SIZES.fontXl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 3 },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '500', marginBottom: 6 },
  trendBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  trendText: { fontSize: 10, fontWeight: '700' },


  // Activity
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  actIconBg: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actInfo: { flex: 1 },
  actTitle: { fontSize: SIZES.fontMd, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  actSub: { fontSize: SIZES.fontXs, color: COLORS.textSecondary },
  actTime: { fontSize: 10, color: COLORS.textLight, fontWeight: '500' },

  // Horizontal Scroll
  hScroll: { paddingRight: 16, gap: 14, paddingVertical: 4 },

  // Vendors
  vendorCard: {
    width: 280,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
  },
  vendorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  vendorIconBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  vendorInfo: { flex: 1 },
  vendorName: { fontSize: SIZES.fontMd, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  vendorType: { fontSize: SIZES.fontXs, color: COLORS.textSecondary, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  // Rentals
  rentalCard: {
    width: 220,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 18,
  },
  rentalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  rentalIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rentalUnit: { fontSize: SIZES.fontXl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  rentalTenant: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: 18, fontWeight: '500' },
  rentDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 14 },
  rentalBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  rentAmount: { fontSize: SIZES.fontLg, fontWeight: '800', color: COLORS.primary },
  rentLabel: { fontSize: SIZES.fontXs, color: COLORS.textSecondary, marginBottom: 3, fontWeight: '600' },
});
