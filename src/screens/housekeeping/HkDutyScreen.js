import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, DARK } from '../../constants/theme';
import { ADMIN_MANPOWER_DEPLOYMENT } from '../../constants/data';
import { useAuth } from '../../context/AuthContext';
import ModulePhotoSection from '../../components/ModulePhotoSection';
import { pickGeoPhotoForDuty, photoHasGps, alertGpsRequired } from '../../utils/geoPhoto';
import { fetchStaff } from '../../modules/security/services/securityService';
import {
  fetchOpenHkDutySession,
  fetchOnDutyHkSessions,
  postHkDutyCheckIn,
  postHkDutyCheckOut,
} from '../../modules/housekeeping/services/housekeepingService';
import {
  filterNamesAvailableForCheckIn,
  isStaffOnDuty,
} from '../../modules/security/utils/dutyStaffOptions';
import { ensureValidAccessToken } from '../../modules/shared/services/authService';

const HK_ROLES = ADMIN_MANPOWER_DEPLOYMENT.filter((r) => r.category === 'FM_HK').map((r) => r.role);
const HK_DUTY_DEFAULT_LOCATION = 'On site';

const PHOTO_THEME = {
  accent: DARK.teal,
  teal: DARK.teal,
  border: DARK.inputBorder,
  bg: DARK.bg,
  surfaceRaised: DARK.card,
  textDim: DARK.muted,
};

function formatTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

export default function HkDutyScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const initialMode = route?.params?.mode === 'check-out' ? 'check-out' : 'check-in';

  const [dutyMode, setDutyMode] = useState(initialMode);
  const [staffName, setStaffName] = useState(user?.name || '');
  const [designation, setDesignation] = useState(HK_ROLES[0] || 'Housekeeping Staff');
  const [photo, setPhoto] = useState(null);
  const [openSession, setOpenSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [onDutySessions, setOnDutySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [designationPickerOpen, setDesignationPickerOpen] = useState(false);

  const isOnDuty = openSession?.status === 'open';

  useEffect(() => {
    const m = route?.params?.mode;
    if (m === 'check-in' || m === 'check-out') setDutyMode(m);
  }, [route?.params?.mode]);

  const refreshOpenSession = useCallback(async (name) => {
    const accessToken = (await ensureValidAccessToken()) || token;
    if (!accessToken || !name?.trim()) {
      setOpenSession(null);
      return;
    }
    const session = await fetchOpenHkDutySession(accessToken, name.trim());
    setOpenSession(session);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const accessToken = (await ensureValidAccessToken()) || token;
        if (accessToken) {
          const [staff, onDuty] = await Promise.all([
            fetchStaff(accessToken),
            fetchOnDutyHkSessions(accessToken),
          ]);
          if (!cancelled && Array.isArray(staff)) {
            setRoster(staff.filter((s) => (s.isActive ?? s.IsActive) !== false));
          }
          if (!cancelled) {
            setOnDutySessions(Array.isArray(onDuty) ? onDuty : []);
          }
        }
        if (!cancelled) await refreshOpenSession(staffName);
      } catch (err) {
        if (!cancelled) console.warn('HK duty screen load:', err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, staffName, refreshOpenSession]);

  const rosterNames = useMemo(() => {
    const names = roster.map((s) => s.name ?? s.Name).filter(Boolean);
    if (staffName?.trim() && !names.some((n) => n.toLowerCase() === staffName.trim().toLowerCase())) {
      names.unshift(staffName.trim());
    }
    return [...new Set(names)];
  }, [roster, staffName]);

  const checkInStaffOptions = useMemo(
    () => filterNamesAvailableForCheckIn(rosterNames, onDutySessions),
    [rosterNames, onDutySessions],
  );

  const staffPickerOptions =
    dutyMode === 'check-in' && !isOnDuty
      ? checkInStaffOptions
      : rosterNames;

  const onCheckIn = async () => {
    const name = staffName.trim();
    if (!name) {
      Alert.alert('Staff name', 'Enter or select your name.');
      return;
    }
    if (isStaffOnDuty(name, onDutySessions)) {
      Alert.alert(
        'Already on duty',
        `${name} is already checked in. Check out before a new check-in.`,
      );
      return;
    }
    if (!photo?.uri && !photo?.file) {
      Alert.alert('Photo required', 'Take a verification photo with the camera.');
      return;
    }
    if (!photoHasGps(photo)) {
      alertGpsRequired();
      return;
    }

    const accessToken = (await ensureValidAccessToken()) || token;
    if (!accessToken) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    setSaving(true);
    try {
      const session = await postHkDutyCheckIn(accessToken, {
        staffName: name,
        locationName: HK_DUTY_DEFAULT_LOCATION,
        designation: designation.trim() || null,
        photo,
        latitude: photo.latitude ?? null,
        longitude: photo.longitude ?? null,
        accuracy: photo.accuracy ?? null,
        capturedAt: photo.capturedAt ?? null,
      });
      setOpenSession(session);
      setPhoto(null);
      const onDuty = await fetchOnDutyHkSessions(accessToken);
      setOnDutySessions(Array.isArray(onDuty) ? onDuty : []);
      Alert.alert('Checked in', `On duty since ${formatTime(session.entryAt)}.`);
    } catch (err) {
      Alert.alert('Check-in failed', err?.message || 'Could not save check-in.');
    } finally {
      setSaving(false);
    }
  };

  const onCheckOut = async () => {
    if (!openSession?.id) {
      Alert.alert('Not on duty', 'No open check-in found for this staff member.');
      return;
    }
    if ((photo?.uri || photo?.file) && !photoHasGps(photo)) {
      alertGpsRequired();
      return;
    }

    const accessToken = (await ensureValidAccessToken()) || token;
    if (!accessToken) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    setSaving(true);
    try {
      const session = await postHkDutyCheckOut(accessToken, openSession.id, {
        photo: photo?.uri || photo?.file ? photo : null,
        latitude: photo?.latitude ?? null,
        longitude: photo?.longitude ?? null,
        accuracy: photo?.accuracy ?? null,
        capturedAt: photo?.capturedAt ?? null,
      });
      setOpenSession(null);
      setPhoto(null);
      Alert.alert(
        'Checked out',
        session.durationLabel
          || (session.durationMinutes != null
            ? `Duty ended (${session.durationMinutes} min).`
            : 'Duty session closed.'),
      );
    } catch (err) {
      Alert.alert('Check-out failed', err?.message || 'Could not save check-out.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0F766E', '#14B8A6']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {dutyMode === 'check-out' ? 'Check out' : 'Check in'}
        </Text>
        <Text style={styles.headerSub}>Housekeeping duty</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={DARK.teal} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {isOnDuty ? (
            <View style={styles.statusCardOn}>
              <Ionicons name="radio-button-on" size={20} color="#22C55E" />
              <View style={styles.statusTextWrap}>
                <Text style={styles.statusTitle}>On duty</Text>
                <Text style={styles.statusSub}>{openSession.staffName}</Text>
                <Text style={styles.statusMeta}>Since {formatTime(openSession.entryAt)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.statusCardOff}>
              <Ionicons name="ellipse-outline" size={20} color={DARK.muted} />
              <Text style={styles.statusOffText}>Not checked in</Text>
            </View>
          )}

          <Text style={styles.label}>Staff name</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => {
              if (dutyMode === 'check-in' && !isOnDuty && checkInStaffOptions.length === 0) {
                Alert.alert(
                  'Everyone on duty',
                  'All listed staff are already checked in. Check someone out first.',
                );
                return;
              }
              setStaffPickerOpen(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.pickerBtnText}>{staffName || 'Select staff'}</Text>
            <Ionicons name="chevron-down" size={18} color={DARK.muted} />
          </TouchableOpacity>

          {dutyMode === 'check-in' && !isOnDuty ? (
            <>
              <Text style={styles.label}>Designation</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setDesignationPickerOpen(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.pickerBtnText}>{designation}</Text>
                <Ionicons name="chevron-down" size={18} color={DARK.muted} />
              </TouchableOpacity>
            </>
          ) : null}

          <Text style={styles.label}>
            {dutyMode === 'check-out' ? 'Check-out photo (optional)' : 'Check-in photo (required)'}
          </Text>
          <ModulePhotoSection
            theme={PHOTO_THEME}
            photo={photo}
            onCamera={async () => {
              const p = await pickGeoPhotoForDuty();
              if (p) setPhoto(p);
            }}
            onRemovePhoto={() => setPhoto(null)}
          />

          <View style={styles.dualActionRow}>
            <TouchableOpacity
              style={[styles.dualBtn, styles.dualBtnIn, dutyMode === 'check-in' && styles.dualBtnActive]}
              onPress={() => setDutyMode('check-in')}
              disabled={saving}
            >
              <Ionicons name="log-in-outline" size={20} color="#93C5FD" />
              <Text style={styles.dualBtnTextIn}>Check in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dualBtn, styles.dualBtnOut, dutyMode === 'check-out' && styles.dualBtnActiveOut]}
              onPress={() => setDutyMode('check-out')}
              disabled={saving}
            >
              <Ionicons name="log-out-outline" size={20} color="#FCA5A5" />
              <Text style={styles.dualBtnTextOut}>Check out</Text>
            </TouchableOpacity>
          </View>

          {dutyMode === 'check-out' ? (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.checkOutBtn, (saving || !isOnDuty) && styles.btnDisabled]}
              onPress={onCheckOut}
              disabled={saving || !isOnDuty}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={22} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Confirm check out</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, (saving || isOnDuty) && styles.btnDisabled]}
              onPress={onCheckIn}
              disabled={saving || isOnDuty}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={22} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Confirm check in</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <PickerModal
        visible={staffPickerOpen}
        title="Select staff"
        options={
          staffPickerOptions.length
            ? staffPickerOptions
            : dutyMode === 'check-in' && !isOnDuty
              ? []
              : [staffName || 'Staff']
        }
        onSelect={(v) => {
          setStaffName(v);
          setStaffPickerOpen(false);
          refreshOpenSession(v);
        }}
        onClose={() => setStaffPickerOpen(false)}
      />
      <PickerModal
        visible={designationPickerOpen}
        title="Select designation"
        options={HK_ROLES}
        onSelect={(v) => {
          setDesignation(v);
          setDesignationPickerOpen(false);
        }}
        onClose={() => setDesignationPickerOpen(false)}
      />
    </View>
  );
}

function PickerModal({ visible, title, options, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={modalStyles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={modalStyles.title}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={modalStyles.row} onPress={() => onSelect(item)}>
                <Text style={modalStyles.rowText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={modalStyles.cancel} onPress={onClose}>
            <Text style={modalStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK.bg },
  header: { paddingHorizontal: 16, paddingBottom: 20 },
  backBtn: { marginBottom: 8, alignSelf: 'flex-start', padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusCardOn: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: SIZES.radiusLg,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    marginBottom: 20,
  },
  statusCardOff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: SIZES.radiusLg,
    backgroundColor: DARK.card,
    marginBottom: 20,
  },
  statusTextWrap: { flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#22C55E' },
  statusSub: { fontSize: 14, color: DARK.text, marginTop: 2 },
  statusMeta: { fontSize: 12, color: DARK.muted, marginTop: 4 },
  statusOffText: { fontSize: 15, fontWeight: '600', color: DARK.muted },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: DARK.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DARK.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  pickerBtnText: { fontSize: 15, fontWeight: '600', color: DARK.text, flex: 1 },
  dualActionRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 10 },
  dualBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dualBtnIn: {
    borderColor: 'rgba(37, 99, 235, 0.45)',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  dualBtnOut: {
    borderColor: 'rgba(220, 38, 38, 0.4)',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  dualBtnActive: { borderWidth: 2, borderColor: '#2563EB' },
  dualBtnActiveOut: { borderWidth: 2, borderColor: '#DC2626' },
  dualBtnTextIn: { fontSize: 14, fontWeight: '700', color: '#93C5FD' },
  dualBtnTextOut: { fontSize: 14, fontWeight: '700', color: '#FCA5A5' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#0F766E',
  },
  checkOutBtn: { backgroundColor: '#DC2626' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  btnDisabled: { opacity: 0.6 },
});

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '70%',
    backgroundColor: DARK.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: DARK.text,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: DARK.inputBorder,
  },
  row: { paddingVertical: 14, paddingHorizontal: 20 },
  rowText: { fontSize: 15, color: DARK.text },
  cancel: { padding: 16, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: DARK.teal },
});
