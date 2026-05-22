import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, DARK } from '../../constants/theme';
import { SEC } from '../../constants/moduleThemes';
import { useAuth } from '../../context/AuthContext';
import { ensureValidAccessToken } from '../../modules/shared';
import {
  fetchDutySessionsRange,
  fetchOnDutySessions,
} from '../../modules/security';
import {
  fetchHkDutySessionsRange,
  fetchOnDutyHkSessions,
  resolveWorkforceDateParams,
} from '../../modules/housekeeping';
import { aggregateHoursByStaff } from '../../modules/security/utils/dutyDuration';
import { resolveSecurityDateParams } from '../../modules/security/utils/securityDateParams';
import DutySessionsTable from '../../components/DutySessionsTable';
import {
  sessionMatchesShift,
  SHIFT_LABELS,
  SHIFT_SUBLABELS,
} from '../../modules/security/utils/dutyShiftFilter';

const DATE_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom' },
];

const MODULE_CONFIG = {
  security: {
    title: 'Security',
    subtitle: 'Deployment, billing & shift strength',
    headerColors: ['#1E3A5F', '#2563EB'],
    fetchRange: fetchDutySessionsRange,
    fetchOnDuty: fetchOnDutySessions,
    locationLabel: 'Post',
  },
  housekeeping: {
    title: 'Housekeeping',
    subtitle: 'Duty sessions & hours on site',
    headerColors: ['#0F766E', '#14B8A6'],
    fetchRange: fetchHkDutySessionsRange,
    fetchOnDuty: fetchOnDutyHkSessions,
    locationLabel: 'Location',
  },
};

export default function AdminDutyAttendanceScreen({ navigation, route }) {
  const moduleKey = route?.params?.module === 'housekeeping' ? 'housekeeping' : 'security';
  const config = MODULE_CONFIG[moduleKey];
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [datePreset, setDatePreset] = useState('today');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [staffFilter, setStaffFilter] = useState('all');
  const [sessions, setSessions] = useState([]);
  const [onDuty, setOnDuty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [activeShift, setActiveShift] = useState(1);

  const dateParams = useMemo(() => {
    if (moduleKey === 'housekeeping') {
      return resolveWorkforceDateParams(datePreset, customRange);
    }
    const map = { today: 'Today', week: 'Last 1 Week', month: 'Last 1 Month', custom: 'Custom Range' };
    return resolveSecurityDateParams(map[datePreset] ?? 'Today', customRange);
  }, [moduleKey, datePreset, customRange.from, customRange.to]);

  useFocusEffect(
    useCallback(() => {
      const stackNav = navigation.getParent();
      if (moduleKey === 'security') {
        stackNav?.navigate('AdminTabs', {
          screen: 'Home',
          params: { expandSecurityDeployment: true },
        });
        navigation.goBack();
        return;
      }
      if (moduleKey === 'housekeeping') {
        stackNav?.navigate('AdminTabs', {
          screen: 'Home',
          params: { expandHousekeepingDeployment: true },
        });
        navigation.goBack();
      }
    }, [moduleKey, navigation]),
  );

  const loadHousekeepingData = useCallback(async () => {
    if (moduleKey !== 'housekeeping') return;
    if (!dateParams.valid) {
      setSessions([]);
      setOnDuty([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const accessToken = (await ensureValidAccessToken()) || token;
      if (!accessToken) throw new Error('Not signed in');
      const [rangeList, onDutyList] = await Promise.all([
        config.fetchRange(accessToken, { from: dateParams.from, to: dateParams.to }),
        config.fetchOnDuty(accessToken),
      ]);
      setSessions(Array.isArray(rangeList) ? rangeList : []);
      setOnDuty(Array.isArray(onDutyList) ? onDutyList : []);
    } catch (err) {
      setError(err?.message || 'Could not load duty data.');
      setSessions([]);
      setOnDuty([]);
    } finally {
      setLoading(false);
    }
  }, [moduleKey, config, dateParams.from, dateParams.to, dateParams.valid, token]);

  useFocusEffect(
    useCallback(() => {
      if (moduleKey === 'housekeeping') {
        loadHousekeepingData();
      }
      return undefined;
    }, [moduleKey, loadHousekeepingData]),
  );

  useEffect(() => {
    if (moduleKey !== 'housekeeping') return undefined;
    const hasOpen = sessions.some((s) => s.status === 'open') || onDuty.length > 0;
    if (!hasOpen) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, [moduleKey, sessions, onDuty]);

  const staffOptions = useMemo(() => {
    const names = new Set();
    for (const s of sessions) {
      const n = (s.staffName || '').trim();
      if (n) names.add(n);
    }
    for (const s of onDuty) {
      const n = (s.staffName || '').trim();
      if (n) names.add(n);
    }
    return ['all', ...[...names].sort((a, b) => a.localeCompare(b))];
  }, [sessions, onDuty]);

  const filteredSessions = useMemo(() => {
    let list = sessions;
    if (staffFilter !== 'all') {
      const needle = staffFilter.toLowerCase();
      list = list.filter((s) => (s.staffName || '').trim().toLowerCase() === needle);
    }
    if (datePreset === 'today') {
      list = list.filter((s) => sessionMatchesShift(s, activeShift));
    }
    return list;
  }, [sessions, staffFilter, activeShift, datePreset, tick]);

  const hoursByStaff = useMemo(
    () => aggregateHoursByStaff(filteredSessions),
    [filteredSessions, tick],
  );

  const dateLabel = DATE_PRESETS.find((p) => p.key === datePreset)?.label ?? 'Today';
  const staffFilterLabel = staffFilter === 'all' ? 'All employees' : staffFilter;

  const onRefresh = () => {
    loadHousekeepingData();
  };

  const renderDateFilters = (showEmployeeFilter) => (
    <>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.filterChip}
          onPress={() => setDateMenuOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={16} color={SEC.gold} />
          <Text style={styles.filterChipText}>{dateLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={SEC.textMuted} />
        </TouchableOpacity>
        {showEmployeeFilter ? (
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => setStaffPickerOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="person-outline" size={16} color={SEC.teal} />
            <Text style={styles.filterChipText} numberOfLines={1}>
              {staffFilterLabel}
            </Text>
            <Ionicons name="chevron-down" size={14} color={SEC.textMuted} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.85}>
          <Ionicons name="refresh-outline" size={20} color={SEC.teal} />
        </TouchableOpacity>
      </View>
      {datePreset === 'custom' ? (
        <View style={styles.customRangeRow}>
          <TextInput
            style={styles.rangeInput}
            placeholder="From DD/MM/YYYY"
            placeholderTextColor={SEC.textDim}
            value={customRange.from}
            onChangeText={(t) => setCustomRange((p) => ({ ...p, from: t }))}
          />
          <TextInput
            style={styles.rangeInput}
            placeholder="To DD/MM/YYYY"
            placeholderTextColor={SEC.textDim}
            value={customRange.to}
            onChangeText={(t) => setCustomRange((p) => ({ ...p, to: t }))}
          />
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={config.headerColors}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{config.title}</Text>
        <Text style={styles.headerSub}>{config.subtitle}</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {moduleKey === 'security' ? (
          <View style={styles.redirectWrap}>
            <ActivityIndicator color={SEC.teal} />
            <Text style={styles.redirectText}>Opening Security on Home…</Text>
          </View>
        ) : (
          <>
            {renderDateFilters(true)}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {datePreset === 'today' ? (
              <View style={styles.shiftFilterRow}>
                <View>
                  <Text style={styles.sectionTitle}>Shift filter</Text>
                  <Text style={styles.shiftFilterSub}>{SHIFT_SUBLABELS[activeShift]}</Text>
                </View>
                <View style={styles.shiftPills}>
                  {[1, 2].map((n) => {
                    const on = activeShift === n;
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[styles.shiftPill, on && styles.shiftPillOn]}
                        onPress={() => setActiveShift(n)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.shiftPillText, on && styles.shiftPillTextOn]}>
                          {SHIFT_LABELS[n]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {hoursByStaff.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Total hours in period</Text>
                <View style={styles.totalsRow}>
                  {hoursByStaff.map((row) => (
                    <View key={row.staffName} style={styles.totalChip}>
                      <Text style={styles.totalName} numberOfLines={1}>
                        {row.staffName}
                      </Text>
                      <Text style={styles.totalHours}>{row.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.sectionTitle}>
              Duty grid ({filteredSessions.length})
              {dateParams.label ? ` · ${dateParams.label}` : ''}
            </Text>

            {loading ? (
              <ActivityIndicator color={SEC.teal} style={styles.loader} />
            ) : (
              <DutySessionsTable
                sessions={filteredSessions}
                locationColumnLabel={config.locationLabel}
                emptyMessage="No sessions for this filter."
              />
            )}
          </>
        )}
      </ScrollView>

      <PickerSheet
        visible={dateMenuOpen}
        title="Date range"
        options={DATE_PRESETS.map((p) => p.label)}
        onSelect={(label) => {
          const key = DATE_PRESETS.find((p) => p.label === label)?.key ?? 'today';
          setDatePreset(key);
          setDateMenuOpen(false);
        }}
        onClose={() => setDateMenuOpen(false)}
      />

      <PickerSheet
        visible={staffPickerOpen}
        title="Employee"
        options={staffOptions.map((o) => (o === 'all' ? 'All employees' : o))}
        onSelect={(label) => {
          setStaffFilter(label === 'All employees' ? 'all' : label);
          setStaffPickerOpen(false);
        }}
        onClose={() => setStaffPickerOpen(false)}
      />
    </View>
  );
}

function PickerSheet({ visible, title, options, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose}>
        <View style={pickerStyles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={pickerStyles.title}>{title}</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={pickerStyles.row}
                onPress={() => onSelect(opt)}
              >
                <Text style={pickerStyles.rowText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: DARK.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 28,
    maxHeight: '70%',
  },
  title: {
    fontSize: SIZES.fontMd,
    fontWeight: '800',
    color: DARK.text,
    marginBottom: 12,
  },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: DARK.inputBorder },
  rowText: { fontSize: SIZES.fontMd, color: DARK.text, fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSub: {
    fontSize: SIZES.fontSm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.surfaceRaised,
  },
  filterChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: SEC.text,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SEC.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SEC.surfaceRaised,
  },
  customRangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: SEC.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: SEC.text,
    backgroundColor: SEC.bg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: SEC.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 10,
  },
  loader: { marginVertical: 16 },
  errorText: { color: SEC.red, marginBottom: 12, fontSize: 13 },
  shiftFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  shiftFilterSub: { fontSize: 11, color: SEC.textDim, marginTop: 2 },
  shiftPills: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: SEC.border,
  },
  shiftPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  shiftPillOn: {
    backgroundColor: 'rgba(37, 99, 235, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.6)',
  },
  shiftPillText: { fontSize: 12, fontWeight: '700', color: SEC.textMuted },
  shiftPillTextOn: { color: '#E0F2FE' },
  totalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  totalChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: SEC.surfaceRaised,
    borderWidth: 1,
    borderColor: SEC.border,
    minWidth: 100,
  },
  totalName: { fontSize: 12, fontWeight: '700', color: SEC.text },
  totalHours: { fontSize: 14, fontWeight: '800', color: SEC.teal, marginTop: 4 },
  redirectWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  redirectText: { fontSize: 14, color: SEC.textMuted },
});
