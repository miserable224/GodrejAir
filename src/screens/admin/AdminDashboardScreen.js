import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  UIManager,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeBottomTabBarHeight } from '../../utils/safeTabBarHeight';
import { COLORS, SIZES, SHADOWS, DARK } from '../../constants/theme';
import AmbientBackground from '../../components/AmbientBackground';
import BrandWordmark from '../../components/BrandWordmark';
import SecurityFormModal, { SecSaveButton } from '../../components/SecurityFormModal';
import RentalsModulePanel from '../../components/RentalsModulePanel';
import {
  RentalsShopForm,
  RentalsTrainerForm,
  RentalsPaymentForm,
} from '../../components/RentalsFormModals';
import AmcModulePanel from '../../components/AmcModulePanel';
import {
  AmcContractForm,
  AmcComplianceForm,
  AmcCertificateForm,
} from '../../components/AmcFormModals';
import WaterModulePanel from '../../components/WaterModulePanel';
import ExpensesModulePanel from '../../components/ExpensesModulePanel';
import { ExpenseRecordForm } from '../../components/ExpensesFormModals';
import { computeWaterDashboard } from '../../utils/waterMetrics';
import AttendanceRoleRow from '../../components/AttendanceRoleRow';
import ModulePhotoSection from '../../components/ModulePhotoSection';
import {
  formatGeoCaption,
  locationLabelFromPhoto,
  pickGeoPhotoFromCamera,
  pickGeoPhotoFromLibrary,
} from '../../utils/geoPhoto';
import { WaterRecordForm, WaterVendorForm } from '../../components/WaterRecordForm';
import { HK, WATER } from '../../constants/moduleThemes';
import { ensureValidAccessToken } from '../../modules/shared';
import {
  ADMIN_RENTALS_CATEGORY_PROGRESS,
  ADMIN_COLLECTIONS_VS_EXPECTED,
  ADMIN_PENDING_DUES_BY_CATEGORY,
  ADMIN_COMMERCIAL_UNIT_AGREEMENTS,
  ADMIN_COMMAND_MODULES,
  ADMIN_PROMOTIONS_SNAPSHOT,
  ADMIN_MYGATE_SNAPSHOT,
  ADMIN_MANPOWER_DEPLOYMENT,
  formatINR,
} from '../../constants/data';
import { useAuth } from '../../context/AuthContext';
import {
  filterDashboardSections,
  isModuleVisible,
} from '../../constants/roles';
import { BRAND_LOGO } from '../../constants/branding';
import { apiService } from '../../modules/shared';
import {
  postDutyCheckIn,
  postDutyCheckOut,
  fetchOpenDutySession,
  fetchDutySessionsRange,
  fetchOnDutySessions,
  formatDutyDurationMinutes,
  formatDutyTime,
  aggregateHoursByStaff,
  resolveSecurityDateParams,
  postMobilePatrol,
  postStaffMember,
  useSecurityData,
  applyDeploymentEntriesToCounts,
  normalizeRoleKey,
} from '../../modules/security';
import {
  mergeHkDeploymentOverlay,
  useHousekeepingData,
  invalidateHousekeepingCache,
  postHkDutyCheckIn,
  postHkDutyCheckOut,
  fetchOpenHkDutySession,
  fetchHkDutySessionsRange,
  fetchOnDutyHkSessions,
  resolveWorkforceDateParams,
} from '../../modules/housekeeping';
import { SEC, SEC_FONTS, SEC_PLACEHOLDER } from '../../constants/securityTheme';

const RENTALS_SUBTITLE = `${ADMIN_COLLECTIONS_VS_EXPECTED.received} vs billed targets · ${ADMIN_COLLECTIONS_VS_EXPECTED.periodLabel}`;

const OPERATIONS_SECTIONS = [
  {
    id: 'rentals',
    tab: 'Rentals',
    title: 'Rentals & collections',
    subtitle: RENTALS_SUBTITLE,
    icon: 'storefront-outline',
    color: COLORS.primary,
    featured: true,
  },
  {
    id: 'amc',
    title: 'AMC & compliance',
    subtitle: 'Renewals, audits and preventive maintenance',
    icon: 'document-text-outline',
    color: '#8B5CF6',
    featured: false,
  },
  ...ADMIN_COMMAND_MODULES.map((m) => ({
    id: m.key,
    tab: m.key,
    title: m.title,
    subtitle: m.subtitle,
    icon: `${m.icon}-outline`,
    color: m.color,
    featured: false,
  })),
];

const ENGAGEMENT_SECTIONS = [
  {
    id: 'promotions',
    stackScreen: 'AdminPromotions',
    title: 'Promotions',
    subtitle: `${ADMIN_PROMOTIONS_SNAPSHOT.activeCampaigns} active · ${ADMIN_PROMOTIONS_SNAPSHOT.periodNote}`,
    icon: 'megaphone-outline',
    color: '#D97706',
    featured: false,
  },
  {
    id: 'mygate',
    stackScreen: 'AdminMyGateTickets',
    title: 'MyGate tickets',
    subtitle: `${ADMIN_MYGATE_SNAPSHOT.openTickets} open · ${ADMIN_MYGATE_SNAPSHOT.resolvedWeek} resolved this week`,
    icon: 'ticket-outline',
    color: '#0284C7',
    featured: false,
  },
];

/** Post / gate options for deployment logging (admin picker). */
const DEPLOYMENT_LOCATION_OPTIONS = [
  'Main Gate',
  'Service / Rear Gate',
  'Visitor / Delivery Gate',
  'Loading / Dock',
  'Parking — Basement',
  'Parking — Level 1',
  'Club House',
  'Swimming Pool',
  'Office / Control Room',
  'Common — Ground',
  'Perimeter / External patrol',
  'Tower A — Lobby & ground',
  'Tower B — Lobby & ground',
  'Tower C — Lobby & ground',
  'Tower D — Lobby & ground',
  'Tower E — Lobby & ground',
  'Tower F — Lobby & ground',
  'Tower G — Lobby & ground',
  'Tower H — Lobby & ground',
  'Tower J — Lobby & ground',
  'Back / Fire staircase zones',
];

/** Shown when roster API returns no names (offline / empty DB). */
const DEPLOYMENT_STAFF_FALLBACK_NAMES = [
  'Kumar',
  'Sharanu',
  'Bishal Madgi',
  'Sabir Ali',
  'Mahesh Kumar',
  'Gopal Krishna',
  'Sowmya P',
  'Tumpa Dutta',
  'Ningayya',
  'Mani Natrajan',
  'Karthik Ravi',
  'Sabuj Sarkar',
  'Prasant',
  'Govinda Rabi Das',
  'Priya Sharma',
  'Arjun Mehta',
  'Anika Rao',
];

const pad2 = (n) => String(n).padStart(2, '0');

/** Parse DD/MM/YYYY or DD-MM-YYYY; 2-digit year → 2000+y */
function parseDMYInput(str) {
  const parts = String(str || '').trim().split(/[/-]/);
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  let y = parseInt(parts[2], 10);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return null;
  if (y < 100) y += 2000;
  const dt = new Date(y, m, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toYMD(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfWeekMonday(ref) {
  const x = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeekSunday(fromMonday) {
  const x = new Date(fromMonday);
  x.setDate(x.getDate() + 6);
  return x;
}

function shortenDateLabel(d) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function rateCardRole(rate) {
  return rate?.roleName ?? rate?.role ?? rate?.RoleName ?? rate?.Role ?? '';
}

function findRateByDbRole(rates, dbRole) {
  const k = normalizeRoleKey(dbRole);
  return rates.find((x) => normalizeRoleKey(rateCardRole(x)) === k) || null;
}

/**
 * Match deployment UI labels to vendor rate `role` values (e.g. Tower / Main Gate → SECURITY_GUARD).
 */
function matchSecurityRoleRate(deploymentRole, rates) {
  if (!rates?.length) return null;
  const key = normalizeRoleKey(deploymentRole);
  const direct = rates.find((x) => normalizeRoleKey(rateCardRole(x)) === key);
  if (direct) return direct;

  if (key.includes('LADY')) return findRateByDbRole(rates, 'LADY_GUARD');
  if (key.includes('SECURITY') && key.includes('OFFICER')) return findRateByDbRole(rates, 'SECURITY_OFFICER');
  if (key.includes('HEAD') && key.includes('GUARD')) return findRateByDbRole(rates, 'HEAD_GUARD');
  if (key.includes('SUPERVISOR')) return findRateByDbRole(rates, 'SUPERVISOR');

  if (
    key.includes('TOWER') ||
    key.includes('MAIN GATE') ||
    key.includes(' GATE') ||
    key.startsWith('GATE ') ||
    key.includes('PATROL') ||
    key.includes('PERIMETER') ||
    key.includes('GUARDS') ||
    key.endsWith(' GUARD') ||
    key.endsWith('GUARD')
  ) {
    return findRateByDbRole(rates, 'SECURITY_GUARD');
  }

  const fuzzy = rates.find((x) => {
    const rk = normalizeRoleKey(rateCardRole(x));
    return rk.length >= 4 && (key.includes(rk) || rk.includes(key));
  });
  return fuzzy || null;
}

function daysInCurrentMonthUtc() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 0)).getUTCDate();
}

function effectiveMonthlyPerPaxFromRateCard(rate) {
  const m = Number(rate?.monthlyRate ?? rate?.MonthlyRate) || 0;
  if (m > 0) return m;
  const d = Number(rate?.dailyRate ?? rate?.DailyRate) || 0;
  const days = daysInCurrentMonthUtc();
  return d > 0 && days > 0 ? d * days : 0;
}

/** Vendor monthly ÷ (2 shifts × calendar days) — one S1 or S2 slot-day share of the month. */
function perShiftRateFromMonthlyRateCard(rate) {
  const monthly = effectiveMonthlyPerPaxFromRateCard(rate);
  const dim = daysInCurrentMonthUtc();
  if (monthly <= 0 || dim <= 0) return 0;
  return monthly / (2 * dim);
}

/** S1+S2 slot counts × per-shift rupee (derived from monthly contract rate). */
function estimateSecurityBillFromShifts(securityRows, rates, sanctionedStrength = []) {
  const lines = [];
  let total = 0;

  if (rates?.length) {
    for (const row of securityRows) {
      const actual = Number(row.actualS1) + Number(row.actualS2);
      const expectedSlots = Math.max(0, Number(row.expected) || 0) * 2;
      const present = actual > 0 ? actual : expectedSlots;
      const r = matchSecurityRoleRate(row.role, rates);
      const perShift = r ? perShiftRateFromMonthlyRateCard(r) : 0;
      const line = present * perShift;
      total += line;
      lines.push({
        role: row.role,
        present,
        perShift,
        line,
        rateRole: r ? rateCardRole(r) : null,
      });
    }
  }

  // Fallback: sanctioned strength × monthly rate (matches vendor contract basis).
  if (total <= 0 && rates?.length && sanctionedStrength?.length) {
    for (const s of sanctionedStrength) {
      const slots =
        (Number(s.shift1Count) || 0) +
        (Number(s.shift2Count) || 0) +
        (Number(s.shift3Count) || 0) +
        (Number(s.generalShiftCount) || 0) +
        (Number(s.relieverCount) || 0);
      if (slots <= 0) continue;
      const r = matchSecurityRoleRate(s.roleName ?? s.role, rates);
      const monthly = r ? effectiveMonthlyPerPaxFromRateCard(r) : 0;
      total += slots * monthly;
    }
  }

  return { total, lines };
}

function avgCategoryRatio(historyRows, cat) {
  const rows = historyRows.filter((r) => r.category === cat);
  if (!rows.length) return 1;
  const sum = rows.reduce((s, r) => {
    const exp = r.totalExpected || 1;
    return s + r.totalActual / exp;
  }, 0);
  return sum / rows.length;
}

function applyCategoryRatios(counts, fmRatio, secRatio) {
  return counts.map((c) => {
    const r = c.category === 'FM_HK' ? fmRatio : secRatio;
    const cap = Math.max(c.expected * 3, c.actualS1, c.actualS2, 1);
    return {
      ...c,
      actualS1: Math.max(0, Math.min(Math.round(c.actualS1 * r), cap)),
      actualS2: Math.max(0, Math.min(Math.round(c.actualS2 * r), cap)),
    };
  });
}

const DASHBOARD_SECTIONS = [...OPERATIONS_SECTIONS, ...ENGAGEMENT_SECTIONS];
const CONTENT_PAD = 16;
const CARD_GAP = 10;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function AnimatedBrandLogo() {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.screenLogoOuter}>
        <View style={styles.screenLogoWrap}>
          <Image
            source={BRAND_LOGO}
            style={styles.screenLogoImage}
            resizeMode="cover"
            accessibilityLabel="Godrej Air"
          />
        </View>
      </View>
    );
  }

  const floatY = useSharedValue(0);
  const glow = useSharedValue(1);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [floatY, glow]);

  const logoMotion = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: glow.value }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.screenLogoOuter}>
      <Animated.View style={[styles.screenLogoWrap, logoMotion]}>
        <Image
          source={BRAND_LOGO}
          style={styles.screenLogoImage}
          resizeMode="cover"
          accessibilityLabel="Godrej Air"
        />
      </Animated.View>
    </Animated.View>
  );
}

function FloatingModuleCard({ section, index, expanded, onPress, isLast, children }) {
  const scale = useSharedValue(1);
  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 48)
        .duration(420)
        .springify()
        .damping(16)
        .stiffness(140)}
      style={[
        styles.floatCard,
        isLast && styles.floatCardLast,
        expanded && styles.floatCardExpanded,
        cardAnim,
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.moduleRow,
          section.featured && styles.moduleRowFeatured,
          expanded && styles.moduleRowExpanded,
          expanded && section.id === 'Security' && styles.moduleRowSecurityExpanded,
          expanded && section.id === 'Workforce' && styles.moduleRowSecurityExpanded,
          expanded && section.id === 'rentals' && styles.moduleRowRentalsExpanded,
          expanded && section.id === 'amc' && styles.moduleRowAmcExpanded,
          expanded && section.id === 'WaterTracking' && styles.moduleRowOpsExpanded,
          expanded && section.id === 'Expenses' && styles.moduleRowOpsExpanded,
          pressed && styles.moduleRowPressed,
        ]}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.985, { duration: 90 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 140 });
        }}
        android_ripple={{ color: 'rgba(62, 232, 197, 0.1)' }}
      >
        <View
          style={[
            styles.moduleIconWrap,
            { backgroundColor: section.color + '22' },
            section.featured && { borderColor: section.color + '55', borderWidth: 1 },
          ]}
        >
          <Ionicons name={section.icon} size={21} color={section.color} />
        </View>
        <Text
          style={[styles.moduleTitle, section.featured && styles.moduleTitleFeatured]}
          numberOfLines={1}
        >
          {section.title}
        </Text>
        <View style={[styles.moduleChevronWrap, expanded && styles.moduleChevronWrapOpen]}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={expanded ? COLORS.primary : COLORS.textLight}
          />
        </View>
      </Pressable>
      {children}
    </Animated.View>
  );
}

export default function AdminDashboardScreen({ navigation, route }) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeBottomTabBarHeight();
  const { logout, token, user, permissions } = useAuth();

  const visibleDashboardSections = useMemo(
    () => filterDashboardSections(DASHBOARD_SECTIONS, user?.apiRole),
    [user?.apiRole],
  );

  const [expandedId, setExpandedId] = useState(null);
  const [duesTipOpen, setDuesTipOpen] = useState(false);
  const [agreementsOpen, setAgreementsOpen] = useState(false);
  const [commercialUnits, setCommercialUnits] = useState(ADMIN_COMMERCIAL_UNIT_AGREEMENTS);
  const [amcContracts, setAmcContracts] = useState([
    {
      id: 'a1',
      label: 'Lift AMC',
      vendor: 'Otis India',
      dueIn: '12 days',
      status: 'Renewal due',
      category: 'Mechanical',
    },
    {
      id: 'a2',
      label: 'Fire Safety',
      vendor: 'SafeGuard Pvt Ltd',
      dueIn: '34 days',
      status: 'Active',
      category: 'Fire',
    },
    {
      id: 'a3',
      label: 'DG Set',
      vendor: 'PowerCore Systems',
      dueIn: '7 days',
      status: 'Critical',
      category: 'Electrical',
    },
  ]);
  const [complianceItems, setComplianceItems] = useState([
    { id: 'c1', label: 'Fire NOC', dueIn: '45 days', status: 'Compliant' },
    { id: 'c2', label: 'Lift statutory inspection', dueIn: '8 days', status: 'Due soon' },
    { id: 'c3', label: 'STP discharge test', dueIn: '21 days', status: 'Active' },
  ]);
  const [amcRenewalsOnly, setAmcRenewalsOnly] = useState(false);
  const [addAmcOpen, setAddAmcOpen] = useState(false);
  const [logComplianceOpen, setLogComplianceOpen] = useState(false);
  const [amcCertificateOpen, setAmcCertificateOpen] = useState(false);
  const [amcContractForm, setAmcContractForm] = useState({
    label: '',
    vendor: '',
    category: '',
    dueIn: '',
    annualValue: '',
    documentFile: '',
  });
  const [complianceForm, setComplianceForm] = useState({
    label: '',
    authority: '',
    dueIn: '',
    notes: '',
    certificateFile: '',
  });
  const [certificateForm, setCertificateForm] = useState({
    label: '',
    certificateFile: '',
  });
  const [addShopOpen, setAddShopOpen] = useState(false);
  const [addTrainerOpen, setAddTrainerOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [recordWaterOpen, setRecordWaterOpen] = useState(false);
  const [waterVendorOpen, setWaterVendorOpen] = useState(false);
  const [recordExpenseOpen, setRecordExpenseOpen] = useState(false);
  const [recordPatrolOpen, setRecordPatrolOpen] = useState(false);
  const [securityDateRange, setSecurityDateRange] = useState('Today');
  const [showSecurityDateMenu, setShowSecurityDateMenu] = useState(false);
  const [showHkDateMenu, setShowHkDateMenu] = useState(false);
  /** Housekeeping date filter (Today / week / month / custom). */
  const [staffTimePreset, setStaffTimePreset] = useState('today');
  const [staffDateRange, setStaffDateRange] = useState({ from: '', to: '' });
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const {
    staffCounts: securityStaffCounts,
    setStaffCounts: setSecurityStaffCounts,
    securityRoleRates,
    sanctionedStrength,
    setSanctionedStrength,
    securityBilling,
    securityDashboard,
    staffRoster,
    isLoading: isStaffLoading,
    fetchErrors,
    periodLabel: securityPeriodLabel,
    refresh: refreshSecurityData,
  } = useSecurityData({
    token,
    dateRange: securityDateRange,
    customRange,
    // Only fetch security APIs when the Security card is expanded (not on dashboard mount).
    enabled: expandedId === 'Security' && (permissions?.canSeeModule('Security') ?? true),
  });

  const [dutySessions, setDutySessions] = useState([]);
  const [dutySessionsLoading, setDutySessionsLoading] = useState(false);
  const [dutySessionsTick, setDutySessionsTick] = useState(0);

  const dutyDateParams = useMemo(
    () => resolveSecurityDateParams(securityDateRange, customRange),
    [securityDateRange, customRange.from, customRange.to],
  );

  const dutyHoursByStaff = useMemo(
    () => aggregateHoursByStaff(dutySessions),
    [dutySessions, dutySessionsTick],
  );

  const displayDutyDuration = useCallback((session) => {
    if (session.status === 'open' && session.entryAt) {
      const mins = Math.max(
        0,
        Math.round((Date.now() - new Date(session.entryAt).getTime()) / 60000),
      );
      return `${formatDutyDurationMinutes(mins)} · on duty`;
    }
    return session.durationLabel || formatDutyDurationMinutes(session.durationMinutes);
  }, [dutySessionsTick]);

  useEffect(() => {
    if (expandedId !== 'Security' || !token || !dutyDateParams.valid) {
      setDutySessions([]);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setDutySessionsLoading(true);
      try {
        const accessToken = (await ensureValidAccessToken()) || token;
        if (!accessToken || cancelled) return;
        const list = await fetchDutySessionsRange(accessToken, {
          from: dutyDateParams.from,
          to: dutyDateParams.to,
        });
        if (!cancelled) setDutySessions(list);
      } catch (err) {
        if (!cancelled) {
          console.warn('Duty sessions load:', err?.message);
          setDutySessions([]);
        }
      } finally {
        if (!cancelled) setDutySessionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    expandedId,
    token,
    dutyDateParams.from,
    dutyDateParams.to,
    dutyDateParams.valid,
    dutySessionsTick,
  ]);

  useEffect(() => {
    if (expandedId !== 'Security') return undefined;
    const hasOpen = dutySessions.some((s) => s.status === 'open');
    if (!hasOpen) return undefined;
    const id = setInterval(() => setDutySessionsTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, [expandedId, dutySessions]);

  const [hkDutySessions, setHkDutySessions] = useState([]);
  const [hkDutySessionsLoading, setHkDutySessionsLoading] = useState(false);
  const [hkDutySessionsTick, setHkDutySessionsTick] = useState(0);
  const [hkDutyModal, setHkDutyModal] = useState(null);
  const [hkCheckoutSessionId, setHkCheckoutSessionId] = useState(null);
  const [isSavingHkDuty, setIsSavingHkDuty] = useState(false);
  const [committedHkEntries, setCommittedHkEntries] = useState([]);

  const hkDutyDateParams = useMemo(
    () => resolveWorkforceDateParams(staffTimePreset, staffDateRange),
    [staffTimePreset, staffDateRange.from, staffDateRange.to],
  );

  const hkDutyHoursByStaff = useMemo(
    () => aggregateHoursByStaff(hkDutySessions),
    [hkDutySessions, hkDutySessionsTick],
  );

  const displayHkDutyDuration = useCallback((session) => {
    if (session.status === 'open' && session.entryAt) {
      const mins = Math.max(
        0,
        Math.round((Date.now() - new Date(session.entryAt).getTime()) / 60000),
      );
      return `${formatDutyDurationMinutes(mins)} · on duty`;
    }
    return session.durationLabel || formatDutyDurationMinutes(session.durationMinutes);
  }, [hkDutySessionsTick]);

  useEffect(() => {
    if (expandedId !== 'Workforce' || !token || !hkDutyDateParams.valid) {
      setHkDutySessions([]);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setHkDutySessionsLoading(true);
      try {
        const accessToken = (await ensureValidAccessToken()) || token;
        if (!accessToken || cancelled) return;
        const list = await fetchHkDutySessionsRange(accessToken, {
          from: hkDutyDateParams.from,
          to: hkDutyDateParams.to,
        });
        if (!cancelled) setHkDutySessions(list);
      } catch (err) {
        if (!cancelled) {
          console.warn('HK duty sessions load:', err?.message);
          setHkDutySessions([]);
        }
      } finally {
        if (!cancelled) setHkDutySessionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    expandedId,
    token,
    hkDutyDateParams.from,
    hkDutyDateParams.to,
    hkDutyDateParams.valid,
    hkDutySessionsTick,
  ]);

  useEffect(() => {
    if (expandedId !== 'Workforce') return undefined;
    const hasOpen = hkDutySessions.some((s) => s.status === 'open');
    if (!hasOpen) return undefined;
    const id = setInterval(() => setHkDutySessionsTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, [expandedId, hkDutySessions]);

  useEffect(() => {
    if (!expandedId) return;
    const stillVisible = visibleDashboardSections.some((s) => s.id === expandedId);
    if (!stillVisible) setExpandedId(null);
  }, [expandedId, visibleDashboardSections]);

  useFocusEffect(
    useCallback(() => {
      const action = route.params?.settingsAction;
      if (!action) return;

      if (action === 'recordPatrol' && isModuleVisible('Security', user?.apiRole)) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId('Security');
        setRecordPatrolOpen(true);
      }

      navigation.setParams({ settingsAction: undefined });
    }, [route.params?.settingsAction, navigation, user?.apiRole]),
  );

  /** 'check-in' | 'check-out' — shared deployment-style form modal */
  const [securityDutyModal, setSecurityDutyModal] = useState(null);
  const [checkoutDutySessionId, setCheckoutDutySessionId] = useState(null);
  const [isSavingDuty, setIsSavingDuty] = useState(false);
  /** Guards checked in today — used for patrol staff picker until API refresh. */
  const [committedSecurityEntries, setCommittedSecurityEntries] = useState([]);

  const [recordStaffType, setRecordStaffType] = useState('Security');
  const [isSavingPatrol, setIsSavingPatrol] = useState(false);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    badgeNumber: '',
    role: 'SECURITY_GUARD',
    phone: '',
  });
  const [shopForm, setShopForm] = useState({
    unit: '',
    tenant: '',
    vendorName: '',
    contactNumber: '',
    address: '',
    agreementId: '',
    startDate: '',
    endDate: '',
    rent: '',
    agreementFile: '',
  });
  const [patrolForm, setPatrolForm] = useState({
    staffId: '',
    locationId: '',
    notes: '',
    photos: [],
  });
  const [patrolPickerOpen, setPatrolPickerOpen] = useState(false);
  const [trainerForm, setTrainerForm] = useState({
    trainerName: '',
    serviceType: '',
    contactNumber: '',
    fee: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    payer: '',
    category: '',
    amount: '',
    reference: '',
    billFile: '',
  });
  const [trainerUpdates, setTrainerUpdates] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [waterRecords, setWaterRecords] = useState([
    {
      id: 'water-001',
      date: '06/05/26',
      source: 'SwS water tanker',
      sourceType: 'tanker',
      vehicleNo: 'KA53JR1035',
      openingMeter: '074808',
      closingMeter: '074822',
      tds: '284',
      load: '02',
      tankLevelKl: '62',
      photos: [],
    },
  ]);
  const [waterVendors, setWaterVendors] = useState([
    {
      id: 'v-001',
      name: 'SwS water tanker',
      contactNumber: '9876543210',
      address: 'KR Puram, Bengaluru',
      vehicleNo: 'KA53JR1035',
    },
  ]);
  const [waterForm, setWaterForm] = useState({
    date: '06/05/26',
    source: 'SwS water tanker',
    sourceType: 'tanker',
    tankerVendorId: 'v-001',
    vehicleNo: '',
    openingMeter: '',
    closingMeter: '',
    tds: '',
    load: '',
    tankLevelKl: '',
    photos: [],
  });
  const [tankCapacityKl] = useState(120);
  const [waterFilter, setWaterFilter] = useState('today');
  const [waterCustomFrom, setWaterCustomFrom] = useState('');
  const [waterCustomTo, setWaterCustomTo] = useState('');
  const [waterSourceFilter, setWaterSourceFilter] = useState('all');
  const [waterTankerFilter, setWaterTankerFilter] = useState('all');
  const [waterVendorForm, setWaterVendorForm] = useState({
    name: '',
    contactNumber: '',
    address: '',
    vehicleNo: '',
  });
  const [expenseEntries, setExpenseEntries] = useState([
    { id: 'exp-001', date: '28/02/26', category: 'Electrical', amount: 74200, vendor: 'PowerGrid Services', note: 'Transformer panel maintenance' },
    { id: 'exp-002', date: '31/03/26', category: 'Mechanical', amount: 118500, vendor: 'LiftCore Engineers', note: 'Lift traction overhaul' },
    { id: 'exp-003', date: '30/04/26', category: 'AMC', amount: 189300, vendor: 'SafeGuard AMC', note: 'Fire systems annual contract' },
    { id: 'exp-004', date: '30/04/26', category: 'Staff Payments', amount: 389243, vendor: 'Payroll', note: 'Staff salary disbursal' },
  ]);
  const [expenseForm, setExpenseForm] = useState({
    date: '',
    category: 'Electrical',
    amount: '',
    vendor: '',
    note: '',
    billFile: '',
  });
  /** Expenses list: all | today | week | month | custom (same idea as workforce). */
  const [expenseTimePreset, setExpenseTimePreset] = useState('all');
  const [expenseDateRange, setExpenseDateRange] = useState({ from: '', to: '' });
  const [expenseTransactionsExpanded, setExpenseTransactionsExpanded] = useState(false);
  // staffCounts comes from useSecurityData hook (see above)
  const staffCounts = securityStaffCounts;
  const setStaffCounts = setSecurityStaffCounts;
  const securityRoleDisplayRows = useMemo(() => {
    return applyDeploymentEntriesToCounts(staffCounts, committedSecurityEntries, 'Security').filter(
      (c) => c.category === 'Security',
    );
  }, [staffCounts, committedSecurityEntries]);

  const {
    dashboard: hkDashboard,
    roleRows: hkApiRoleRows,
    periodLabel: hkPeriodLabel,
    isLoading: isHkLoading,
    error: hkFetchError,
    refresh: refreshHkData,
  } = useHousekeepingData({
    token,
    staffTimePreset,
    staffDateRange,
    enabled: expandedId === 'Workforce' && (permissions?.canSeeModule('Workforce') ?? true),
  });

  const hkRoleDisplayRows = useMemo(() => {
    if (committedHkEntries.length) return mergeHkDeploymentOverlay(hkApiRoleRows, committedHkEntries);
    return hkApiRoleRows;
  }, [hkApiRoleRows, committedHkEntries]);
  const [activeShift, setActiveShift] = useState(1); // 1 or 2
  const [fmHkExpanded, setFmHkExpanded] = useState(false);
  const [securityExpanded, setSecurityExpanded] = useState(false);
  const [staffAttendancePhoto, setStaffAttendancePhoto] = useState(null);
  const [deploymentForm, setDeploymentForm] = useState({
    designation: '',
    name: '',
    location: '',
  });
  const [deploymentPickerOpen, setDeploymentPickerOpen] = useState(null);
  /** 'designation' | 'location' | 'name' | null */
  const designationOptions = useMemo(
    () =>
      ADMIN_MANPOWER_DEPLOYMENT.filter((row) =>
        recordStaffType === 'FM_HK' || hkDutyModal != null
          ? row.category === 'FM_HK'
          : row.category === 'Security',
      ).map((row) => row.role),
    [recordStaffType, hkDutyModal],
  );

  const deploymentStaffNames = useMemo(() => {
    const names = (staffRoster || []).map((s) => s.name).filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [staffRoster]);

  const staffNameOptions = useMemo(() => {
    if (deploymentStaffNames.length > 0) return deploymentStaffNames;
    return DEPLOYMENT_STAFF_FALLBACK_NAMES;
  }, [deploymentStaffNames]);

  /** Staff checked in today — patrolling picker only. */
  const patrolStaffNameOptions = useMemo(() => {
    const names = committedSecurityEntries
      .map((e) => e.staffName?.trim())
      .filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [committedSecurityEntries]);

  const checkoutNameOptions = useMemo(() => {
    const names = dutySessions
      .filter((s) => s.status === 'open')
      .map((s) => s.staffName?.trim())
      .filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [dutySessions]);

  const hkCheckoutNameOptions = useMemo(() => {
    const names = hkDutySessions
      .filter((s) => s.status === 'open')
      .map((s) => s.staffName?.trim())
      .filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [hkDutySessions]);

  const deploymentPickerOptions = useMemo(() => {
    if (deploymentPickerOpen === 'designation') return designationOptions;
    if (deploymentPickerOpen === 'location') return DEPLOYMENT_LOCATION_OPTIONS;
    if (deploymentPickerOpen === 'name') {
      if (securityDutyModal === 'check-out') return checkoutNameOptions;
      if (hkDutyModal === 'check-out') return hkCheckoutNameOptions;
      return staffNameOptions;
    }
    return [];
  }, [
    deploymentPickerOpen,
    designationOptions,
    staffNameOptions,
    securityDutyModal,
    hkDutyModal,
    checkoutNameOptions,
    hkCheckoutNameOptions,
  ]);

  const activePickerField =
    securityDutyModal != null || hkDutyModal != null
      ? deploymentPickerOpen
      : recordPatrolOpen && patrolPickerOpen
        ? 'staff'
        : null;
  const activePickerOptions =
    recordPatrolOpen && patrolPickerOpen
      ? patrolStaffNameOptions
      : deploymentPickerOptions;

  // Mock history for 5 days
  const [attendanceHistory, setAttendanceHistory] = useState([
    { date: '2026-05-11', category: 'FM_HK', totalActual: 41, totalExpected: 44, penalty: 0 },
    { date: '2026-05-11', category: 'Security', totalActual: 18, totalExpected: 18, penalty: 0 },
    { date: '2026-05-10', category: 'FM_HK', totalActual: 40, totalExpected: 44, penalty: 1 },
    { date: '2026-05-10', category: 'Security', totalActual: 17, totalExpected: 18, penalty: 0 },
    { date: '2026-05-09', category: 'FM_HK', totalActual: 38, totalExpected: 44, penalty: 2 },
    { date: '2026-05-09', category: 'Security', totalActual: 18, totalExpected: 18, penalty: 0 },
  ]);

  const workforceFiltered = useMemo(() => {
    const now = new Date();
    let periodLabel = '';
    let historySlice = [];

    if (staffTimePreset === 'today') {
      periodLabel = `Today · ${shortenDateLabel(now)} ${now.getFullYear()}`;
      return { displayCounts: staffCounts, periodLabel };
    }

    if (staffTimePreset === 'week') {
      const wm = startOfWeekMonday(now);
      const ws = endOfWeekSunday(wm);
      const fromIso = toYMD(wm);
      const toIso = toYMD(ws);
      periodLabel = `This week · ${shortenDateLabel(wm)} – ${shortenDateLabel(ws)}`;
      historySlice = attendanceHistory.filter(
        (h) => h.date >= fromIso && h.date <= toIso
      );
    } else if (staffTimePreset === 'month') {
      const y = now.getFullYear();
      const m = pad2(now.getMonth() + 1);
      const pref = `${y}-${m}`;
      historySlice = attendanceHistory.filter((h) => h.date.startsWith(pref));
      periodLabel = `This month · ${now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
    } else {
      const df = parseDMYInput(staffDateRange.from);
      const dt = parseDMYInput(staffDateRange.to);
      if (df && dt && dt >= df) {
        const fromIso = toYMD(df);
        const toIso = toYMD(dt);
        periodLabel = `Custom · ${shortenDateLabel(df)} – ${shortenDateLabel(dt)} ${dt.getFullYear()}`;
        historySlice = attendanceHistory.filter(
          (h) => h.date >= fromIso && h.date <= toIso
        );
      } else {
        periodLabel =
          df || dt ? 'Custom · enter From and To (DD/MM/YYYY)' : 'Custom · Set date range';
        historySlice = [];
      }
    }

    if (!historySlice.length && staffTimePreset !== 'today') {
      return {
        displayCounts: staffCounts,
        periodLabel: `${periodLabel} · Showing live snapshot`,
      };
    }

    const fmRatio = avgCategoryRatio(historySlice, 'FM_HK');
    const secRatio = avgCategoryRatio(historySlice, 'Security');
    const displayCounts = applyCategoryRatios(staffCounts, fmRatio, secRatio);
    return { displayCounts, periodLabel };
  }, [staffTimePreset, staffDateRange.from, staffDateRange.to, staffCounts, attendanceHistory]);

  const parseDateSafe = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const daysUntil = (value) => {
    const d = parseDateSafe(value);
    if (!d) return null;
    const now = new Date();
    const ms = d.setHours(0, 0, 0, 0) - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const reminderRows = commercialUnits
    .map((item) => {
      const dLeft = daysUntil(item.endDate);
      const within30Days = typeof dLeft === 'number' && dLeft >= 0 && dLeft <= 30;
      const renewalPending = item.status === 'Renewal Due' || item.status === 'Draft';
      return { ...item, dLeft, within30Days, renewalPending };
    })
    .filter((item) => item.within30Days || item.renewalPending);

  const openWorkspace = useCallback(
    (section) => {
      if (section.stackScreen) navigation.navigate(section.stackScreen);
    },
    [navigation]
  );

  const toggle = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((cur) => {
      const next = cur === id ? null : id;
      if (next !== 'rentals') {
        setDuesTipOpen(false);
        setAgreementsOpen(false);
      }
      return next;
    });
  };

  const billingCats = ADMIN_RENTALS_CATEGORY_PROGRESS.filter((c) => c.mode === 'billing');
  const amountCats = ADMIN_RENTALS_CATEGORY_PROGRESS.filter((c) => c.mode === 'amount');

  const amcStats = useMemo(() => {
    const norm = (s) => String(s || '').toLowerCase();
    return {
      active: amcContracts.filter((c) => norm(c.status) === 'active').length,
      dueSoon: amcContracts.filter((c) => norm(c.status).includes('renewal') || norm(c.status).includes('due')).length,
      critical: amcContracts.filter((c) => norm(c.status).includes('critical')).length,
    };
  }, [amcContracts]);

  const displayedAmcContracts = useMemo(() => {
    if (!amcRenewalsOnly) return amcContracts;
    return amcContracts.filter((c) => {
      const s = String(c.status || '').toLowerCase();
      return s.includes('renewal') || s.includes('critical') || s.includes('due');
    });
  }, [amcContracts, amcRenewalsOnly]);

  const waterMetrics = useMemo(
    () =>
      computeWaterDashboard({
        waterRecords,
        waterFilter,
        waterCustomFrom,
        waterCustomTo,
        waterSourceFilter,
        waterTankerFilter,
        tankCapacityKl,
      }),
    [
      waterRecords,
      waterFilter,
      waterCustomFrom,
      waterCustomTo,
      waterSourceFilter,
      waterTankerFilter,
      tankCapacityKl,
    ],
  );

  const addShop = () => {
    setAddShopOpen(true);
  };

  const updateForm = (key, value) => {
    setShopForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickAgreement = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length) {
      updateForm('agreementFile', result.assets[0].name || 'agreement-file');
    }
  };

  const pickAmcDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length) {
      setAmcContractForm((p) => ({
        ...p,
        documentFile: result.assets[0].name || 'contract-file',
      }));
    }
  };

  const pickComplianceCertificate = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length) {
      const name = result.assets[0].name || 'certificate';
      setComplianceForm((p) => ({ ...p, certificateFile: name }));
      setCertificateForm((p) => ({ ...p, certificateFile: name }));
    }
  };

  const inferAmcStatus = (dueIn) => {
    const match = String(dueIn || '').match(/(\d+)/);
    const days = match ? Number(match[1]) : 999;
    if (days <= 14) return 'Critical';
    if (days <= 30) return 'Renewal due';
    return 'Active';
  };

  const saveAmcContract = () => {
    if (!amcContractForm.label.trim() || !amcContractForm.vendor.trim()) {
      Alert.alert('Missing details', 'Enter asset name and vendor.');
      return;
    }
    const dueIn = amcContractForm.dueIn.trim() || '30 days';
    setAmcContracts((cur) => [
      ...cur,
      {
        id: `amc-${Date.now()}`,
        label: amcContractForm.label.trim(),
        vendor: amcContractForm.vendor.trim(),
        category: amcContractForm.category.trim() || 'General',
        dueIn,
        status: inferAmcStatus(dueIn),
        annualValue: amcContractForm.annualValue,
        documentFile: amcContractForm.documentFile,
      },
    ]);
    setAmcContractForm({
      label: '',
      vendor: '',
      category: '',
      dueIn: '',
      annualValue: '',
      documentFile: '',
    });
    setAddAmcOpen(false);
    Alert.alert('Saved', 'AMC contract added.');
  };

  const saveComplianceEntry = () => {
    if (!complianceForm.label.trim()) {
      Alert.alert('Missing details', 'Enter a compliance item name.');
      return;
    }
    const dueIn = complianceForm.dueIn.trim() || '—';
    const status = inferAmcStatus(dueIn);
    setComplianceItems((cur) => [
      ...cur,
      {
        id: `cmp-${Date.now()}`,
        label: complianceForm.label.trim(),
        dueIn,
        status: status === 'Active' ? 'Compliant' : status,
        authority: complianceForm.authority.trim(),
        notes: complianceForm.notes.trim(),
        certificateFile: complianceForm.certificateFile,
      },
    ]);
    setComplianceForm({
      label: '',
      authority: '',
      dueIn: '',
      notes: '',
      certificateFile: '',
    });
    setLogComplianceOpen(false);
    Alert.alert('Saved', 'Compliance entry logged.');
  };

  const saveAmcCertificate = () => {
    if (!certificateForm.label.trim() && !certificateForm.certificateFile) {
      Alert.alert('Missing file', 'Select a certificate file to upload.');
      return;
    }
    setComplianceItems((cur) => [
      ...cur,
      {
        id: `cert-${Date.now()}`,
        label: certificateForm.label.trim() || 'Certificate upload',
        dueIn: 'On file',
        status: 'Compliant',
        certificateFile: certificateForm.certificateFile,
      },
    ]);
    setCertificateForm({ label: '', certificateFile: '' });
    setAmcCertificateOpen(false);
    Alert.alert('Saved', 'Certificate attached to register.');
  };

  const saveShop = () => {
    if (!shopForm.unit.trim()) return;
    const nextIndex = commercialUnits.length + 1;
    setCommercialUnits((cur) => [
      ...cur,
      {
        id: `cu-new-${nextIndex}`,
        unit: shopForm.unit.trim(),
        tenant: shopForm.tenant.trim() || 'Assign tenant',
        vendorName: shopForm.vendorName.trim(),
        contactNumber: shopForm.contactNumber.trim(),
        address: shopForm.address.trim(),
        agreementId: shopForm.agreementId.trim() || `AGR-DRAFT-${1200 + nextIndex}`,
        startDate: shopForm.startDate.trim() || 'Pending',
        endDate: shopForm.endDate.trim() || 'Pending',
        rent: Number(shopForm.rent || 0),
        status: 'Draft',
        agreementFile: shopForm.agreementFile || '',
      },
    ]);
    setShopForm({
      unit: '',
      tenant: '',
      vendorName: '',
      contactNumber: '',
      address: '',
      agreementId: '',
      startDate: '',
      endDate: '',
      rent: '',
      agreementFile: '',
    });
    setAddShopOpen(false);
    setAgreementsOpen(true);
  };

  const saveTrainer = () => {
    if (!trainerForm.trainerName.trim()) return;
    setTrainerUpdates((cur) => [
      {
        id: `trainer-${Date.now()}`,
        trainerName: trainerForm.trainerName.trim(),
        serviceType: trainerForm.serviceType.trim() || 'General training',
        contactNumber: trainerForm.contactNumber.trim() || 'N/A',
        fee: Number(trainerForm.fee || 0),
      },
      ...cur,
    ]);
    setTrainerForm({ trainerName: '', serviceType: '', contactNumber: '', fee: '' });
    setAddTrainerOpen(false);
  };

  const savePayment = () => {
    if (!paymentForm.amount.trim()) return;
    setRecentPayments((cur) => [
      {
        id: `pay-${Date.now()}`,
        payer: paymentForm.payer.trim() || 'Unknown',
        category: paymentForm.category.trim() || 'General',
        amount: Number(paymentForm.amount || 0),
        reference: paymentForm.reference.trim() || '-',
        billFile: paymentForm.billFile || '',
      },
      ...cur,
    ]);
    setPaymentForm({ payer: '', category: '', amount: '', reference: '', billFile: '' });
    setRecordPaymentOpen(false);
  };

  const pickWaterPhotos = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length) {
      setWaterForm((prev) => ({
        ...prev,
        photos: [...prev.photos, ...result.assets.map((a) => a.name || 'photo')],
      }));
    }
  };

  const saveWaterInput = () => {
    if (!waterForm.date.trim()) return;
    if (waterForm.sourceType === 'tanker' && !waterForm.vehicleNo.trim()) return;
    setWaterRecords((cur) => [
      {
        id: `water-${Date.now()}`,
        date: waterForm.date.trim(),
        source: waterForm.source.trim() || (waterForm.sourceType === 'kaveri' ? 'Kaveri water' : 'Tanker'),
        sourceType: waterForm.sourceType || 'tanker',
        vehicleNo: waterForm.vehicleNo.trim(),
        openingMeter: waterForm.openingMeter.trim() || '0',
        closingMeter: waterForm.closingMeter.trim() || '0',
        tds: waterForm.tds.trim() || '-',
        load: waterForm.load.trim() || '1',
        tankLevelKl: waterForm.tankLevelKl.trim() || '',
        photos: waterForm.photos,
      },
      ...cur,
    ]);
    setWaterForm({
      date: '',
      source: 'SwS water tanker',
      sourceType: 'tanker',
      tankerVendorId: waterVendors[0]?.id || '',
      vehicleNo: '',
      openingMeter: '',
      closingMeter: '',
      tds: '',
      load: '',
      tankLevelKl: '',
      photos: [],
    });
    setRecordWaterOpen(false);
  };

  const saveWaterVendor = () => {
    if (!waterVendorForm.name.trim() || !waterVendorForm.vehicleNo.trim()) return;
    const nextId = `v-${Date.now()}`;
    const nextVendor = {
      id: nextId,
      name: waterVendorForm.name.trim(),
      contactNumber: waterVendorForm.contactNumber.trim() || 'N/A',
      address: waterVendorForm.address.trim() || 'N/A',
      vehicleNo: waterVendorForm.vehicleNo.trim(),
    };
    setWaterVendors((cur) => [nextVendor, ...cur]);
    setWaterForm((prev) => ({
      ...prev,
      tankerVendorId: nextId,
      source: nextVendor.name,
      sourceType: 'tanker',
      vehicleNo: nextVendor.vehicleNo,
    }));
    setWaterVendorForm({ name: '', contactNumber: '', address: '', vehicleNo: '' });
    setWaterVendorOpen(false);
  };

  const parseDMY = (value) => {
    if (!value || typeof value !== 'string') return null;
    const parts = value.split('/');
    if (parts.length !== 3) return null;
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);
    if (!day || !month || Number.isNaN(year)) return null;
    const fullYear = year < 100 ? 2000 + year : year;
    const dt = new Date(fullYear, month - 1, day);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  };

  const expenseFiltered = useMemo(() => {
    const normalized = expenseEntries
      .map((row) => ({ ...row, _d: parseDMY(row.date) }))
      .filter((row) => row._d);
    const now = new Date();
    const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const eod = (d) => {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      x.setHours(23, 59, 59, 999);
      return x;
    };

    let periodLabel = 'All time';
    let rows = normalized;

    if (expenseTimePreset === 'all') {
      periodLabel = 'All time';
      rows = normalized;
    } else if (expenseTimePreset === 'today') {
      const t = sod(now);
      periodLabel = `Today · ${shortenDateLabel(now)} ${now.getFullYear()}`;
      rows = normalized.filter((r) => sod(r._d).getTime() === t.getTime());
    } else if (expenseTimePreset === 'week') {
      const wm = startOfWeekMonday(now);
      const ws = endOfWeekSunday(wm);
      periodLabel = `This week · ${shortenDateLabel(wm)} – ${shortenDateLabel(ws)}`;
      rows = normalized.filter((r) => r._d >= sod(wm) && r._d <= eod(ws));
    } else if (expenseTimePreset === 'month') {
      const y = now.getFullYear();
      const m = now.getMonth();
      periodLabel = `This month · ${now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
      rows = normalized.filter((r) => r._d.getFullYear() === y && r._d.getMonth() === m);
    } else {
      const df = parseDMYInput(expenseDateRange.from);
      const dt = parseDMYInput(expenseDateRange.to);
      if (df && dt && dt >= df) {
        periodLabel = `Custom · ${shortenDateLabel(df)} – ${shortenDateLabel(dt)} ${dt.getFullYear()}`;
        rows = normalized.filter((r) => r._d >= sod(df) && r._d <= eod(dt));
      } else {
        periodLabel =
          df || dt ? 'Custom · enter From and To (DD/MM/YYYY)' : 'Custom · set date range';
        rows = normalized;
      }
    }

    return { rows, periodLabel };
  }, [expenseEntries, expenseTimePreset, expenseDateRange.from, expenseDateRange.to]);

  const expenseByCategory = useMemo(() => {
    const { rows: filtered } = expenseFiltered;
    return ['Electrical', 'Mechanical', 'AMC', 'Staff Payments'].map((cat) => ({
      category: cat,
      amount: filtered.filter((row) => row.category === cat).reduce((sum, row) => sum + row.amount, 0),
    }));
  }, [expenseFiltered]);

  const saveExpense = () => {
    if (!expenseForm.date.trim() || !expenseForm.amount.trim()) return;
    setExpenseEntries((cur) => [
      {
        id: `exp-${Date.now()}`,
        date: expenseForm.date.trim(),
        category: expenseForm.category,
        amount: Number(expenseForm.amount || 0),
        vendor: expenseForm.vendor.trim() || 'N/A',
        note: expenseForm.note.trim() || '-',
        billFile: expenseForm.billFile,
      },
      ...cur,
    ]);
    setExpenseForm({ date: '', category: 'Electrical', amount: '', vendor: '', note: '', billFile: '' });
    setRecordExpenseOpen(false);
  };

  const pickExpenseBill = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length) {
      setExpenseForm((p) => ({ ...p, billFile: result.assets[0].name || 'bill-file' }));
    }
  };

  const pickPaymentBill = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length) {
      setPaymentForm((p) => ({ ...p, billFile: result.assets[0].name || 'bill-file' }));
    }
  };

  const resolvePatrolStaffName = (selectedName) => {
    const needle = selectedName.trim().toLowerCase();
    if (!needle) return '';
    const rosterMatch = (staffRoster || []).find(
      (s) => s.name?.trim().toLowerCase() === needle,
    );
    return rosterMatch?.name?.trim() || selectedName.trim();
  };

  const hasPatrolPhoto = (photo) => Boolean(photo?.uri || photo?.file);

  const savePatrol = async () => {
    const staffName = resolvePatrolStaffName(patrolForm.staffId || '');
    if (!staffName) {
      Alert.alert('Staff required', 'Select a security guard deployed via Add Security.');
      return;
    }
    const ph = patrolForm.photos?.[0];
    if (!hasPatrolPhoto(ph)) {
      Alert.alert('Photo required', 'Capture a patrol photo with the camera or gallery.');
      return;
    }

    const accessToken = (await ensureValidAccessToken()) || token;
    if (!accessToken) {
      Alert.alert('Not signed in', 'Please sign in again to save patrol logs.');
      return;
    }

    setIsSavingPatrol(true);
    try {
      await postMobilePatrol(accessToken, {
        staffName,
        locationName: patrolForm.locationId?.trim() || null,
        remarks: patrolForm.notes?.trim() || null,
        latitude: ph.latitude ?? null,
        longitude: ph.longitude ?? null,
        patrolTime: ph.capturedAt ? new Date(ph.capturedAt).toISOString() : new Date().toISOString(),
        photo: ph,
      });
      Alert.alert('Success', 'Patrol log saved with photo.');
      setRecordPatrolOpen(false);
      setPatrolPickerOpen(false);
      setPatrolForm({ staffId: '', locationId: '', notes: '', photos: [] });
      refreshSecurityData();
    } catch (err) {
      console.error('Save patrol failed:', err);
      Alert.alert('Error', err?.message || 'Could not save patrol log');
    } finally {
      setIsSavingPatrol(false);
    }
  };

  const renderRentalsDetails = () => (
    <RentalsModulePanel
      billingCats={billingCats}
      amountCats={amountCats}
      collectionsSummary={ADMIN_COLLECTIONS_VS_EXPECTED}
      pendingDues={ADMIN_PENDING_DUES_BY_CATEGORY}
      commercialUnits={commercialUnits}
      agreementsOpen={agreementsOpen}
      onToggleAgreements={() => setAgreementsOpen((open) => !open)}
      reminderRows={reminderRows}
      trainerUpdates={trainerUpdates}
      recentPayments={recentPayments}
      duesTipOpen={duesTipOpen}
      onToggleDuesTip={() => setDuesTipOpen((o) => !o)}
      onAddShop={addShop}
      onAddTrainer={() => setAddTrainerOpen(true)}
      onRecordPayment={() => setRecordPaymentOpen(true)}
    />
  );

  const modulePreviewMeta = (section) => {
    if (section.id === 'WaterTracking') {
      return { hint: 'Reservoirs, meters & usage trends', icon: 'analytics-outline' };
    }
    if (section.id === 'Workforce') {
      return { hint: 'Check in/out · hours on site · roster', icon: 'clipboard-outline' };
    }
    if (section.id === 'Expenses') {
      return { hint: 'AMC, utilities & society spend', icon: 'pie-chart-outline' };
    }
    return { hint: '', icon: 'apps-outline' };
  };

  const renderModulePreview = (section) => {
    const { hint, icon } = modulePreviewMeta(section);
    return (
      <View style={[styles.previewStrip, { borderLeftColor: section.color }]}>
        <Ionicons name={icon} size={18} color={section.color} style={styles.previewStripIcon} />
        <Text style={styles.previewStripText}>{hint}</Text>
      </View>
    );
  };

  const renderAmcDetails = () => (
    <AmcModulePanel
      contracts={displayedAmcContracts}
      complianceItems={complianceItems}
      stats={amcStats}
      onAddContract={() => setAddAmcOpen(true)}
      onLogCompliance={() => setLogComplianceOpen(true)}
      onViewRenewals={() => setAmcRenewalsOnly((v) => !v)}
      renewalsFilterActive={amcRenewalsOnly}
      onUploadCertificate={() => setAmcCertificateOpen(true)}
    />
  );

  const renderWaterDetails = () => (
    <WaterModulePanel
      metrics={waterMetrics}
      waterFilter={waterFilter}
      onWaterFilterChange={setWaterFilter}
      waterCustomFrom={waterCustomFrom}
      waterCustomTo={waterCustomTo}
      onWaterCustomFromChange={setWaterCustomFrom}
      onWaterCustomToChange={setWaterCustomTo}
      waterSourceFilter={waterSourceFilter}
      onWaterSourceFilterChange={setWaterSourceFilter}
      waterTankerFilter={waterTankerFilter}
      onWaterTankerFilterChange={setWaterTankerFilter}
      onRecordInput={() => setRecordWaterOpen(true)}
      onAddVendor={() => setWaterVendorOpen(true)}
    />
  );

  const renderPromotionsDetails = () => (
    <View style={styles.detailsInner}>
      <Text style={styles.expandKicker}>{ADMIN_PROMOTIONS_SNAPSHOT.headline}</Text>
      <View style={styles.statRow}>
        <View style={[styles.statCell, { borderLeftColor: '#D97706' }]}>
          <Text style={styles.statValue}>{ADMIN_PROMOTIONS_SNAPSHOT.activeCampaigns}</Text>
          <Text style={styles.statLabel}>Active campaigns</Text>
        </View>
        <View style={[styles.statCell, { borderLeftColor: '#F59E0B' }]}>
          <Text style={styles.statValue}>{ADMIN_PROMOTIONS_SNAPSHOT.responses}</Text>
          <Text style={styles.statLabel}>Responses</Text>
        </View>
      </View>
      <View style={styles.expandFootNote}>
        <Ionicons name="navigate-outline" size={16} color={COLORS.textSecondary} />
        <Text style={styles.expandFootNoteText}>
          {ADMIN_PROMOTIONS_SNAPSHOT.reachLabel}: {ADMIN_PROMOTIONS_SNAPSHOT.reachValue}
        </Text>
      </View>
    </View>
  );

  const renderMyGateDetails = () => (
    <View style={styles.detailsInner}>
      <Text style={styles.expandKicker}>{ADMIN_MYGATE_SNAPSHOT.headline}</Text>
      <View style={styles.statRow}>
        <View style={[styles.statCell, { borderLeftColor: '#0284C7' }]}>
          <Text style={styles.statValue}>{ADMIN_MYGATE_SNAPSHOT.openTickets}</Text>
          <Text style={styles.statLabel}>Open tickets</Text>
        </View>
        <View style={[styles.statCell, { borderLeftColor: COLORS.success }]}>
          <Text style={styles.statValue}>{ADMIN_MYGATE_SNAPSHOT.resolvedWeek}</Text>
          <Text style={styles.statLabel}>Resolved (7d)</Text>
        </View>
      </View>
      <View style={styles.expandFootNote}>
        <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
        <Text style={styles.expandFootNoteText}>
          {ADMIN_MYGATE_SNAPSHOT.avgResponseLabel}: {ADMIN_MYGATE_SNAPSHOT.avgResponseValue}
        </Text>
      </View>
    </View>
  );

  const HK_DATE_PRESETS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This week' },
    { key: 'month', label: 'This month' },
    { key: 'custom', label: 'Custom' },
  ];

  const renderCollapsedDutyQuickActions = (onCheckIn, onCheckOut) => (
    <View style={styles.collapsedDutyWrap}>
      <TouchableOpacity
        style={[styles.hubBtn, styles.hubBtnDuty, styles.collapsedDutyBtn]}
        onPress={onCheckIn}
        activeOpacity={0.85}
      >
        <Ionicons name="log-in-outline" size={16} color="#93C5FD" />
        <Text style={styles.hubBtnTextDuty}>Check in</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.hubBtn, styles.hubBtnDutyOut, styles.collapsedDutyBtn]}
        onPress={onCheckOut}
        activeOpacity={0.85}
      >
        <Ionicons name="log-out-outline" size={16} color="#FCA5A5" />
        <Text style={styles.hubBtnTextDutyOut}>Check out</Text>
      </TouchableOpacity>
    </View>
  );

  const renderWorkforceDetails = () => {
    const fmHkStaff = hkRoleDisplayRows;
    const hkOverlay = committedHkEntries;

    const dailyTotal =
      hkDashboard?.totalDeployed ??
      fmHkStaff.reduce((s, c) => s + c.actualS1 + c.actualS2, 0);
    const dailyExpected =
      hkDashboard?.totalRequired ??
      fmHkStaff.reduce((s, c) => s + c.expected * 2, 0);
    const dailyShortage =
      hkDashboard?.totalShortage ?? Math.max(0, dailyExpected - dailyTotal);
    const headcountOk = dailyShortage === 0 && dailyExpected > 0;

    const wages = Number(hkDashboard?.estimatedWages ?? 0);
    const hkBillHeadline = wages > 0 ? formatINR(wages) : '---';

    const hkDateLabel =
      HK_DATE_PRESETS.find((o) => o.key === staffTimePreset)?.label ?? 'Today';

    return (
      <View style={styles.securityExpandedShell}>
        <View style={styles.premiumSecurityCard}>
          <LinearGradient
            colors={SEC.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.securityPremiumHeader}
          >
            <View style={styles.securityHeaderContent}>
              <View style={styles.securityHeaderLeft}>
                <Text style={styles.securityPremiumTitle}>Housekeeping</Text>
                <TouchableOpacity
                  style={styles.hkFullScreenDutyLink}
                  onPress={() => navigation.navigate('HkDuty')}
                  hitSlop={8}
                >
                  <Ionicons name="expand-outline" size={16} color={SEC.gold} />
                  <Text style={styles.hkFullScreenDutyLinkText}>Full screen</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.securityHeaderRight}>
                <TouchableOpacity
                  style={[
                    styles.securityPremiumDropdown,
                    showHkDateMenu && styles.securityPremiumDropdownActive,
                  ]}
                  onPress={() => setShowHkDateMenu(!showHkDateMenu)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={15} color={SEC.gold} />
                  <Text style={styles.securityPremiumDateText}>{hkDateLabel}</Text>
                  <Ionicons
                    name={showHkDateMenu ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={SEC.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {showHkDateMenu ? (
            <View style={styles.premiumDropdownMenu}>
              {HK_DATE_PRESETS.map(({ key, label }) => {
                const active = staffTimePreset === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.premiumDropdownOption, active && styles.premiumDropdownOptionActive]}
                    onPress={() => {
                      setStaffTimePreset(key);
                      setShowHkDateMenu(false);
                    }}
                  >
                    <Text style={[styles.premiumOptionText, active && styles.premiumOptionTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <View style={styles.securityBody}>
            {staffTimePreset === 'custom' ? (
              <View style={styles.premiumCustomRangeRow}>
                <TextInput
                  style={styles.premiumRangeInput}
                  placeholder="From (DD/MM/YYYY)"
                  placeholderTextColor={SEC.textDim}
                  value={staffDateRange.from}
                  onChangeText={(t) => setStaffDateRange((p) => ({ ...p, from: t }))}
                />
                <TextInput
                  style={styles.premiumRangeInput}
                  placeholder="To (DD/MM/YYYY)"
                  placeholderTextColor={SEC.textDim}
                  value={staffDateRange.to}
                  onChangeText={(t) => setStaffDateRange((p) => ({ ...p, to: t }))}
                />
              </View>
            ) : null}

            <View style={styles.securityStatsGrid}>
              {isHkLoading ? (
                <ActivityIndicator size="small" color={SEC.teal} style={styles.securityLoader} />
              ) : (
                <>
                  <View style={styles.securityStatItem}>
                    <View style={styles.securityStatValueRow}>
                      <Text
                        style={[
                          styles.securityStatMainVal,
                          headcountOk ? styles.securityValPositive : styles.securityValNegative,
                        ]}
                      >
                        {dailyTotal}/{dailyExpected}
                      </Text>
                      <View
                        style={[
                          styles.miniBadge,
                          headcountOk ? styles.miniBadgeSuccess : styles.miniBadgeError,
                        ]}
                      >
                        <Text
                          style={[
                            styles.miniBadgeText,
                            headcountOk ? styles.miniBadgeTextSuccess : styles.miniBadgeTextError,
                          ]}
                        >
                          {headcountOk ? 'OK' : dailyExpected > 0 ? `-${dailyShortage}` : '—'}
                        </Text>
                      </View>
                    </View>
                    {hkPeriodLabel ? (
                      <Text style={styles.securityBillFootnote} numberOfLines={2}>
                        {hkPeriodLabel}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.securityStatDivider} />
                  <View style={styles.securityStatItem}>
                    <View style={styles.securityStatValueRow}>
                      <Text style={[styles.securityStatMainVal, styles.securityValBill]}>
                        {hkBillHeadline}
                      </Text>
                    </View>
                    <Text style={styles.securityBillFootnote}>Shift-based estimate</Text>
                  </View>
                </>
              )}
            </View>
            {hkFetchError && !isHkLoading ? (
              <Text style={styles.securityEmptyRoles}>{hkFetchError}</Text>
            ) : null}

            <View style={styles.hubActionRow}>
              <TouchableOpacity
                style={[styles.hubBtn, styles.hubBtnDuty]}
                onPress={() => openHkDutyModal('check-in')}
              >
                <Ionicons name="log-in-outline" size={16} color="#93C5FD" />
                <Text style={styles.hubBtnTextDuty}>Check in</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.hubBtn, styles.hubBtnDutyOut]}
                onPress={() => openHkDutyModal('check-out')}
              >
                <Ionicons name="log-out-outline" size={16} color="#FCA5A5" />
                <Text style={styles.hubBtnTextDutyOut}>Check out</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dutyAttendanceSection}>
              <Text style={styles.dutyAttendanceHeading}>Hours on site (check-in → check-out)</Text>
              {hkDutySessionsLoading ? (
                <ActivityIndicator size="small" color={SEC.teal} style={styles.securityLoader} />
              ) : hkDutySessions.length === 0 ? (
                <Text style={styles.dutyAttendanceEmpty}>
                  No check-in records for {hkDutyDateParams.label || 'this period'}.
                </Text>
              ) : (
                <>
                  {hkDutyHoursByStaff.length > 0 ? (
                    <View style={styles.dutyTotalsRow}>
                      {hkDutyHoursByStaff.map((row) => (
                        <View key={row.staffName} style={styles.dutyTotalChip}>
                          <Text style={styles.dutyTotalName} numberOfLines={1}>
                            {row.staffName}
                          </Text>
                          <Text style={styles.dutyTotalHours}>{row.label}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {hkDutySessions.map((session) => (
                    <View
                      key={session.id}
                      style={[
                        styles.dutySessionRow,
                        session.status === 'open' && styles.dutySessionRowOpen,
                      ]}
                    >
                      <View style={styles.dutySessionMain}>
                        <Text style={styles.dutySessionName} numberOfLines={1}>
                          {session.staffName}
                        </Text>
                        <Text style={styles.dutySessionLoc} numberOfLines={1}>
                          {session.locationName}
                          {session.entryShiftDisplay ? ` · ${session.entryShiftDisplay}` : ''}
                        </Text>
                        <Text style={styles.dutySessionTimes} numberOfLines={2}>
                          In {formatDutyTime(session.entryAt)}
                          {session.exitAt
                            ? ` · Out ${formatDutyTime(session.exitAt)}`
                            : ' · Still on duty'}
                        </Text>
                      </View>
                      <View style={styles.dutySessionHoursWrap}>
                        <Text
                          style={[
                            styles.dutySessionHours,
                            session.status === 'open' && styles.dutySessionHoursOpen,
                          ]}
                        >
                          {displayHkDutyDuration(session)}
                        </Text>
                        {session.durationHours != null && session.status !== 'open' ? (
                          <Text style={styles.dutySessionHoursSub}>
                            {session.durationHours}h total
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>

            <View style={styles.premiumRolesList}>
              {fmHkStaff.length === 0 ? (
                <Text style={styles.securityEmptyRoles}>No housekeeping contract roles configured.</Text>
              ) : null}
              {fmHkStaff.map((item) => {
                const s1Short = item.actualS1 < item.expected;
                const s2Short = item.actualS2 < item.expected;
                const roleOk = !s1Short && !s2Short;
                const queuedForRole = hkOverlay.filter(
                  (e) => normalizeRoleKey(e.designation) === normalizeRoleKey(item.role),
                ).length;
                return (
                  <View
                    key={item.id}
                    style={[styles.premiumRoleRow, queuedForRole > 0 && styles.premiumRoleRowQueued]}
                  >
                    <Text style={styles.roleNameCompact} numberOfLines={1}>
                      {item.role}
                      {queuedForRole > 0 ? (
                        <Text style={styles.roleQueuedBadge}> +{queuedForRole}</Text>
                      ) : null}
                    </Text>
                    <View style={styles.roleCountGroup}>
                      <View style={[styles.shiftPill, s1Short && styles.shiftPillWarn]}>
                        <Text style={styles.shiftPillLabel}>S1</Text>
                        <Text style={[styles.shiftPillVal, s1Short && styles.shiftValError]}>
                          {item.actualS1}/{item.expected}
                        </Text>
                      </View>
                      <View style={[styles.shiftPill, s2Short && styles.shiftPillWarn]}>
                        <Text style={styles.shiftPillLabel}>S2</Text>
                        <Text style={[styles.shiftPillVal, s2Short && styles.shiftValError]}>
                          {item.actualS2}/{item.expected}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.roleStatusDot,
                          roleOk ? styles.roleStatusOk : styles.roleStatusWarn,
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderSecurityDetails = () => {
    const securityStaff = securityRoleDisplayRows;

    const dailyTotal =
      securityDashboard?.totalDeployed ??
      securityStaff.reduce((s, c) => s + c.actualS1 + c.actualS2, 0);
    const dailyExpected =
      securityDashboard?.totalRequired ??
      securityStaff.reduce((s, c) => s + c.expected * 2, 0);
    const dailyShortage =
      securityDashboard?.totalShortage ?? Math.max(0, dailyExpected - dailyTotal);

    const shiftBillEst = estimateSecurityBillFromShifts(
      securityStaff,
      securityRoleRates,
      sanctionedStrength,
    );
    const contractBillBroken = Boolean(
      securityBilling?.message &&
        (String(securityBilling.message).includes('42703') ||
          String(securityBilling.message).includes('Could not load vendor contract'))
    );
    const apiGrand = Number(securityBilling?.grandTotal ?? securityBilling?.GrandTotal);
    const periodWages = Number(securityDashboard?.estimatedWages ?? 0);
    const useOfficialBill =
      securityDateRange === 'Last 1 Month' &&
      !contractBillBroken &&
      securityBilling != null &&
      !Number.isNaN(apiGrand) &&
      apiGrand > 0;
    const displayBillAmount = useOfficialBill
      ? apiGrand
      : periodWages > 0
        ? periodWages
        : shiftBillEst.total;
    const billHeadline = displayBillAmount > 0 ? formatINR(displayBillAmount) : '---';
    const billFootnoteHint =
      !useOfficialBill &&
      displayBillAmount <= 0 &&
      securityBilling?.message &&
      !contractBillBroken
        ? String(securityBilling.message).slice(0, 80)
        : null;

    const headcountOk = dailyShortage === 0 && dailyExpected > 0;

    return (
      <View style={styles.securityExpandedShell}>
        <View style={styles.premiumSecurityCard}>
          <LinearGradient
            colors={SEC.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.securityPremiumHeader}
          >
            <View style={styles.securityHeaderContent}>
              <View style={styles.securityHeaderLeft}>
                <Text style={styles.securityPremiumTitle}>Deployment</Text>
              </View>
              <View style={styles.securityHeaderRight}>
                <TouchableOpacity
                  style={[
                    styles.securityPremiumDropdown,
                    showSecurityDateMenu && styles.securityPremiumDropdownActive,
                  ]}
                  onPress={() => setShowSecurityDateMenu(!showSecurityDateMenu)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={15} color={SEC.gold} />
                  <Text style={styles.securityPremiumDateText}>{securityDateRange}</Text>
                  <Ionicons
                    name={showSecurityDateMenu ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={SEC.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {showSecurityDateMenu ? (
            <View style={styles.premiumDropdownMenu}>
              {['Today', 'Last 1 Week', 'Last 1 Month', 'Custom Range'].map((opt) => {
                const active = securityDateRange === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.premiumDropdownOption, active && styles.premiumDropdownOptionActive]}
                    onPress={() => {
                      setSecurityDateRange(opt);
                      setShowSecurityDateMenu(false);
                    }}
                  >
                    <Text style={[styles.premiumOptionText, active && styles.premiumOptionTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <View style={styles.securityBody}>
            {securityDateRange === 'Custom Range' ? (
              <View style={styles.premiumCustomRangeRow}>
                <TextInput
                  style={styles.premiumRangeInput}
                  placeholder="From (DD/MM/YYYY)"
                  placeholderTextColor={SEC.textDim}
                  value={customRange.from}
                  onChangeText={(v) => setCustomRange((p) => ({ ...p, from: v }))}
                />
                <TextInput
                  style={styles.premiumRangeInput}
                  placeholder="To (DD/MM/YYYY)"
                  placeholderTextColor={SEC.textDim}
                  value={customRange.to}
                  onChangeText={(v) => setCustomRange((p) => ({ ...p, to: v }))}
                />
              </View>
            ) : null}

            <View style={styles.securityStatsGrid}>
              {isStaffLoading ? (
                <ActivityIndicator size="small" color={SEC.teal} style={styles.securityLoader} />
              ) : (
                <>
                  <View style={styles.securityStatItem}>
                    <View style={styles.securityStatValueRow}>
                      <Text
                        style={[
                          styles.securityStatMainVal,
                          headcountOk ? styles.securityValPositive : styles.securityValNegative,
                        ]}
                      >
                        {dailyTotal}/{dailyExpected}
                      </Text>
                      <View
                        style={[
                          styles.miniBadge,
                          headcountOk ? styles.miniBadgeSuccess : styles.miniBadgeError,
                        ]}
                      >
                        <Text
                          style={[
                            styles.miniBadgeText,
                            headcountOk ? styles.miniBadgeTextSuccess : styles.miniBadgeTextError,
                          ]}
                        >
                          {headcountOk ? 'OK' : `-${dailyShortage}`}
                        </Text>
                      </View>
                    </View>
                    {securityPeriodLabel ? (
                      <Text style={styles.securityBillFootnote} numberOfLines={2}>
                        {securityPeriodLabel}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.securityStatDivider} />
                  <View style={styles.securityStatItem}>
                    <View style={styles.securityStatValueRow}>
                      <Text style={[styles.securityStatMainVal, styles.securityValBill]}>
                        {billHeadline}
                      </Text>
                    </View>
                    {useOfficialBill ? (
                      <Text style={styles.securityBillFootnote}>Vendor contract rate</Text>
                    ) : (
                      <Text style={styles.securityBillFootnote} numberOfLines={2}>
                        {billFootnoteHint || 'Shift-based estimate'}
                      </Text>
                    )}
                  </View>
                </>
              )}
            </View>
            {fetchErrors?.opsDashboard && !isStaffLoading ? (
              <Text style={styles.securityEmptyRoles}>{fetchErrors.opsDashboard}</Text>
            ) : null}

            <View style={styles.hubActionRow}>
              <TouchableOpacity
                style={[styles.hubBtn, styles.hubBtnDuty]}
                onPress={() => openSecurityDutyModal('check-in')}
              >
                <Ionicons name="log-in-outline" size={16} color="#93C5FD" />
                <Text style={styles.hubBtnTextDuty}>Check in</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.hubBtn, styles.hubBtnDutyOut]}
                onPress={() => openSecurityDutyModal('check-out')}
              >
                <Ionicons name="log-out-outline" size={16} color="#FCA5A5" />
                <Text style={styles.hubBtnTextDutyOut}>Check out</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dutyAttendanceSection}>
              <Text style={styles.dutyAttendanceHeading}>Hours on site (check-in → check-out)</Text>
              {dutySessionsLoading ? (
                <ActivityIndicator size="small" color={SEC.teal} style={styles.securityLoader} />
              ) : dutySessions.length === 0 ? (
                <Text style={styles.dutyAttendanceEmpty}>
                  No check-in records for {dutyDateParams.label || 'this period'}.
                </Text>
              ) : (
                <>
                  {dutyHoursByStaff.length > 0 ? (
                    <View style={styles.dutyTotalsRow}>
                      {dutyHoursByStaff.map((row) => (
                        <View key={row.staffName} style={styles.dutyTotalChip}>
                          <Text style={styles.dutyTotalName} numberOfLines={1}>
                            {row.staffName}
                          </Text>
                          <Text style={styles.dutyTotalHours}>{row.label}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {dutySessions.map((session) => (
                    <View
                      key={session.id}
                      style={[
                        styles.dutySessionRow,
                        session.status === 'open' && styles.dutySessionRowOpen,
                      ]}
                    >
                      <View style={styles.dutySessionMain}>
                        <Text style={styles.dutySessionName} numberOfLines={1}>
                          {session.staffName}
                        </Text>
                        <Text style={styles.dutySessionLoc} numberOfLines={1}>
                          {session.locationName}
                          {session.entryShiftDisplay ? ` · ${session.entryShiftDisplay}` : ''}
                        </Text>
                        <Text style={styles.dutySessionTimes} numberOfLines={2}>
                          In {formatDutyTime(session.entryAt)}
                          {session.exitAt
                            ? ` · Out ${formatDutyTime(session.exitAt)}`
                            : ' · Still on duty'}
                        </Text>
                      </View>
                      <View style={styles.dutySessionHoursWrap}>
                        <Text
                          style={[
                            styles.dutySessionHours,
                            session.status === 'open' && styles.dutySessionHoursOpen,
                          ]}
                        >
                          {displayDutyDuration(session)}
                        </Text>
                        {session.durationHours != null && session.status !== 'open' ? (
                          <Text style={styles.dutySessionHoursSub}>
                            {session.durationHours}h total
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>

            <View style={styles.premiumRolesList}>
              {securityStaff.length === 0 && !isStaffLoading ? (
                <Text style={styles.securityEmptyRoles}>No deployment roles for this period.</Text>
              ) : null}
              {securityStaff.map((item) => {
                const s1Short = item.actualS1 < item.expected;
                const s2Short = item.actualS2 < item.expected;
                const roleOk = !s1Short && !s2Short;
                const queuedForRole = committedSecurityEntries.filter(
                  (e) => normalizeRoleKey(e.designation) === normalizeRoleKey(item.role),
                ).length;
                return (
                  <View
                    key={item.id}
                    style={[styles.premiumRoleRow, queuedForRole > 0 && styles.premiumRoleRowQueued]}
                  >
                    <Text style={styles.roleNameCompact} numberOfLines={1}>
                      {item.role}
                      {queuedForRole > 0 ? (
                        <Text style={styles.roleQueuedBadge}> +{queuedForRole}</Text>
                      ) : null}
                    </Text>
                    <View style={styles.roleCountGroup}>
                      <View style={[styles.shiftPill, s1Short && styles.shiftPillWarn]}>
                        <Text style={styles.shiftPillLabel}>S1</Text>
                        <Text style={[styles.shiftPillVal, s1Short && styles.shiftValError]}>
                          {item.actualS1}/{item.expected}
                        </Text>
                      </View>
                      <View style={[styles.shiftPill, s2Short && styles.shiftPillWarn]}>
                        <Text style={styles.shiftPillLabel}>S2</Text>
                        <Text style={[styles.shiftPillVal, s2Short && styles.shiftValError]}>
                          {item.actualS2}/{item.expected}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.roleStatusDot,
                          roleOk ? styles.roleStatusOk : styles.roleStatusWarn,
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const closeSecurityDutyModal = useCallback(() => {
    setDeploymentPickerOpen(null);
    setSecurityDutyModal(null);
    setDeploymentForm({ designation: '', name: '', location: '' });
    setStaffAttendancePhoto(null);
  }, []);

  const pickStaffPhotoFromCamera = async () => {
    try {
      const photo = await pickGeoPhotoFromCamera();
      if (photo) setStaffAttendancePhoto(photo);
    } catch (err) {
      console.log('Error taking photo:', err);
      Alert.alert('Camera', err?.message || 'Could not use camera.');
    }
  };

  useEffect(() => {
    if (!securityDutyModal) {
      setDeploymentForm({ designation: '', name: '', location: '' });
      setStaffAttendancePhoto(null);
      setDeploymentPickerOpen(null);
      setCheckoutDutySessionId(null);
    }
  }, [securityDutyModal]);

  useEffect(() => {
    if (!hkDutyModal) {
      setDeploymentForm({ designation: '', name: '', location: '' });
      setStaffAttendancePhoto(null);
      setDeploymentPickerOpen(null);
      setHkCheckoutSessionId(null);
      setRecordStaffType('Security');
    }
  }, [hkDutyModal]);

  useEffect(() => {
    if (hkDutyModal !== 'check-out' || !token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const accessToken = (await ensureValidAccessToken()) || token;
        if (!accessToken || cancelled) return;
        const onDuty = await fetchOnDutyHkSessions(accessToken);
        if (cancelled || !onDuty?.length) return;
        setHkDutySessions((prev) => {
          const byId = new Map(prev.map((s) => [s.id, s]));
          for (const s of onDuty) {
            if (s?.id) byId.set(s.id, s);
          }
          return [...byId.values()];
        });
      } catch (err) {
        if (!cancelled) console.warn('HK on-duty list load:', err?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hkDutyModal, token]);

  useEffect(() => {
    if (securityDutyModal !== 'check-out' || !token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const accessToken = (await ensureValidAccessToken()) || token;
        if (!accessToken || cancelled) return;
        const onDuty = await fetchOnDutySessions(accessToken);
        if (cancelled || !onDuty?.length) return;
        setDutySessions((prev) => {
          const byId = new Map(prev.map((s) => [s.id, s]));
          for (const s of onDuty) {
            if (s?.id) byId.set(s.id, s);
          }
          return [...byId.values()];
        });
      } catch (err) {
        if (!cancelled) console.warn('On-duty list load:', err?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [securityDutyModal, token]);

  const buildDraftSecurityEntry = () => {
    const designation = deploymentForm.designation.trim();
    const deployName = deploymentForm.name.trim();
    const deployLocation = deploymentForm.location.trim();
    if (!designation || !deployName || !deployLocation || !staffAttendancePhoto?.uri) {
      return null;
    }
    return {
      designation,
      staffName: deployName,
      location: deployLocation,
      photo: staffAttendancePhoto,
    };
  };

  const saveSecurityDutyForm = async () => {
    const draft = buildDraftSecurityEntry();
    if (!draft) {
      if (!deploymentForm.designation.trim() || !deploymentForm.name.trim() || !deploymentForm.location.trim()) {
        Alert.alert('Missing details', 'Please select designation, staff name, and location.');
      } else {
        Alert.alert('Photo required', 'Take a verification photo with the camera.');
      }
      return;
    }

    const accessToken = (await ensureValidAccessToken()) || token;
    if (!accessToken) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    setIsSavingDuty(true);
    try {
      const photoPayload = {
        photo: draft.photo,
        latitude: draft.photo.latitude ?? null,
        longitude: draft.photo.longitude ?? null,
        accuracy: draft.photo.accuracy ?? null,
        capturedAt: draft.photo.capturedAt ?? null,
      };

      if (securityDutyModal === 'check-in') {
        const session = await postDutyCheckIn(accessToken, {
          staffName: draft.staffName,
          locationName: draft.location,
          designation: draft.designation,
          ...photoPayload,
        });
        setCommittedSecurityEntries((prev) => [
          ...prev,
          {
            designation: draft.designation,
            staffName: draft.staffName,
            location: draft.location,
          },
        ]);
        const shiftLine = session.entryShiftDisplay || '';
        const gpsLine =
          session.entryLatitude != null && session.entryLongitude != null
            ? '\nGPS saved with photo.'
            : '\nGPS not captured — enable location or retake photo.';
        Alert.alert(
          'Checked in',
          `${draft.staffName} at ${draft.location}.${shiftLine ? `\n${shiftLine}` : ''}${gpsLine}\nTimer started — hours show after check-out.`,
        );
        setDutySessionsTick((t) => t + 1);
      } else {
        let sessionId = checkoutDutySessionId;
        if (!sessionId) {
          const open = await fetchOpenDutySession(accessToken, draft.staffName);
          sessionId = open?.id ?? null;
        }
        if (!sessionId) {
          Alert.alert(
            'Not on duty',
            `${draft.staffName} has no active check-in. Only staff who checked in can check out.`,
          );
          return;
        }
        const session = await postDutyCheckOut(accessToken, sessionId, photoPayload);
        const shiftLine = session.exitShiftDisplay || '';
        const gpsLine =
          session.exitLatitude != null && session.exitLongitude != null
            ? '\nGPS saved with photo.'
            : '';
        const present = session.durationLabel
          || formatDutyDurationMinutes(session.durationMinutes);
        Alert.alert(
          'Checked out',
          `${draft.staffName} was on site for ${present}.`
            + (shiftLine ? `\n${shiftLine}` : '')
            + gpsLine,
        );
        setDutySessionsTick((t) => t + 1);
      }

      closeSecurityDutyModal();
      refreshSecurityData();
    } catch (err) {
      console.error('Save duty failed:', err);
      Alert.alert('Error', err?.message || 'Could not save duty record.');
    } finally {
      setIsSavingDuty(false);
    }
  };

  const saveSecurityStaff = async () => {
    try {
      if (!staffForm.name) {
        Alert.alert('Error', 'Please enter staff name');
        return;
      }

      await postStaffMember(token, staffForm);

      Alert.alert('Success', 'Staff member added successfully');
      setAddStaffOpen(false);
      setStaffForm({ name: '', badgeNumber: '', role: 'SECURITY_GUARD', phone: '' });
      refreshSecurityData();
    } catch (err) {
      console.error('Save staff failed:', err);
      Alert.alert('Error', 'Could not add staff member');
    }
  };

  const pickPatrolPhotoFromLibrary = async () => {
    try {
      const photo = await pickGeoPhotoFromLibrary();
      if (photo) setPatrolForm((p) => ({ ...p, photos: [photo] }));
    } catch (err) {
      console.log('Error picking patrol photo:', err);
      Alert.alert('Photos', err?.message || 'Could not open photo library.');
    }
  };

  const pickPatrolPhotoFromCamera = async () => {
    try {
      const photo = await pickGeoPhotoFromCamera();
      if (photo) setPatrolForm((p) => ({ ...p, photos: [photo] }));
    } catch (err) {
      console.log('Error taking patrol photo:', err);
      Alert.alert('Camera', err?.message || 'Could not use camera.');
    }
  };

  const findOpenDutySessionLocal = useCallback(
    (staffName) => {
      const needle = (staffName || '').trim().toLowerCase();
      if (!needle) return null;
      return (
        dutySessions.find(
          (s) => s.status === 'open' && s.staffName?.trim().toLowerCase() === needle,
        ) ?? null
      );
    },
    [dutySessions],
  );

  const applyCheckoutStaffSelection = useCallback(
    async (staffName) => {
      let open = findOpenDutySessionLocal(staffName);
      if (!open?.id) {
        const accessToken = (await ensureValidAccessToken()) || token;
        if (accessToken) {
          open = await fetchOpenDutySession(accessToken, staffName);
        }
      }
      if (!open?.id) {
        Alert.alert(
          'Not checked in',
          `${staffName} is not on duty. Select a guard who has an active check-in.`,
        );
        setCheckoutDutySessionId(null);
        setDeploymentForm((p) => ({ ...p, name: staffName, designation: '', location: '' }));
        return;
      }
      setCheckoutDutySessionId(open.id);
      setDeploymentForm({
        name: open.staffName,
        designation: open.designation || '',
        location: open.locationName || '',
      });
    },
    [findOpenDutySessionLocal, token],
  );

  const openSecurityDutyModal = useCallback((mode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId('Security');
    setHkDutyModal(null);
    setSecurityDutyModal(mode);
    setCheckoutDutySessionId(null);
    setDeploymentForm({ designation: '', name: '', location: '' });
    setStaffAttendancePhoto(null);
    setDeploymentPickerOpen(null);
  }, []);

  const findOpenHkDutySessionLocal = useCallback(
    (staffName) => {
      const needle = (staffName || '').trim().toLowerCase();
      if (!needle) return null;
      return (
        hkDutySessions.find(
          (s) => s.status === 'open' && s.staffName?.trim().toLowerCase() === needle,
        ) ?? null
      );
    },
    [hkDutySessions],
  );

  const applyHkCheckoutStaffSelection = useCallback(
    async (staffName) => {
      let open = findOpenHkDutySessionLocal(staffName);
      if (!open?.id) {
        const accessToken = (await ensureValidAccessToken()) || token;
        if (accessToken) {
          open = await fetchOpenHkDutySession(accessToken, staffName);
        }
      }
      if (!open?.id) {
        Alert.alert(
          'Not checked in',
          `${staffName} is not on duty. Select staff who has an active check-in.`,
        );
        setHkCheckoutSessionId(null);
        setDeploymentForm((p) => ({ ...p, name: staffName, designation: '', location: '' }));
        return;
      }
      setHkCheckoutSessionId(open.id);
      setDeploymentForm({
        name: open.staffName,
        designation: open.designation || '',
        location: open.locationName || '',
      });
    },
    [findOpenHkDutySessionLocal, token],
  );

  const closeHkDutyModal = useCallback(() => {
    setDeploymentPickerOpen(null);
    setHkDutyModal(null);
    setDeploymentForm({ designation: '', name: '', location: '' });
    setStaffAttendancePhoto(null);
    setHkCheckoutSessionId(null);
    setRecordStaffType('Security');
  }, []);

  const openHkDutyModal = useCallback((mode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId('Workforce');
    setSecurityDutyModal(null);
    setRecordStaffType('FM_HK');
    setHkDutyModal(mode);
    setHkCheckoutSessionId(null);
    setDeploymentForm({ designation: '', name: '', location: '' });
    setStaffAttendancePhoto(null);
    setDeploymentPickerOpen(null);
  }, []);

  const saveHkDutyForm = async () => {
    const draft = buildDraftSecurityEntry();
    if (!draft) {
      if (!deploymentForm.designation.trim() || !deploymentForm.name.trim() || !deploymentForm.location.trim()) {
        Alert.alert('Missing details', 'Please select designation, staff name, and location.');
      } else {
        Alert.alert('Photo required', 'Take a verification photo with the camera.');
      }
      return;
    }

    const accessToken = (await ensureValidAccessToken()) || token;
    if (!accessToken) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    setIsSavingHkDuty(true);
    try {
      const photoPayload = {
        photo: draft.photo,
        latitude: draft.photo.latitude ?? null,
        longitude: draft.photo.longitude ?? null,
        accuracy: draft.photo.accuracy ?? null,
        capturedAt: draft.photo.capturedAt ?? null,
      };

      if (hkDutyModal === 'check-in') {
        const session = await postHkDutyCheckIn(accessToken, {
          staffName: draft.staffName,
          locationName: draft.location,
          designation: draft.designation,
          ...photoPayload,
        });
        setCommittedHkEntries((prev) => [
          ...prev,
          { designation: draft.designation, staffName: draft.staffName },
        ]);
        const shiftLine = session.entryShiftDisplay || '';
        Alert.alert(
          'Checked in',
          `${draft.staffName} at ${draft.location}.${shiftLine ? `\n${shiftLine}` : ''}\nTimer started — hours show after check-out.`,
        );
        setHkDutySessionsTick((t) => t + 1);
      } else {
        let sessionId = hkCheckoutSessionId;
        if (!sessionId) {
          const open = await fetchOpenHkDutySession(accessToken, draft.staffName);
          sessionId = open?.id ?? null;
        }
        if (!sessionId) {
          Alert.alert(
            'Not on duty',
            `${draft.staffName} has no active check-in. Only staff who checked in can check out.`,
          );
          return;
        }
        const session = await postHkDutyCheckOut(accessToken, sessionId, photoPayload);
        const present = session.durationLabel
          || formatDutyDurationMinutes(session.durationMinutes);
        Alert.alert('Checked out', `${draft.staffName} was on site for ${present}.`);
        setHkDutySessionsTick((t) => t + 1);
      }

      closeHkDutyModal();
      refreshHkData();
    } catch (err) {
      console.error('Save HK duty failed:', err);
      Alert.alert('Error', err?.message || 'Could not save housekeeping duty record.');
    } finally {
      setIsSavingHkDuty(false);
    }
  };

  const renderExpensesDetails = () => {
    const { rows: filtered, periodLabel } = expenseFiltered;
    const totalSpend = filtered.reduce((sum, row) => sum + row.amount, 0);
    return (
      <ExpensesModulePanel
        totalSpend={totalSpend}
        periodLabel={periodLabel}
        transactionCount={filtered.length}
        byCategory={expenseByCategory}
        expenseTimePreset={expenseTimePreset}
        onExpenseTimePresetChange={setExpenseTimePreset}
        expenseDateRange={expenseDateRange}
        onExpenseDateFromChange={(t) => setExpenseDateRange((p) => ({ ...p, from: t }))}
        onExpenseDateToChange={(t) => setExpenseDateRange((p) => ({ ...p, to: t }))}
        transactions={filtered}
        transactionsExpanded={expenseTransactionsExpanded}
        onToggleTransactions={() => setExpenseTransactionsExpanded((v) => !v)}
        onRecordExpense={() => setRecordExpenseOpen(true)}
      />
    );
  };

  const renderExpandedBody = (section) => {
    if (section.id === 'Workforce') return renderWorkforceDetails();
    if (section.id === 'promotions') return renderPromotionsDetails();
    if (section.id === 'mygate') return renderMyGateDetails();
    return renderModulePreview(section);
  };

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <StatusBar barStyle="light-content" translucent backgroundColor={DARK.bg} />

      <View
        style={[
          styles.screenHeader,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 12 : Platform.OS === 'android' ? 10 : 6) },
        ]}
      >
        <View style={styles.screenHeaderRow}>
          <View style={styles.screenHeaderBrand}>
            <AnimatedBrandLogo />
            <Animated.View entering={FadeIn.delay(120).duration(400)}>
              <BrandWordmark size={20} />
            </Animated.View>
          </View>
          <View style={styles.screenHeaderActions}>
            <TouchableOpacity style={styles.screenHeaderBtn} activeOpacity={0.75} onPress={() => {}}>
              <Ionicons name="notifications-outline" size={21} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.screenHeaderBtn} activeOpacity={0.8} onPress={logout}>
              <Ionicons name="log-out-outline" size={21} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: tabBarHeight + insets.bottom + 12,
            width: screenWidth,
          },
        ]}
      >
        {permissions?.canSeeModule('Workforce') && !permissions?.canSeeModule('Security') ? (
          <View style={[styles.fmDutyBanner, { width: screenWidth - CONTENT_PAD * 2 }]}>
            <Text style={styles.fmDutyBannerTitle}>Housekeeping check-in</Text>
            <View style={styles.hubActionRow}>
              <TouchableOpacity
                style={[styles.hubBtn, styles.hubBtnDuty]}
                onPress={() => navigation.navigate('HkDuty', { mode: 'check-in' })}
              >
                <Ionicons name="log-in-outline" size={16} color="#93C5FD" />
                <Text style={styles.hubBtnTextDuty}>Check in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.hubBtn, styles.hubBtnDutyOut]}
                onPress={() => navigation.navigate('HkDuty', { mode: 'check-out' })}
              >
                <Ionicons name="log-out-outline" size={16} color="#FCA5A5" />
                <Text style={styles.hubBtnTextDutyOut}>Check out</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={[styles.cardsStack, { width: screenWidth - CONTENT_PAD * 2 }]}>
          {visibleDashboardSections.map((section, index) => {
            const expanded = expandedId === section.id;
            const isLast = index === visibleDashboardSections.length - 1;
            return (
              <FloatingModuleCard
                key={section.id}
                section={section}
                index={index}
                expanded={expanded}
                onPress={() => toggle(section.id)}
                isLast={isLast}
              >
                {expanded
                  ? section.id === 'Security'
                    ? renderSecurityDetails()
                    : section.id === 'rentals'
                      ? renderRentalsDetails()
                      : section.id === 'amc'
                        ? renderAmcDetails()
                        : section.id === 'WaterTracking'
                          ? renderWaterDetails()
                          : section.id === 'Expenses'
                            ? renderExpensesDetails()
                            : renderExpandedBody(section)
                  : section.id === 'Workforce'
                    ? renderCollapsedDutyQuickActions(
                        () => openHkDutyModal('check-in'),
                        () => openHkDutyModal('check-out'),
                      )
                    : section.id === 'Security'
                      ? renderCollapsedDutyQuickActions(
                          () => openSecurityDutyModal('check-in'),
                          () => openSecurityDutyModal('check-out'),
                        )
                      : null}
              </FloatingModuleCard>
            );
          })}
        </View>
      </ScrollView>

      <RentalsShopForm
        visible={addShopOpen}
        onClose={() => setAddShopOpen(false)}
        form={shopForm}
        onChange={updateForm}
        onPickAgreement={pickAgreement}
        onSave={saveShop}
      />

      <RentalsTrainerForm
        visible={addTrainerOpen}
        onClose={() => setAddTrainerOpen(false)}
        form={trainerForm}
        setForm={setTrainerForm}
        onSave={saveTrainer}
      />

      <RentalsPaymentForm
        visible={recordPaymentOpen}
        onClose={() => setRecordPaymentOpen(false)}
        form={paymentForm}
        setForm={setPaymentForm}
        onPickBill={pickPaymentBill}
        onSave={savePayment}
      />

      <AmcContractForm
        visible={addAmcOpen}
        onClose={() => setAddAmcOpen(false)}
        form={amcContractForm}
        setForm={setAmcContractForm}
        onPickDocument={pickAmcDocument}
        onSave={saveAmcContract}
      />

      <AmcComplianceForm
        visible={logComplianceOpen}
        onClose={() => setLogComplianceOpen(false)}
        form={complianceForm}
        setForm={setComplianceForm}
        onPickCertificate={pickComplianceCertificate}
        onSave={saveComplianceEntry}
      />

      <AmcCertificateForm
        visible={amcCertificateOpen}
        onClose={() => setAmcCertificateOpen(false)}
        form={certificateForm}
        setForm={setCertificateForm}
        onPickCertificate={pickComplianceCertificate}
        onSave={saveAmcCertificate}
      />

      <WaterRecordForm
        visible={recordWaterOpen}
        onClose={() => setRecordWaterOpen(false)}
        form={waterForm}
        setForm={setWaterForm}
        vendors={waterVendors}
        onPickPhotos={pickWaterPhotos}
        onSave={saveWaterInput}
      />

      <WaterVendorForm
        visible={waterVendorOpen}
        onClose={() => setWaterVendorOpen(false)}
        form={waterVendorForm}
        setForm={setWaterVendorForm}
        onSave={saveWaterVendor}
      />

      <ExpenseRecordForm
        visible={recordExpenseOpen}
        onClose={() => setRecordExpenseOpen(false)}
        form={expenseForm}
        setForm={setExpenseForm}
        onPickBill={pickExpenseBill}
        onSave={saveExpense}
      />

      <SecurityFormModal
        visible={recordPatrolOpen}
        onClose={() => {
          setRecordPatrolOpen(false);
          setPatrolPickerOpen(false);
          setPatrolForm({ staffId: '', locationId: '', notes: '', photos: [] });
        }}
        title="Record patrolling"
        footer={
          <SecSaveButton
            label="Save patrol log"
            onPress={() => {
              void savePatrol();
            }}
            loading={isSavingPatrol}
          />
        }
      >
            <TouchableOpacity
              style={styles.secSelect}
              activeOpacity={0.85}
              onPress={() => {
                if (patrolStaffNameOptions.length === 0) {
                  Alert.alert(
                    'No deployed staff',
                    'Check in a guard first, then record patrolling.',
                  );
                  return;
                }
                setPatrolPickerOpen(true);
              }}
            >
              <Text
                style={[
                  styles.secSelectText,
                  !patrolForm.staffId && styles.secSelectPlaceholder,
                ]}
                numberOfLines={1}
              >
                {patrolForm.staffId || 'Select security staff'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={SEC.textMuted} />
            </TouchableOpacity>
            {patrolStaffNameOptions.length === 0 ? (
              <Text style={styles.secModalHint}>
                Check in guards first — they will appear here for patrolling.
              </Text>
            ) : null}
            <TextInput
              style={styles.secInput}
              placeholder="e.g. Tower A basement"
              placeholderTextColor={SEC_PLACEHOLDER}
              value={patrolForm.locationId}
              onChangeText={(v) => setPatrolForm((p) => ({ ...p, locationId: v }))}
            />
            <TextInput
              style={[styles.secInput, styles.secInputMultiline]}
              placeholder="Patrol notes / observation"
              placeholderTextColor={SEC_PLACEHOLDER}
              multiline
              value={patrolForm.notes}
              onChangeText={(v) => setPatrolForm((p) => ({ ...p, notes: v }))}
            />
            <View style={styles.deploymentPhotoRow}>
              <TouchableOpacity
                style={styles.secUploadBtn}
                activeOpacity={0.85}
                onPress={pickPatrolPhotoFromCamera}
              >
                <Ionicons name="camera-outline" size={18} color={SEC.teal} />
                <Text style={styles.secUploadBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secUploadBtn}
                activeOpacity={0.85}
                onPress={pickPatrolPhotoFromLibrary}
              >
                <Ionicons name="images-outline" size={18} color={SEC.teal} />
                <Text style={styles.secUploadBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            {patrolForm.photos.length > 0 && patrolForm.photos[0]?.uri ? (
              <View style={styles.secPhotoPreviewWrap}>
                <Image source={{ uri: patrolForm.photos[0].uri }} style={styles.patrolPhotoPreview} />
                <Text style={styles.secPhotoCaption} numberOfLines={2}>
                  {new Date(patrolForm.photos[0].capturedAt || Date.now()).toLocaleString()} ·{' '}
                  {formatGeoCaption(patrolForm.photos[0])}
                </Text>
              </View>
            ) : null}
      </SecurityFormModal>

      <Modal
        visible={addStaffOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddStaffOpen(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <Pressable style={styles.secModalBackdrop} onPress={() => setAddStaffOpen(false)} />
          <View style={styles.secModalSheet}>
            <View style={styles.secModalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.secModalTitleBlock}>
                <Text style={styles.secModalTitle}>Add staff member</Text>
              </View>
              <TouchableOpacity onPress={() => setAddStaffOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={SEC.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.secInput}
                placeholder="Full name"
                placeholderTextColor={SEC_PLACEHOLDER}
                value={staffForm.name}
                onChangeText={(v) => setStaffForm((p) => ({ ...p, name: v }))}
              />
              <TextInput
                style={styles.secInput}
                placeholder="Badge / ID number"
                placeholderTextColor={SEC_PLACEHOLDER}
                value={staffForm.badgeNumber}
                onChangeText={(v) => setStaffForm((p) => ({ ...p, badgeNumber: v }))}
              />
              <TextInput
                style={styles.secInput}
                placeholder="Phone number"
                placeholderTextColor={SEC_PLACEHOLDER}
                keyboardType="phone-pad"
                value={staffForm.phone}
                onChangeText={(v) => setStaffForm((p) => ({ ...p, phone: v }))}
              />

              <View style={styles.rolePickerRow}>
                {['SECURITY_GUARD', 'SUPERVISOR', 'SECURITY_OFFICER'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.secRoleChip, staffForm.role === r && styles.secRoleChipActive]}
                    onPress={() => setStaffForm((p) => ({ ...p, role: r }))}
                  >
                    <Text style={[styles.secRoleChipText, staffForm.role === r && styles.secRoleChipTextActive]}>
                      {r.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.secSaveBtn} activeOpacity={0.9} onPress={saveSecurityStaff}>
                <Text style={styles.secSaveBtnText}>Add to roster</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SecurityFormModal
        visible={securityDutyModal != null}
        onClose={closeSecurityDutyModal}
        title={securityDutyModal === 'check-out' ? 'Check out' : 'Check in'}
        maxHeight="88%"
        footer={
          <SecSaveButton
            label={securityDutyModal === 'check-out' ? 'Save check out' : 'Save check in'}
            onPress={() => {
              void saveSecurityDutyForm();
            }}
            loading={isSavingDuty}
            disabled={
              isSavingDuty
              || !buildDraftSecurityEntry()
              || (securityDutyModal === 'check-out' && !checkoutDutySessionId)
            }
          />
        }
      >
              <Text style={styles.secModalHint}>
                {securityDutyModal === 'check-out'
                  ? 'Select the guard who is on duty. Designation and post are taken from their check-in and cannot be changed.'
                  : 'Select designation, staff, and post — then capture a verification photo with the camera.'}
              </Text>
              {securityDutyModal === 'check-out' ? (
                <>
                  <TouchableOpacity
                    style={styles.secSelect}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (checkoutNameOptions.length === 0) {
                        Alert.alert(
                          'No one on duty',
                          'No active check-ins. Use Check in first.',
                        );
                        return;
                      }
                      setDeploymentPickerOpen('name');
                    }}
                  >
                    <Text
                      style={[
                        styles.secSelectText,
                        !deploymentForm.name && styles.secSelectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {deploymentForm.name || 'Select guard on duty'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={SEC.textMuted} />
                  </TouchableOpacity>
                  <View style={[styles.secSelect, styles.secSelectDisabled]}>
                    <Text
                      style={[
                        styles.secSelectText,
                        !deploymentForm.designation && styles.secSelectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {deploymentForm.designation || 'Designation (from check-in)'}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={16} color={SEC.textDim} />
                  </View>
                  <View style={[styles.secSelect, styles.secSelectDisabled]}>
                    <Text
                      style={[
                        styles.secSelectText,
                        !deploymentForm.location && styles.secSelectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {deploymentForm.location || 'Post (from check-in)'}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={16} color={SEC.textDim} />
                  </View>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.secSelect}
                    activeOpacity={0.85}
                    onPress={() => setDeploymentPickerOpen('designation')}
                  >
                    <Text
                      style={[
                        styles.secSelectText,
                        !deploymentForm.designation && styles.secSelectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {deploymentForm.designation || 'Select designation'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={SEC.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secSelect}
                    activeOpacity={0.85}
                    onPress={() => setDeploymentPickerOpen('name')}
                  >
                    <Text
                      style={[
                        styles.secSelectText,
                        !deploymentForm.name && styles.secSelectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {deploymentForm.name || 'Select staff name'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={SEC.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secSelect}
                    activeOpacity={0.85}
                    onPress={() => setDeploymentPickerOpen('location')}
                  >
                    <Text
                      style={[
                        styles.secSelectText,
                        !deploymentForm.location && styles.secSelectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {deploymentForm.location || 'Select location'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={SEC.textMuted} />
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.secUploadBtn}
                activeOpacity={0.85}
                onPress={pickStaffPhotoFromCamera}
              >
                <Ionicons name="camera-outline" size={18} color={SEC.teal} />
                <Text style={styles.secUploadBtnText}>Camera</Text>
              </TouchableOpacity>
              {staffAttendancePhoto?.uri ? (
                <View style={styles.secPhotoPreviewWrap}>
                  <Image source={{ uri: staffAttendancePhoto.uri }} style={styles.attendancePhotoPreview} />
                  <Text style={styles.secPhotoCaption} numberOfLines={2}>
                    {formatGeoCaption(staffAttendancePhoto)}
                  </Text>
                  <TouchableOpacity
                    style={styles.secPhotoRemove}
                    onPress={() => setStaffAttendancePhoto(null)}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color={SEC.red} />
                  </TouchableOpacity>
                </View>
              ) : null}
      </SecurityFormModal>

      <SecurityFormModal
        visible={hkDutyModal != null}
        onClose={closeHkDutyModal}
        title={hkDutyModal === 'check-out' ? 'Check out' : 'Check in'}
        maxHeight="88%"
        footer={
          <SecSaveButton
            label={hkDutyModal === 'check-out' ? 'Save check out' : 'Save check in'}
            onPress={() => {
              void saveHkDutyForm();
            }}
            loading={isSavingHkDuty}
            disabled={
              isSavingHkDuty
              || !buildDraftSecurityEntry()
              || (hkDutyModal === 'check-out' && !hkCheckoutSessionId)
            }
          />
        }
      >
              <Text style={styles.secModalHint}>
                {hkDutyModal === 'check-out'
                  ? 'Select staff who is on duty. Designation and location are taken from check-in and cannot be changed.'
                  : 'Select designation, staff, and location — then capture a verification photo with the camera.'}
              </Text>
              {hkDutyModal === 'check-out' ? (
                <>
                  <TouchableOpacity
                    style={styles.secSelect}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (hkCheckoutNameOptions.length === 0) {
                        Alert.alert(
                          'No one on duty',
                          'No active check-ins. Use Check in first.',
                        );
                        return;
                      }
                      setDeploymentPickerOpen('name');
                    }}
                  >
                    <Text
                      style={[
                        styles.secSelectText,
                        !deploymentForm.name && styles.secSelectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {deploymentForm.name || 'Select staff on duty'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={SEC.textMuted} />
                  </TouchableOpacity>
                  <View style={[styles.secSelect, styles.secSelectDisabled]}>
                    <Text
                      style={[
                        styles.secSelectText,
                        !deploymentForm.designation && styles.secSelectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {deploymentForm.designation || 'Designation (from check-in)'}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={16} color={SEC.textDim} />
                  </View>
                  <View style={[styles.secSelect, styles.secSelectDisabled]}>
                    <Text
                      style={[
                        styles.secSelectText,
                        !deploymentForm.location && styles.secSelectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {deploymentForm.location || 'Location (from check-in)'}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={16} color={SEC.textDim} />
                  </View>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.secSelect}
                    activeOpacity={0.85}
                    onPress={() => setDeploymentPickerOpen('designation')}
                  >
                    <Text
                      style={[
                        styles.secSelectText,
                        !deploymentForm.designation && styles.secSelectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {deploymentForm.designation || 'Select designation'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={SEC.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secSelect}
                    activeOpacity={0.85}
                    onPress={() => setDeploymentPickerOpen('name')}
                  >
                    <Text
                      style={[
                        styles.secSelectText,
                        !deploymentForm.name && styles.secSelectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {deploymentForm.name || 'Select staff name'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={SEC.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secSelect}
                    activeOpacity={0.85}
                    onPress={() => setDeploymentPickerOpen('location')}
                  >
                    <Text
                      style={[
                        styles.secSelectText,
                        !deploymentForm.location && styles.secSelectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {deploymentForm.location || 'Select location'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={SEC.textMuted} />
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.secUploadBtn}
                activeOpacity={0.85}
                onPress={pickStaffPhotoFromCamera}
              >
                <Ionicons name="camera-outline" size={18} color={SEC.teal} />
                <Text style={styles.secUploadBtnText}>Camera</Text>
              </TouchableOpacity>
              {staffAttendancePhoto?.uri ? (
                <View style={styles.secPhotoPreviewWrap}>
                  <Image source={{ uri: staffAttendancePhoto.uri }} style={styles.attendancePhotoPreview} />
                  <Text style={styles.secPhotoCaption} numberOfLines={2}>
                    {formatGeoCaption(staffAttendancePhoto)}
                  </Text>
                  <TouchableOpacity
                    style={styles.secPhotoRemove}
                    onPress={() => setStaffAttendancePhoto(null)}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color={SEC.red} />
                  </TouchableOpacity>
                </View>
              ) : null}
      </SecurityFormModal>

      <Modal
        visible={activePickerField != null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeploymentPickerOpen(null);
          setPatrolPickerOpen(false);
        }}
      >
        <View style={styles.secModalOverlay}>
          <Pressable
            style={styles.secModalBackdrop}
            onPress={() => {
              setDeploymentPickerOpen(null);
              setPatrolPickerOpen(false);
            }}
          />
          <View style={[styles.secModalSheetHost, styles.deploymentPickerContainer]}>
          <View style={[styles.secModalSheet, styles.deploymentPickerSheet]}>
            <View style={styles.secModalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.secModalTitle}>
                {activePickerField === 'designation' && 'Select designation'}
                {activePickerField === 'location' && 'Select location'}
                {activePickerField === 'name' && 'Select staff name'}
                {activePickerField === 'staff' && 'Select security staff'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setDeploymentPickerOpen(null);
                  setHkPickerOpen(null);
                  setPatrolPickerOpen(false);
                }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={SEC.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.deploymentPickerScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {activePickerOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.secPickerRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (recordPatrolOpen && patrolPickerOpen) {
                      setPatrolForm((p) => ({ ...p, staffId: opt }));
                      setPatrolPickerOpen(false);
                    } else {
                      if (deploymentPickerOpen === 'designation') {
                        setDeploymentForm((p) => ({ ...p, designation: opt }));
                      } else if (deploymentPickerOpen === 'location') {
                        setDeploymentForm((p) => ({ ...p, location: opt }));
                      } else if (deploymentPickerOpen === 'name') {
                        if (securityDutyModal === 'check-out') {
                          void applyCheckoutStaffSelection(opt);
                        } else if (hkDutyModal === 'check-out') {
                          void applyHkCheckoutStaffSelection(opt);
                        } else {
                          setDeploymentForm((p) => ({ ...p, name: opt }));
                        }
                      }
                      setDeploymentPickerOpen(null);
                    }
                  }}
                >
                  <Text style={styles.secPickerRowText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  screenHeader: {
    width: '100%',
    paddingHorizontal: CONTENT_PAD,
    paddingBottom: 10,
    backgroundColor: DARK.bg,
  },
  screenHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  screenHeaderBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  screenLogoOuter: {
    ...Platform.select({
      web: { boxShadow: '0 6px 24px rgba(62, 232, 197, 0.22)' },
      default: {
        shadowColor: DARK.teal,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
      },
    }),
  },
  screenLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(62, 232, 197, 0.35)',
  },
  screenLogoImage: {
    width: 48,
    height: 48,
  },
  screenHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: CONTENT_PAD,
    paddingTop: 8,
    alignItems: 'center',
    flexGrow: 1,
  },
  cardsStack: {
    alignSelf: 'center',
  },
  floatCard: {
    width: '100%',
    marginBottom: CARD_GAP,
    backgroundColor: DARK.cardHighlight,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    ...Platform.select({
      web: { boxShadow: '0 10px 28px rgba(0,0,0,0.38), 0 0 0 1px rgba(62,232,197,0.06)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.32,
        shadowRadius: 14,
        elevation: 8,
      },
    }),
  },
  floatCardLast: {
    marginBottom: 0,
  },
  floatCardExpanded: {
    borderColor: 'rgba(62, 232, 197, 0.28)',
    ...Platform.select({
      web: { boxShadow: '0 14px 36px rgba(0,0,0,0.45), 0 0 20px rgba(62,232,197,0.12)' },
      default: {
        shadowOpacity: 0.4,
        shadowRadius: 18,
        elevation: 12,
      },
    }),
  },

  groupBlock: {
    marginBottom: SIZES.xl,
  },
  groupBlockAfter: {
    marginTop: SIZES.xs,
  },
  sectionHeading: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionSubheading: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    fontWeight: '500',
    lineHeight: 17,
    marginBottom: 12,
    maxWidth: '100%',
  },

  groupCard: {
    backgroundColor: DARK.cardHighlight,
    borderRadius: SIZES.radiusXl,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  moduleRowFeatured: {
    backgroundColor: 'rgba(62, 232, 197, 0.05)',
  },
  moduleRowExpanded: {
    backgroundColor: 'rgba(62, 232, 197, 0.07)',
  },
  moduleRowSecurityExpanded: {
    backgroundColor: SEC.bg,
  },
  moduleRowHkExpanded: {
    backgroundColor: SEC.bg,
  },
  moduleRowRentalsExpanded: {
    backgroundColor: SEC.bg,
  },
  moduleRowAmcExpanded: {
    backgroundColor: SEC.bg,
  },
  moduleRowOpsExpanded: {
    backgroundColor: SEC.bg,
  },
  moduleRowPressed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  moduleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  moduleTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.25,
  },
  moduleTitleFeatured: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  moduleChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  moduleChevronWrapOpen: {
    backgroundColor: DARK.tealDim,
  },
  moduleOpenHit: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 10,
  },

  detailsInner: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: DARK.input,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DARK.inputBorder,
  },
  expandKicker: {
    fontSize: SIZES.fontSm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  statCell: {
    flex: 1,
    backgroundColor: DARK.card,
    borderRadius: SIZES.radiusMd,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    borderLeftWidth: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  expandFootNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  expandFootNoteText: {
    flex: 1,
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    fontWeight: '600',
    lineHeight: 17,
  },
  unifiedCluster: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inClusterDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    marginTop: 2,
  },
  inClusterDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
  inClusterDividerText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  catRowBilling: { paddingVertical: 10 },
  catRowBillingDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0ECE7',
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  catIconDot: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    flex: 1,
    fontSize: SIZES.fontSm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingRight: 8,
  },
  catPct: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'right',
  },
  catBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8EFEB',
    overflow: 'hidden',
    marginBottom: 6,
  },
  catBarFill: { height: '100%', borderRadius: 4 },
  catMeta: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '500' },
  catMetaStrong: { fontWeight: '700', color: COLORS.textPrimary },
  catMetaMuted: { fontWeight: '600', color: COLORS.textSecondary },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  amountRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 74, 63, 0.06)',
  },
  amountRowLabel: {
    flex: 1,
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingRight: 8,
  },
  amountRowValue: {
    fontSize: SIZES.fontMd,
    fontWeight: '800',
    color: COLORS.primary,
  },
  detailsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  headTipBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headTipBtnPressed: { opacity: 0.7 },
  detailsToolbarHint: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  actionGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionTile: {
    width: '48.5%',
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  actionTilePrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionTileTitle: {
    marginTop: 8,
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  actionTileSub: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  actionTileTitlePrimary: {
    marginTop: 8,
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.white,
  },
  actionTileSubPrimary: {
    marginTop: 2,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  agreementsWrap: {
    marginTop: 12,
    padding: 12,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  agreementsTitle: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  agreementCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: 10,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  agreementTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  agreementUnit: {
    flex: 1,
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  agreementStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  agreementStatusPillWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  agreementStatusPillDraft: {
    backgroundColor: 'rgba(107, 114, 128, 0.16)',
  },
  agreementStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.success,
  },
  agreementStatusTextWarn: {
    color: '#B45309',
  },
  agreementStatusTextDraft: {
    color: COLORS.textSecondary,
  },
  agreementTenant: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  agreementMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  agreementRent: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  inlineSectionCard: {
    marginTop: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: 12,
  },
  inlineSectionTitle: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inlineSectionRow: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  paymentListItem: {
    marginBottom: 6,
  },
  paymentBillMeta: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
    marginBottom: 2,
  },
  reminderWrap: {
    marginTop: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: 12,
  },
  reminderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reminderTitle: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  reminderRow: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  reminderUnit: {
    fontSize: SIZES.fontSm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  reminderText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  reminderEmpty: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterChipActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#1D4ED8',
  },
  customDateRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  customDateInput: {
    flex: 1,
    marginBottom: 0,
  },
  waterDashGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  waterStatCard: {
    width: '48.5%',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  waterStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  waterStatValue: {
    fontSize: SIZES.fontLg,
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  waterActionRow: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 10,
  },
  waterActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: SIZES.radiusMd,
    backgroundColor: '#2563EB',
  },
  waterActionBtnText: {
    fontSize: SIZES.fontSm,
    color: COLORS.white,
    fontWeight: '800',
  },
  waterActionBtnSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  waterActionBtnSecondaryText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: '800',
  },
  waterHintText: {
    marginTop: 8,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  auditCard: {
    marginTop: 2,
    marginBottom: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  auditTitle: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  auditText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  capacityHeroCard: {
    marginBottom: 12,
    borderRadius: SIZES.radiusLg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...SHADOWS.medium,
  },
  capacityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  capacityTitle: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.white,
  },
  capacityPctPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SIZES.radiusFull,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  capacityPct: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.white,
  },
  capacityMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    marginBottom: 8,
  },
  capacityStatusText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '800',
    marginBottom: 6,
  },
  capacityTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#34D399',
  },
  capacityBottomRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  capacityShortfall: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FEF3C7',
  },
  capacityBottomHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '600',
  },
  capacityAnalyticsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  capacityAnalyticsPill: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderRadius: SIZES.radiusMd,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  capacityAnalyticsLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    marginBottom: 2,
  },
  capacityAnalyticsValue: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '800',
  },
  smartAlertsWrap: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  smartAlertsTitle: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '800',
    marginBottom: 4,
  },
  smartAlertText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
    marginBottom: 2,
  },
  waterLogCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: 10,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  waterLogTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  waterLogDate: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  waterLogVehicle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  waterLogMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  formSectionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 2,
  },
  formSectionHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalBg: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.radiusXl,
    borderTopRightRadius: SIZES.radiusXl,
    padding: SIZES.lg,
    paddingBottom: 30,
    maxHeight: '86%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  modalTitle: { fontSize: SIZES.fontLg, fontWeight: '800', color: COLORS.textPrimary },
  closeBtn: { padding: 4 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
    marginBottom: 10,
    backgroundColor: COLORS.background,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: COLORS.white,
    marginTop: 2,
  },
  uploadBtnText: {
    fontSize: SIZES.fontSm,
    fontWeight: '700',
    color: COLORS.primary,
  },
  uploadFileName: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 6,
  },
  saveBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  saveBtnText: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.white,
  },
  tooltip: {
    marginTop: 8,
    padding: 12,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.primaryDark,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...SHADOWS.medium,
  },
  tooltipTitle: { fontSize: SIZES.fontSm, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  tooltipHint: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 10, fontWeight: '500' },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tooltipRowLeft: { flex: 1, paddingRight: 12 },
  tooltipLabel: { fontSize: SIZES.fontSm, fontWeight: '700', color: COLORS.white },
  tooltipDetail: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 3, fontWeight: '500' },
  tooltipCountPill: {
    minWidth: 40,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZES.radiusFull,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  tooltipCount: { fontSize: SIZES.fontMd, fontWeight: '800', color: COLORS.white },
  tooltipDismiss: { alignSelf: 'flex-end', marginTop: 8, paddingVertical: 4 },
  tooltipDismissText: { fontSize: SIZES.fontSm, fontWeight: '700', color: COLORS.primaryLight },

  previewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 14,
    marginTop: 0,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  previewStripIcon: { marginTop: 1 },
  previewStripText: {
    flex: 1,
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    lineHeight: 17,
    fontWeight: '600',
  },
  workforceActionRow: {
    marginHorizontal: 16,
    marginTop: -4,
    flexDirection: 'row',
    gap: 8,
  },
  workforceActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
  },
  workforceActionBtnAlt: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  workforceActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
  workforceActionBtnAltText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  amcHero: {
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  amcHeroTitle: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: '#4C1D95',
    marginBottom: 10,
  },
  amcHeroStats: {
    flexDirection: 'row',
    gap: 8,
  },
  amcHeroPill: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingVertical: 9,
    alignItems: 'center',
  },
  amcHeroPillValue: {
    fontSize: SIZES.fontLg,
    fontWeight: '800',
    color: '#6D28D9',
  },
  amcHeroPillLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
    marginTop: 2,
  },
  amcListWrap: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    overflow: 'hidden',
  },
  amcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  amcRowLeft: {
    flex: 1,
    paddingRight: 10,
  },
  amcRowTitle: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  amcRowSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  amcRowRight: {
    alignItems: 'flex-end',
  },
  amcRowDue: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  amcRowStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  billBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  billBadgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  attachmentBtnText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },

  // Premium Expenses Styles
  expenseHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  expenseMainStat: {
    flex: 1,
  },
  totalSpendCard: {
    borderRadius: SIZES.radiusLg,
    padding: 16,
    ...SHADOWS.medium,
  },
  totalSpendContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSpendLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalSpendValue: {
    fontSize: SIZES.fontTitle,
    color: COLORS.white,
    fontWeight: '800',
    marginTop: 4,
  },
  totalSpendIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalSpendFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  totalSpendFooterText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  recordExpenseBtn: {
    width: 100,
    height: 100,
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  recordExpenseGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  recordExpenseText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 6,
    textAlign: 'center',
  },
  expensePeriodLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 2,
  },
  expenseCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 74, 63, 0.08)',
    ...SHADOWS.small,
  },
  expenseCompactHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  expenseCompactTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  expenseCompactMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  expenseActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  expenseActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  expenseActionBtnPrimary: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.small,
  },
  expenseActionBtnSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  expenseActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  expenseActionBtnTextSecondary: {
    color: COLORS.primary,
  },
  expenseModalHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    lineHeight: 17,
    marginBottom: 12,
  },
  expenseCategoryStrip: {
    gap: 8,
    marginBottom: 10,
  },
  expenseCategoryPill: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expenseCategoryPillLab: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  expenseCategoryPillVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  expenseCategoryPillBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  expenseCategoryPillFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  expenseTransactionsCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
    overflow: 'hidden',
    marginTop: 4,
  },
  expenseTransactionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  expenseTransactionsHeaderText: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  expenseTransactionsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  expenseTransactionsSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  expenseTransactionsBody: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    paddingTop: 4,
  },
  expenseEmpty: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    paddingVertical: 12,
    textAlign: 'center',
  },
  expenseEmptyInCard: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  expenseRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  expenseRowCompactMain: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  expenseRowVendor: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  expenseRowSub: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  expenseRowAmt: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  filterScroll: {
    marginBottom: 8,
  },
  premiumChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    ...SHADOWS.small,
  },
  premiumChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  premiumChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  premiumChipTextActive: {
    color: COLORS.white,
  },
  spendAnalysisContainer: {
    gap: 20,
    marginBottom: 24,
  },
  analysisSection: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    ...SHADOWS.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  analysisGrid: {
    gap: 12,
  },
  analysisCard: {
    gap: 4,
  },
  analysisCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  analysisCardValue: {
    fontSize: SIZES.fontLg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  analysisProgressBar: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginTop: 4,
    overflow: 'hidden',
  },
  analysisProgressFill: {
    height: '100%',
    backgroundColor: '#59BFA8',
    borderRadius: 3,
  },
  trendList: {
    gap: 12,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  trendInfo: {
    gap: 2,
  },
  trendLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  trendSub: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  recentLogSection: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    ...SHADOWS.medium,
  },
  premiumLogCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logDateWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logDate: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  logMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
  },
  logContent: {
    flex: 1,
    gap: 2,
  },
  logVendor: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  logCategory: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  logAmountWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  logAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  logBillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logBillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
  },
  logNote: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    paddingLeft: 56,
  },

  // Premium Dashboard Styles
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerBrandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  headerBrandMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  headerWordmark: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerProfileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    padding: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarCircle: {
    flex: 1,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  // Workforce Tracking Styles
  attendanceHero: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  attendanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  attendanceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  attendanceDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeWarn: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeSuccess: {
    backgroundColor: '#F0FDF4',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusBadgeTextWarn: {
    color: '#EF4444',
  },
  statusBadgeTextSuccess: {
    color: '#10B981',
  },
  attendanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16,
    paddingVertical: 14,
  },
  attendanceStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  attendanceStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  attendanceStatLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  attendanceStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  penaltyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  penaltyWarningText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '700',
  },
  fullActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  fullActionText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '800',
  },
  splitActionText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 16,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  customRangeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  rangeInputWrap: {
    flex: 1,
    gap: 4,
  },
  rangeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  rangeInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  periodSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  avgBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  avgBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCell: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  summaryLab: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
  },
  moduleSubsectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  shiftToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftPills: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 3,
    borderRadius: 10,
    gap: 4,
  },
  shiftPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  shiftPillActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
  },
  shiftPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  shiftPillTextActive: {
    color: COLORS.primary,
  },
  shiftStatusCol: {
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  shiftMiniLab: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  shortageSection: {
    backgroundColor: '#FFF1F2',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  shortageTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#BE123C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  shortageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  shortageInfo: {
    gap: 2,
  },
  shortageRole: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  shortageMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  shortageCount: {
    alignItems: 'flex-end',
  },
  shortageValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E11D48',
  },
  shortageUnit: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  deploymentSection: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    ...SHADOWS.medium,
  },
  deploymentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  staffFormContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginTop: 80,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    ...SHADOWS.large,
  },
  staffFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  staffFormTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  staffModalShiftRow: {
    marginTop: 10,
  },
  staffModalShiftHint: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  staffFormShiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  staffFormShiftText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  staffFormDateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#94A3B8',
    marginHorizontal: 8,
  },
  photoUploadSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  photoUploadGradient: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
  },
  photoUploadSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.white,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  formSectionDivider: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  staffFormRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  staffFormRole: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  staffFormControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  controlValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  staffFormSubmit: {
    backgroundColor: '#2DD4BF',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  staffFormSubmitText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deploymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  deploymentMain: {
    gap: 2,
  },
  deploymentRole: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  deploymentType: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  deploymentStatus: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  deploymentActual: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  deploymentExpected: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginLeft: 2,
  },
  workforcePresetScroll: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: 8,
    marginBottom: 10,
  },
  workforcePresetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  workforcePresetChipActive: {
    backgroundColor: COLORS.primary + '18',
    borderWidth: 1,
    borderColor: COLORS.primary + '55',
  },
  workforcePresetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  workforcePresetChipTextActive: {
    color: COLORS.primary,
  },
  workforceCustomDates: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  workforceCustomField: {
    flex: 1,
    gap: 4,
  },
  workforceCustomLab: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginLeft: 2,
  },
  workforceCustomInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  workforceSummaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(15, 74, 63, 0.08)',
    ...SHADOWS.small,
  },
  workforceSummaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  workforceSummaryTitles: {
    flex: 1,
    minWidth: 0,
  },
  workforceSummaryKicker: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  workforceSummarySub: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  workforceDualTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  workforceDualHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6,
    marginBottom: 4,
  },
  workforceDualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  workforceDualCell: {
    flex: 1,
    minWidth: 0,
  },
  workforceDualHeadMain: {
    flex: 1.1,
  },
  workforceDualHead: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  workforceDualRowLab: {
    flex: 1.1,
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  workforceDualVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  workforceDualPct: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 1,
  },
  workforcePenaltyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  workforcePenaltyStripText: {
    flex: 1,
    fontSize: 11,
    color: '#B45309',
    fontWeight: '700',
  },
  workforceActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  workforceActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  workforceActionBtnFm: {
    backgroundColor: '#4F46E5',
  },
  workforceActionBtnSec: {
    backgroundColor: '#101435',
  },
  workforceActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  workforceShortageBox: {
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  workforceShortageTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#BE123C',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  workforceShortageRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(190, 18, 60, 0.08)',
    gap: 2,
  },
  workforceShortageRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  workforceShortageMeta: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E11D48',
  },
  workforceShortageMuted: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  workforceRolesCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  workforceDeptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  workforceDeptHeaderSpaced: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  workforceDeptHeaderMain: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  workforceDeptTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  workforceDeptCount: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  workforceRoleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  workforceRoleName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  workforceRoleNums: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  workforceRoleDualNums: {
    flexShrink: 0,
    maxWidth: '52%',
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
  },
  workforceRoleNumOk: {
    color: '#334155',
  },
  textWarn: {
    color: '#EF4444',
  },
  // LedgerX Theme Styles
  ledgerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    marginHorizontal: 8,
    marginVertical: 12,
    borderWidth: 1.5,
    borderColor: '#2DD4BF33', // Subtle mint border
    overflow: 'visible',
    ...Platform.select({
      web: { boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
        elevation: 20,
      },
    }),
  },
  ledgerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  ledgerBrand: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  ledgerBrandAccent: {
    color: '#2DD4BF',
  },
  ledgerSubTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 2,
    marginTop: 4,
  },
  ledgerDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  ledgerDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  ledgerDropdownMenu: {
    position: 'absolute',
    top: 80,
    right: 24,
    width: 200,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingVertical: 6,
    zIndex: 999,
    borderWidth: 1,
    borderColor: '#334155',
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 12,
      },
    }),
  },
  ledgerDropdownOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A22',
  },
  ledgerOptionText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  ledgerOptionTextActive: {
    color: '#2DD4BF',
    fontWeight: '800',
  },
  ledgerBody: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  ledgerCustomRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  ledgerInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  ledgerStatsBox: {
    backgroundColor: '#1E293B66',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  ledgerStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ledgerStatLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  ledgerStatSub: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  ledgerStatValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  ledgerStatDivider: {
    height: 1,
    backgroundColor: '#33415555',
    marginVertical: 16,
  },
  ledgerTextGreen: {
    color: '#2DD4BF',
  },
  ledgerTextRed: {
    color: '#FB7185',
  },
  ledgerActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  ledgerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#2DD4BF22',
    height: 52,
    borderRadius: 16,
    gap: 10,
  },
  ledgerActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  ledgerList: {
    gap: 12,
  },
  ledgerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#33415533',
  },
  ledgerItemMain: {
    flex: 1,
  },
  ledgerItemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  ledgerBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ledgerBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ledgerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  ledgerItemValue: {
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 12,
  },

  // Security modals — dark sheet (matches SEC / login theme)
  secModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  secModalSheetHost: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    zIndex: 10,
    ...Platform.select({
      web: { position: 'relative' },
      default: { elevation: 24 },
    }),
  },
  secModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  secModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 10, 16, 0.78)',
    zIndex: 0,
  },
  secModalSheet: {
    backgroundColor: SEC.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: SEC.border,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 18,
    paddingTop: 8,
    maxHeight: '88%',
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    zIndex: 1,
    ...Platform.select({
      web: { boxShadow: '0 -12px 48px rgba(0,0,0,0.55)' },
      default: { elevation: 16 },
    }),
  },
  secModalScrollContent: {
    paddingBottom: 8,
  },
  secStaffChipRow: {
    marginBottom: 10,
    maxHeight: 36,
  },
  secStaffChipRowContent: {
    gap: 8,
    paddingRight: 4,
  },
  secStaffChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: SEC.bg,
    borderWidth: 1,
    borderColor: SEC.border,
    maxWidth: 140,
  },
  secStaffChipActive: {
    borderColor: SEC.teal,
    backgroundColor: DARK.tealDim,
  },
  secStaffChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: SEC.textMuted,
  },
  secStaffChipTextActive: {
    color: SEC.teal,
  },
  secModalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: SEC.border,
    marginBottom: 12,
  },
  secModalTitleBlock: { flex: 1 },
  secModalKicker: {
    ...SEC_FONTS.label,
    color: SEC.textDim,
    marginBottom: 2,
  },
  secModalTitle: {
    ...SEC_FONTS.modalTitle,
  },
  secModalHint: {
    ...SEC_FONTS.modalHint,
    marginBottom: 14,
  },
  secFieldLabel: {
    ...SEC_FONTS.label,
    color: SEC.textMuted,
    marginBottom: 6,
    marginTop: 4,
  },
  secInput: {
    backgroundColor: SEC.bg,
    borderWidth: 1,
    borderColor: SEC.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: '500',
    color: SEC.text,
    marginBottom: 10,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  secInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  secSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SEC.bg,
    borderWidth: 1,
    borderColor: SEC.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
    gap: 8,
  },
  secSelectText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: SEC.text,
  },
  secSelectPlaceholder: {
    color: SEC.textDim,
    fontWeight: '500',
  },
  secSelectDisabled: {
    opacity: 0.92,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: SEC.border,
  },
  secUploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SEC.bg,
    borderWidth: 1,
    borderColor: SEC.border,
    borderRadius: 10,
    paddingVertical: 11,
  },
  secUploadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: SEC.teal,
  },
  secSaveBtn: {
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: SEC.green,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    minHeight: 48,
    ...Platform.select({
      web: { cursor: 'pointer' },
      default: {},
    }),
  },
  secAddSecurityBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: SEC.gold,
  },
  pendingSecurityList: {
    marginTop: 16,
    gap: 8,
  },
  pendingSecurityTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: SEC.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pendingSecurityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.surfaceRaised || SEC.bg,
  },
  pendingSecurityThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: SEC.bg,
  },
  pendingSecurityMeta: {
    flex: 1,
    minWidth: 0,
  },
  pendingSecurityName: {
    fontSize: 14,
    fontWeight: '700',
    color: SEC.text,
  },
  pendingSecuritySub: {
    fontSize: 11,
    color: SEC.textMuted,
    marginTop: 2,
  },
  premiumRoleRowQueued: {
    borderColor: SEC.teal,
    backgroundColor: 'rgba(62, 232, 197, 0.08)',
  },
  roleQueuedBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: SEC.teal,
  },
  secSaveBtnDisabled: {
    opacity: 0.7,
  },
  secSaveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: SEC.bg,
  },
  secPhotoPreviewWrap: {
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SEC.border,
  },
  secPhotoCaption: {
    fontSize: 11,
    color: SEC.textMuted,
    padding: 10,
    backgroundColor: SEC.bg,
  },
  secPhotoRemove: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: SEC.surfaceRaised,
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: SEC.redBorder,
  },
  secRoleBlock: {
    backgroundColor: SEC.surfaceRaised,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SEC.border,
  },
  secRoleBlockTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: SEC.teal,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  secShiftInputWrap: {
    flex: 1,
    minWidth: '45%',
    marginBottom: 8,
  },
  secShiftInputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: SEC.textMuted,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  secRoleChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: SEC.bg,
    borderWidth: 1,
    borderColor: SEC.border,
  },
  secRoleChipActive: {
    backgroundColor: SEC.greenDim,
    borderColor: SEC.greenBorder,
  },
  secRoleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: SEC.textMuted,
  },
  secRoleChipTextActive: {
    color: SEC.green,
  },
  secPickerRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SEC.border,
  },
  secPickerRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: SEC.text,
  },

  // Security module — LedgerX-style dark dashboard
  securityExpandedShell: {
    backgroundColor: SEC.bg,
    paddingBottom: 8,
    width: '100%',
  },
  premiumSecurityCard: {
    backgroundColor: SEC.surface,
    overflow: 'hidden',
  },
  securityPremiumHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: SEC.borderSubtle,
  },
  securityHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  securityHeaderLeft: { flex: 1, minWidth: 140 },
  securityHeaderRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  securitySectionKicker: {
    ...SEC_FONTS.label,
    color: SEC.textDim,
    marginBottom: 4,
  },
  securityPremiumTitle: {
    ...SEC_FONTS.title,
    color: SEC.text,
  },
  securityPremiumSub: {
    fontSize: 12,
    color: SEC.textMuted,
    fontWeight: '500',
    marginTop: 4,
  },
  securityPremiumDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SEC.surfaceRaised,
    borderWidth: 1,
    borderColor: SEC.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  securityPremiumDropdownActive: {
    borderColor: SEC.goldBorder,
    backgroundColor: SEC.goldDim,
  },
  securityPremiumDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: SEC.text,
  },
  securityBody: {
    padding: 10,
  },
  securityLoader: {
    marginVertical: 12,
    width: '100%',
  },
  securityStatsGrid: {
    flexDirection: 'row',
    backgroundColor: SEC.surfaceRaised,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SEC.border,
  },
  securityStatItem: {
    flex: 1,
  },
  securityStatLabel: {
    ...SEC_FONTS.label,
    color: SEC.textMuted,
    marginBottom: 8,
  },
  securityStatValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  securityStatMainVal: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: SEC.text,
  },
  securityValPositive: {
    color: SEC.green,
  },
  securityValNegative: {
    color: SEC.red,
  },
  securityValBill: {
    color: SEC.green,
    fontSize: 20,
  },
  securityBillFootnote: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '600',
    color: SEC.textDim,
    lineHeight: 14,
  },
  securityStatDivider: {
    width: 1,
    backgroundColor: SEC.border,
    marginHorizontal: 12,
  },
  securityRolesHeading: {
    ...SEC_FONTS.label,
    color: SEC.textDim,
    marginBottom: 8,
  },
  collapsedDutyWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  collapsedDutyBtn: {
    flex: 1,
    minWidth: 0,
  },
  fmDutyBanner: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: SEC.surfaceRaised,
    borderWidth: 1,
    borderColor: SEC.border,
  },
  fmDutyBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: SEC.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hkFullScreenDutyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  hkFullScreenDutyLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: SEC.gold,
  },
  hubActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  hubBtn: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  hubBtnDuty: {
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.45)',
  },
  hubBtnDutyOut: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.4)',
  },
  hubBtnTextDuty: {
    fontSize: 11,
    fontWeight: '700',
    color: '#93C5FD',
  },
  hubBtnTextDutyOut: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  dutyAttendanceSection: {
    marginBottom: 14,
    paddingTop: 4,
  },
  dutyAttendanceHeading: {
    ...SEC_FONTS.label,
    color: SEC.textDim,
    marginBottom: 10,
  },
  dutyAttendanceEmpty: {
    fontSize: 12,
    color: SEC.textMuted,
    lineHeight: 18,
  },
  dutyTotalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  dutyTotalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.3)',
    maxWidth: '100%',
  },
  dutyTotalName: {
    fontSize: 12,
    fontWeight: '700',
    color: SEC.text,
    maxWidth: 140,
  },
  dutyTotalHours: {
    fontSize: 12,
    fontWeight: '800',
    color: SEC.teal,
  },
  dutySessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: SEC.border,
  },
  dutySessionRowOpen: {
    borderColor: 'rgba(34, 197, 94, 0.45)',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  dutySessionMain: {
    flex: 1,
    minWidth: 0,
  },
  dutySessionName: {
    fontSize: 14,
    fontWeight: '700',
    color: SEC.text,
  },
  dutySessionLoc: {
    fontSize: 11,
    color: SEC.textMuted,
    marginTop: 2,
  },
  dutySessionTimes: {
    fontSize: 10,
    color: SEC.textDim,
    marginTop: 4,
    lineHeight: 14,
  },
  dutySessionHoursWrap: {
    alignItems: 'flex-end',
    minWidth: 72,
  },
  dutySessionHours: {
    fontSize: 15,
    fontWeight: '800',
    color: SEC.gold,
  },
  dutySessionHoursOpen: {
    color: '#22C55E',
  },
  dutySessionHoursSub: {
    fontSize: 10,
    color: SEC.textDim,
    marginTop: 2,
  },
  hubBtnSecurity: {
    backgroundColor: SEC.green,
  },
  hubBtnIndividual: {
    backgroundColor: SEC.tealDim,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
  },
  hubBtnPatrol: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: SEC.border,
  },
  hubBtnWaterPrimary: {
    backgroundColor: WATER.saveAccent,
  },
  hubBtnWaterPrimaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: WATER.saveOnAccent,
  },
  hubBtnWaterSecondary: {
    backgroundColor: WATER.tealDim,
    borderWidth: 1,
    borderColor: WATER.accentBorder,
  },
  hubBtnHk: {
    backgroundColor: HK.saveAccent,
  },
  hubBtnHkText: {
    fontSize: 13,
    fontWeight: '800',
    color: HK.saveOnAccent,
  },
  hubBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: SEC.bg,
  },
  hubBtnTextPatrol: {
    fontSize: 13,
    fontWeight: '800',
    color: SEC.teal,
  },
  premiumRolesList: {
    gap: 6,
    alignSelf: 'stretch',
  },
  securityEmptyRoles: {
    fontSize: 13,
    color: SEC.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  premiumRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SEC.surfaceRaised,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SEC.border,
    gap: 8,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  roleNameCompact: {
    flex: 1,
    minWidth: 72,
    fontSize: 12,
    fontWeight: '700',
    color: SEC.teal,
  },
  roleCountGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  shiftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SEC.bg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: SEC.borderSubtle,
  },
  shiftPillWarn: {
    borderColor: SEC.redBorder,
    backgroundColor: SEC.redDim,
  },
  shiftPillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: SEC.textDim,
  },
  shiftPillVal: {
    fontSize: 12,
    fontWeight: '800',
    color: SEC.text,
  },
  shiftCol: {
    alignItems: 'center',
    minWidth: 36,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: SEC.textMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  shiftLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: SEC.textDim,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  shiftVal: {
    fontSize: 12,
    fontWeight: '800',
    color: SEC.text,
  },
  shiftValError: {
    color: SEC.red,
  },
  shiftDivider: {
    width: 1,
    height: 20,
    backgroundColor: SEC.border,
  },
  roleStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 2,
  },
  roleStatusOk: {
    backgroundColor: SEC.green,
  },
  roleStatusWarn: {
    backgroundColor: SEC.red,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniBadgeSuccess: {
    backgroundColor: SEC.greenDim,
    borderColor: SEC.greenBorder,
  },
  miniBadgeError: {
    backgroundColor: SEC.redDim,
    borderColor: SEC.redBorder,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  miniBadgeTextSuccess: {
    color: SEC.green,
  },
  miniBadgeTextError: {
    color: SEC.red,
  },
  premiumDropdownMenu: {
    position: 'absolute',
    top: 72,
    right: 16,
    backgroundColor: SEC.surfaceRaised,
    borderRadius: 12,
    padding: 6,
    width: 168,
    zIndex: 100,
    borderWidth: 1,
    borderColor: SEC.border,
    ...Platform.select({
      web: { boxShadow: '0 12px 40px rgba(0,0,0,0.5)' },
      default: { elevation: 12 },
    }),
  },
  premiumDropdownOption: {
    padding: 12,
    borderRadius: 8,
  },
  premiumDropdownOptionActive: {
    backgroundColor: SEC.goldDim,
    borderWidth: 1,
    borderColor: SEC.goldBorder,
  },
  premiumOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: SEC.textMuted,
  },
  premiumOptionTextActive: {
    color: SEC.gold,
    fontWeight: '800',
  },
  premiumCustomRangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  premiumRangeInput: {
    flex: 1,
    minWidth: 120,
    backgroundColor: SEC.bg,
    borderWidth: 1,
    borderColor: SEC.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontWeight: '600',
    color: SEC.text,
  },

  // Housekeeping module — premium dark card (HK amber theme)
  hkExpandedShell: {
    backgroundColor: HK.bg,
    paddingBottom: 8,
    width: '100%',
  },
  premiumHkCard: {
    backgroundColor: HK.surface,
    overflow: 'hidden',
  },
  hkPremiumHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: HK.borderSubtle,
  },
  hkHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  hkHeaderLeft: { flex: 1, minWidth: 140 },
  hkHeaderRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  hkPremiumTitle: {
    ...SEC_FONTS.title,
    color: HK.text,
  },
  hkPremiumSub: {
    fontSize: 12,
    color: HK.textMuted,
    fontWeight: '500',
    marginTop: 4,
  },
  hkPremiumDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: HK.surfaceRaised,
    borderWidth: 1,
    borderColor: HK.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hkPremiumDropdownActive: {
    borderColor: HK.accentBorder,
    backgroundColor: HK.goldDim,
  },
  hkPremiumDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: HK.text,
  },
  hkPremiumDropdownMenu: {
    position: 'absolute',
    top: 72,
    right: 16,
    backgroundColor: HK.surfaceRaised,
    borderRadius: 12,
    padding: 6,
    width: 168,
    zIndex: 100,
    borderWidth: 1,
    borderColor: HK.border,
    ...Platform.select({
      web: { boxShadow: '0 12px 40px rgba(0,0,0,0.5)' },
      default: { elevation: 12 },
    }),
  },
  hkPremiumDropdownOption: {
    padding: 12,
    borderRadius: 8,
  },
  hkPremiumDropdownOptionActive: {
    backgroundColor: HK.goldDim,
    borderWidth: 1,
    borderColor: HK.accentBorder,
  },
  hkPremiumOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: HK.textMuted,
  },
  hkPremiumOptionTextActive: {
    color: HK.gold,
    fontWeight: '800',
  },
  hkBody: {
    padding: 10,
  },
  hkPremiumRangeInput: {
    flex: 1,
    minWidth: 120,
    backgroundColor: HK.bg,
    borderWidth: 1,
    borderColor: HK.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontWeight: '600',
    color: HK.text,
  },
  hkStatsGrid: {
    backgroundColor: HK.surfaceRaised,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: HK.border,
  },
  hkStatsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  hkStatsTitles: {
    flex: 1,
  },
  hkStatsKicker: {
    ...SEC_FONTS.label,
    color: HK.textDim,
    marginBottom: 2,
  },
  hkStatsPeriod: {
    fontSize: 12,
    fontWeight: '600',
    color: HK.textMuted,
    lineHeight: 16,
  },
  hkMiniBadgeSuccess: {
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  hkMiniBadgeError: {
    backgroundColor: 'rgba(248, 113, 113, 0.14)',
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  hkMiniBadgeTextSuccess: {
    color: '#34d399',
  },
  hkMiniBadgeTextError: {
    color: HK.red,
  },
  hkDualTable: {
    gap: 6,
  },
  hkDualHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hkDualHeadSpacer: {
    flex: 1.2,
  },
  hkDualHead: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: HK.textDim,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hkDualDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  hkDualRowLab: {
    flex: 1.2,
    fontSize: 13,
    fontWeight: '800',
    color: HK.text,
  },
  hkDualValCell: {
    flex: 1,
    alignItems: 'center',
  },
  hkDualVal: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: HK.text,
  },
  hkValPositive: {
    color: '#34d399',
  },
  hkValNegative: {
    color: HK.red,
  },
  hkDualPct: {
    fontSize: 10,
    fontWeight: '700',
    color: HK.textDim,
    marginTop: 2,
  },
  hkPenaltyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: HK.goldDim,
    borderWidth: 1,
    borderColor: HK.accentBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 12,
  },
  hkPenaltyStripText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: HK.gold,
    lineHeight: 16,
  },
  hkEmptyRoles: {
    fontSize: 13,
    color: HK.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  hkPremiumRoleRowQueued: {
    borderColor: HK.gold,
    backgroundColor: HK.goldDim,
  },
  hkRoleQueuedBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: HK.gold,
  },
  hkPremiumRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HK.surfaceRaised,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: HK.border,
    gap: 8,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  hkRoleName: {
    flex: 1,
    minWidth: 72,
    fontSize: 12,
    fontWeight: '700',
    color: HK.accent,
  },
  hkShiftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: HK.bg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: HK.borderSubtle,
  },
  hkShiftPillWarn: {
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
  },
  hkShiftPillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: HK.textDim,
  },
  hkShiftPillVal: {
    fontSize: 12,
    fontWeight: '800',
    color: HK.text,
  },
  hkShiftValError: {
    color: HK.red,
  },
  hkRoleStatusOk: {
    backgroundColor: '#34d399',
  },
  hkRoleStatusWarn: {
    backgroundColor: HK.red,
  },

  deploymentPhotoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  deploymentPhotoBtn: {
    flex: 1,
    marginTop: 0,
    justifyContent: 'center',
  },
  deploymentPhotoPreviewWrap: {
    position: 'relative',
    marginTop: 8,
    marginBottom: 4,
  },
  deploymentPhotoGeoCaption: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  deploymentPhotoRemove: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    padding: 8,
  },
  deploymentSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  deploymentSelectText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  deploymentSelectPlaceholder: {
    color: COLORS.textLight,
    fontWeight: '500',
  },
  deploymentPickerContainer: {
    maxHeight: '52%',
  },
  deploymentPickerSheet: {
    maxHeight: '100%',
  },
  deploymentPickerScroll: {
    maxHeight: 360,
  },
  deploymentPickerRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  deploymentPickerRowText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  attendancePhotoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginVertical: 0,
  },
  staffFormRoleBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  staffFormRoleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  staffFormShiftRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  staffFormShiftInput: {
    flex: 1,
    minWidth: '45%',
  },
  staffFormShiftLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  staffFormInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  rolePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: COLORS.primary,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  roleChipTextActive: {
    color: COLORS.primary,
  },
  hubBtnTextSecondary: {
    fontSize: 13,
    fontWeight: '800',
    color: SEC.gold,
  },
  hubBtnSecuritySecondary: {
    backgroundColor: SEC.goldDim,
    borderWidth: 1,
    borderColor: SEC.goldBorder,
  },
});
