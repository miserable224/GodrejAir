import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Image,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { pickGeoPhotoFromCamera } from '../utils/geoPhoto';
import { useSafeBottomTabBarHeight } from '../utils/safeTabBarHeight';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS, DARK } from '../constants/theme';
import AmbientBackground from '../components/AmbientBackground';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../modules/shared';

const { width } = Dimensions.get('window');

const MAX_SECURITY_PHOTOS = 10;

const PlaceholderScreen = ({
  title,
  subtitle,
  icon,
  color,
  children,
  singleLineHeader = false,
  contentBottomInset = 0,
  showStackBack = false,
  navigation,
}) => {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const headerTop = singleLineHeader ? insets.top + 6 : Platform.OS === 'ios' ? 56 : 40;
  const headerBottomPad = singleLineHeader ? 12 : 24;
  return (
    <View style={{ flex: 1, backgroundColor: DARK.bg }}>
      <AmbientBackground />
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />
      <LinearGradient
        colors={COLORS.adminHeaderGradient}
        style={[
          styles.header,
          { paddingTop: headerTop, paddingBottom: headerBottomPad },
        ]}
      >
        <View style={[styles.headerRow, singleLineHeader && styles.headerRowSingle]}>
          {showStackBack && navigation ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.stackBackBtn}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
          ) : null}
          <Text
            style={[
              styles.headerTitle,
              singleLineHeader && styles.headerTitleSingle,
              showStackBack && styles.headerTitleWithBack,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        {!singleLineHeader ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
      </LinearGradient>
      <View style={[styles.center, { paddingBottom: contentBottomInset + 20 }]}>
        <View style={[styles.iconBig, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={48} color={color} />
        </View>
        <Text style={styles.comingSoon}>Coming Soon</Text>
        <Text style={styles.comingDesc}>This section is under development and will be available shortly.</Text>
      </View>
    </View>
  );
};

const WORKFORCE_SHIFTS = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'night', label: 'Night' },
];

const SECURITY_DEPLOYMENT_SAMPLE = {
  date: '07/05/2026',
  shift: 'Day',
  supervisorNote: 'Supervisor absent',
  ladyGuards: 2,
  guards: 12,
  total: 14,
  shortage: 1,
  assignments: [
    { id: '1', staff: 'Kumar', post: 'J Gym', role: 'Guard' },
    { id: '2', staff: 'Sharanu', post: 'Exit Gate', role: 'Guard' },
    { id: '3', staff: 'Bishal Madgi', post: 'Main Gate', role: 'Guard' },
    { id: '4', staff: 'Sabir Ali', post: 'J Block', role: 'Guard' },
    { id: '5', staff: 'Mahesh Kumar', post: 'E–H Back Side', role: 'Guard' },
    { id: '6', staff: 'Gopal Krishna', post: 'Swimming Pool', role: 'Guard' },
    { id: '7', staff: 'Sowmya P', post: 'D / Club House', role: 'Lady Guard' },
    { id: '8', staff: 'Tumpa Dutta', post: 'Main Gate', role: 'Lady Guard' },
    { id: '9', staff: 'Ningayya', post: 'A–D Block', role: 'Guard' },
    { id: '10', staff: 'Mani Natrajan', post: 'E–H Block', role: 'Guard' },
    { id: '11', staff: 'Karthik Ravi', post: 'D Corner', role: 'Guard' },
    { id: '12', staff: 'Sabuj Sarkar', post: 'E–H Back Side', role: 'Guard' },
    { id: '13', staff: 'Prasant', post: 'Main Gate', role: 'Guard' },
    { id: '14', staff: 'Govinda Rabi Das', post: 'Main Gate', role: 'Guard' },
  ],
};

const HK_DEPLOYMENT_SAMPLE = {
  date: '30/04/2026',
  total: 21,
  supervisors: ['Muniraj M', 'Praveen'],
  towers: [
    { tower: 'A', staff: 'Shivamma' },
    { tower: 'B', staff: 'Manjula' },
    { tower: 'C', staff: 'Teja' },
    { tower: 'D', staff: 'Manikchand' },
    { tower: 'E', staff: 'Ananda Kumar' },
    { tower: 'F', staff: 'Rani' },
    { tower: 'G', staff: 'Deepa' },
    { tower: 'H', staff: 'Pallavi' },
    { tower: 'J', staff: 'Pullamma Saraswathi' },
  ],
  commonAreas: [
    { area: 'Common Area', staff: 'Bharatamma' },
    { area: 'Common Area', staff: 'Marakka' },
  ],
  clubHouse: [
    { area: 'Club House', staff: 'Vikas' },
  ],
  afternoon: [
    { area: 'General', staff: 'Kamal' },
    { area: 'General', staff: 'Sanjay' },
  ],
  horticulture: [
    { area: 'Horticulture', staff: 'Subramani' },
    { area: 'Horticulture', staff: 'Munirajappa' },
    { area: 'Horticulture', staff: 'Ramappa' },
    { area: 'Horticulture', staff: 'Mahadevappa' },
  ],
  night: [
    { area: 'Night Shift', staff: 'Chittanna' },
    { area: 'Night Shift', staff: 'Kalil' },
    { area: 'Night Shift', staff: 'Kumar' },
    { area: 'Night Shift', staff: 'Sridhar' },
  ],
  weekOff: [],
  leave: ['Renuka', 'Subadramma'],
};

export const WorkforceScreen = ({ route }) => {
  const tabBarH = useSafeBottomTabBarHeight();
  const { logout, token } = useAuth();
  const [tab, setTab] = useState('security'); // 'security' | 'hk'
  const [shift, setShift] = useState('morning');
  const [securityAssignments, setSecurityAssignments] = useState(SECURITY_DEPLOYMENT_SAMPLE.assignments);
  const [hkGroups, setHkGroups] = useState(HK_DEPLOYMENT_SAMPLE);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [hkModalOpen, setHkModalOpen] = useState(false);
  const [securityDeployment, setSecurityDeployment] = useState({
    briefingDone: 'Yes',
    date: SECURITY_DEPLOYMENT_SAMPLE.date,
    shift: SECURITY_DEPLOYMENT_SAMPLE.shift,
    supervisorStatus: SECURITY_DEPLOYMENT_SAMPLE.supervisorNote,
    ladyGuards: String(SECURITY_DEPLOYMENT_SAMPLE.ladyGuards),
    guards: String(SECURITY_DEPLOYMENT_SAMPLE.guards),
    totalRequired: String(SECURITY_DEPLOYMENT_SAMPLE.total + SECURITY_DEPLOYMENT_SAMPLE.shortage),
    totalDeployment: String(SECURITY_DEPLOYMENT_SAMPLE.total),
    shortage: String(SECURITY_DEPLOYMENT_SAMPLE.shortage),
    reportedBy: 'Abishek',
    reportingRole: 'Night shift supervisor',
  });
  const [securityForm, setSecurityForm] = useState({ staff: '', post: '', role: 'Guard' });
  const [securityPhotos, setSecurityPhotos] = useState([]);
  const [securityGeo, setSecurityGeo] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
  });
  const [securityDutyNotes, setSecurityDutyNotes] = useState('');
  const [hkDeployment, setHkDeployment] = useState({
    date: HK_DEPLOYMENT_SAMPLE.date,
    supervisors: HK_DEPLOYMENT_SAMPLE.supervisors.join(', '),
    leave: HK_DEPLOYMENT_SAMPLE.leave.join(', '),
  });
  const [hkForm, setHkForm] = useState({
    category: 'tower',
    tower: 'A',
    area: 'Common Area',
    staff: '',
  });

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const renderShiftChip = (item) => (
    <TouchableOpacity
      key={item.key}
      style={[
        wfStyles.chip,
        shift === item.key && wfStyles.chipActive,
      ]}
      onPress={() => setShift(item.key)}
      activeOpacity={0.85}
    >
      <Text
        style={[
          wfStyles.chipText,
          shift === item.key && wfStyles.chipTextActive,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  useEffect(() => {
    const openForm = route?.params?.openForm;
    if (openForm === 'security') {
      setTab('security');
      setSecurityPhotos([]);
      setSecurityGeo({ latitude: null, longitude: null, accuracy: null });
      setSecurityDutyNotes('');
      setSecurityModalOpen(true);
    } else if (openForm === 'hk') {
      setTab('hk');
      setHkModalOpen(true);
    }
  }, [route?.params?.openForm]);

  // Fetch live data from .NET API on mount
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      try {
        const staffData = await apiService.fetchStaff(token);
        // Map .NET staff to assignments if needed, or just show them
        if (staffData && staffData.length > 0) {
          // For now, let's just show the staff list as assignments for demonstration
          const mapped = staffData.map(s => ({
            id: s.id,
            staff: s.name,
            post: s.role === 'SUPERVISOR' ? 'Office' : 'Gate/Patrol',
            role: s.role
          }));
          setSecurityAssignments(mapped);
          
          // Update summary counts
          setSecurityDeployment(prev => ({
            ...prev,
            guards: String(staffData.filter(s => s.role === 'SECURITY_GUARD').length),
            ladyGuards: String(staffData.filter(s => s.role === 'LADY_GUARD').length),
            totalDeployment: String(staffData.length)
          }));
        }
      } catch (error) {
        console.log('Note: .NET API fetch failed', error.message);
      }
    };
    loadData();
  }, [token]);

  // Removed old Supabase water records fetch

  const takeSecurityPhoto = async () => {
    if (securityPhotos.length >= MAX_SECURITY_PHOTOS) {
      Alert.alert('Photo limit', `You can attach up to ${MAX_SECURITY_PHOTOS} photos.`);
      return;
    }
    try {
      const photo = await pickGeoPhotoFromCamera({ dutyOnly: true, requireGps: true });
      if (!photo?.uri) return;
      setSecurityPhotos((prev) => [...prev, { id: `${Date.now()}`, ...photo }].slice(0, MAX_SECURITY_PHOTOS));
    } catch (e) {
      Alert.alert('Camera', e?.message || 'Could not use camera.');
    }
  };

  const tagSecurityLocation = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow location access to tag this record.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setSecurityGeo({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? null,
      });
    } catch (e) {
      Alert.alert('Location', e?.message || 'Could not read GPS.');
    }
  };

  const removeSecurityPhoto = (id) => {
    setSecurityPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const addSecurityRecord = () => {
    if (!securityForm.staff.trim() || !securityForm.post.trim()) return;
    setSecurityAssignments((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
        staff: securityForm.staff.trim(),
        post: securityForm.post.trim(),
        role: securityForm.role.trim() || 'Guard',
        photoUris: securityPhotos.map((p) => p.uri),
        latitude: securityGeo.latitude,
        longitude: securityGeo.longitude,
        locationAccuracy: securityGeo.accuracy,
        dutyNotes: securityDutyNotes.trim(),
      },
    ]);
    setSecurityForm({ staff: '', post: '', role: 'Guard' });
    setSecurityPhotos([]);
    setSecurityGeo({ latitude: null, longitude: null, accuracy: null });
    setSecurityDutyNotes('');
    setSecurityModalOpen(false);
  };

  const addHkRecord = () => {
    if (!hkForm.staff.trim()) return;
    setHkGroups((prev) => {
      const next = { ...prev };
      const staffName = hkForm.staff.trim();
      const category = hkForm.category;
      let deployedAdded = false;

      if (category === 'tower') {
        next.towers = [...prev.towers, { tower: hkForm.tower.trim() || 'A', staff: staffName }];
        deployedAdded = true;
      } else if (category === 'common') {
        next.commonAreas = [...prev.commonAreas, { area: 'Common Area', staff: staffName }];
        deployedAdded = true;
      } else if (category === 'clubhouse') {
        next.clubHouse = [...prev.clubHouse, { area: 'Club House', staff: staffName }];
        deployedAdded = true;
      } else if (category === 'afternoon') {
        next.afternoon = [...prev.afternoon, { area: 'Afternoon Shift', staff: staffName }];
        deployedAdded = true;
      } else if (category === 'horticulture') {
        next.horticulture = [...prev.horticulture, { area: 'Horticulture', staff: staffName }];
        deployedAdded = true;
      } else if (category === 'night') {
        next.night = [...prev.night, { area: 'Night Shift', staff: staffName }];
        deployedAdded = true;
      } else if (category === 'weekoff') {
        next.weekOff = [...prev.weekOff, staffName];
      } else if (category === 'leave') {
        next.leave = [...prev.leave, staffName];
      }

      if (deployedAdded) next.total = prev.total + 1;
      return next;
    });
    setHkForm({ category: 'tower', tower: 'A', area: 'Common Area', staff: '' });
    setHkModalOpen(false);
  };

  const renderSecurityBody = () => (
    <View style={wfStyles.section}>
      <View style={wfStyles.summaryRow}>
        <View style={wfStyles.summaryPillPrimary}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
          <Text style={wfStyles.summaryPillPrimaryText}>
            {securityAssignments.length} on duty
          </Text>
        </View>
        <View style={wfStyles.summaryPill}>
          <Text style={wfStyles.summaryLabel}>Shortage</Text>
          <Text style={wfStyles.summaryValueDanger}>
            {Math.max(0, Number(securityDeployment.totalRequired || 0) - securityAssignments.length)}
          </Text>
        </View>
      </View>

      <View style={wfStyles.metaRow}>
        <Text style={wfStyles.metaText}>
          Date: {securityDeployment.date} · Shift: {securityDeployment.shift}
        </Text>
        <Text style={wfStyles.metaNote}>{securityDeployment.supervisorStatus}</Text>
      </View>
      <View style={wfStyles.metaRow}>
        <Text style={wfStyles.metaText}>
          Lady Guards: {securityDeployment.ladyGuards || '0'} · S/Guards: {securityDeployment.guards || '0'}
        </Text>
        <Text style={wfStyles.metaText}>
          Deployed: {securityDeployment.totalDeployment || '0'} · Shortage: {securityDeployment.shortage || '0'}
        </Text>
      </View>

      <View style={wfStyles.listCard}>
        <View style={wfStyles.listHeaderRow}>
          <Text style={[wfStyles.listHeaderText, { flex: 2 }]}>Staff</Text>
          <Text style={[wfStyles.listHeaderText, { flex: 2 }]}>Post</Text>
          <Text style={[wfStyles.listHeaderText, { flex: 1, textAlign: 'right' }]}>
            Role
          </Text>
        </View>
        {securityAssignments.map((row) => (
          <View key={row.id} style={wfStyles.listRow}>
            <View style={{ flex: 2 }}>
              <Text style={wfStyles.staffName}>{row.staff}</Text>
              {row.dutyNotes ? (
                <Text style={wfStyles.dutyNotesHint} numberOfLines={1}>
                  {row.dutyNotes}
                </Text>
              ) : null}
            </View>
            <View style={{ flex: 2 }}>
              <Text style={wfStyles.postText}>{row.post}</Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
              {row.photoUris?.length > 0 ? (
                <Ionicons name="images" size={15} color={COLORS.primary} accessibilityLabel={`${row.photoUris.length} photos`} />
              ) : null}
              {row.latitude != null && row.longitude != null ? (
                <Ionicons name="navigate" size={15} color="#059669" accessibilityLabel="Location tagged" />
              ) : null}
              <Text style={wfStyles.roleText} numberOfLines={1}>
                {row.role}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderHKBody = () => (
    <View style={wfStyles.section}>
      <View style={wfStyles.summaryRow}>
        <View style={wfStyles.summaryPillPrimaryAlt}>
          <Ionicons name="people" size={16} color={COLORS.primary} />
          <Text style={wfStyles.summaryPillPrimaryAltText}>
            {hkGroups.total} HK staff
          </Text>
        </View>
        <View style={wfStyles.summaryPill}>
          <Text style={wfStyles.summaryLabel}>Supervisors</Text>
          <Text style={wfStyles.summaryValue}>
            {hkGroups.supervisors.length}
          </Text>
        </View>
      </View>

      <View style={wfStyles.metaRow}>
        <Text style={wfStyles.metaText}>
          Date: {hkDeployment.date} · Sup: {hkDeployment.supervisors || '-'}
        </Text>
        <Text style={wfStyles.metaNote}>Leave: {hkDeployment.leave || '-'}</Text>
      </View>

      <View style={wfStyles.listCard}>
        <Text style={wfStyles.groupLabel}>Towers</Text>
        {hkGroups.towers.map((row) => (
          <View key={row.tower} style={wfStyles.listRow}>
            <Text style={[wfStyles.postText, { flex: 1 }]}>Tower {row.tower}</Text>
            <Text style={[wfStyles.staffName, { flex: 2 }]}>{row.staff}</Text>
          </View>
        ))}

        <Text style={wfStyles.groupLabel}>Common areas</Text>
        {hkGroups.commonAreas.map((row, idx) => (
          <View key={`ca-${idx}`} style={wfStyles.listRow}>
            <Text style={[wfStyles.postText, { flex: 1 }]}>{row.area}</Text>
            <Text style={[wfStyles.staffName, { flex: 2 }]}>{row.staff}</Text>
          </View>
        ))}

        <Text style={wfStyles.groupLabel}>Club house</Text>
        {hkGroups.clubHouse.map((row, idx) => (
          <View key={`c-${idx}`} style={wfStyles.listRow}>
            <Text style={[wfStyles.postText, { flex: 1 }]}>{row.area}</Text>
            <Text style={[wfStyles.staffName, { flex: 2 }]}>{row.staff}</Text>
          </View>
        ))}

        <Text style={wfStyles.groupLabel}>Afternoon shift</Text>
        {hkGroups.afternoon.map((row, idx) => (
          <View key={`a-${idx}`} style={wfStyles.listRow}>
            <Text style={[wfStyles.postText, { flex: 1 }]}>{row.area}</Text>
            <Text style={[wfStyles.staffName, { flex: 2 }]}>{row.staff}</Text>
          </View>
        ))}

        <Text style={wfStyles.groupLabel}>Horticulture</Text>
        {hkGroups.horticulture.map((row, idx) => (
          <View key={`h-${idx}`} style={wfStyles.listRow}>
            <Text style={[wfStyles.postText, { flex: 1 }]}>{row.area}</Text>
            <Text style={[wfStyles.staffName, { flex: 2 }]}>{row.staff}</Text>
          </View>
        ))}

        <Text style={wfStyles.groupLabel}>Night shift</Text>
        {hkGroups.night.map((row, idx) => (
          <View key={`n-${idx}`} style={wfStyles.listRow}>
            <Text style={[wfStyles.postText, { flex: 1 }]}>{row.area}</Text>
            <Text style={[wfStyles.staffName, { flex: 2 }]}>{row.staff}</Text>
          </View>
        ))}

        <Text style={wfStyles.groupLabel}>Week off</Text>
        {hkGroups.weekOff.length ? hkGroups.weekOff.map((row, idx) => (
          <View key={`w-${idx}`} style={wfStyles.listRow}>
            <Text style={[wfStyles.postText, { flex: 1 }]}>Week Off</Text>
            <Text style={[wfStyles.staffName, { flex: 2 }]}>{row}</Text>
          </View>
        )) : <Text style={wfStyles.metaText}>No week off recorded</Text>}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        style={[
          styles.header,
          { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 20 },
        ]}
      >
        <View style={[styles.headerRow, styles.headerRowSingle]}>
          <Text style={[styles.headerTitle, styles.headerTitleSingle]} numberOfLines={1}>
            Workforce
          </Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>Deployment dashboard · {dateLabel}</Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          wfStyles.scrollContent,
          { paddingBottom: tabBarH + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={wfStyles.topRow}>
          <View style={wfStyles.pillTabs}>
            <TouchableOpacity
              style={[wfStyles.pillTab, tab === 'security' && wfStyles.pillTabActive]}
              onPress={() => setTab('security')}
              activeOpacity={0.85}
            >
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={tab === 'security' ? COLORS.white : COLORS.textSecondary}
              />
              <Text
                style={[
                  wfStyles.pillTabText,
                  tab === 'security' && wfStyles.pillTabTextActive,
                ]}
              >
                Security
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[wfStyles.pillTab, tab === 'hk' && wfStyles.pillTabActive]}
              onPress={() => setTab('hk')}
              activeOpacity={0.85}
            >
              <Ionicons
                name="sparkles"
                size={16}
                color={tab === 'hk' ? COLORS.white : COLORS.textSecondary}
              />
              <Text
                style={[
                  wfStyles.pillTabText,
                  tab === 'hk' && wfStyles.pillTabTextActive,
                ]}
              >
                Housekeeping
              </Text>
            </TouchableOpacity>
          </View>

          <View style={wfStyles.shiftRow}>
            {WORKFORCE_SHIFTS.map(renderShiftChip)}
          </View>
        </View>

        <View style={wfStyles.actionsRow}>
          {tab === 'security' ? (
            <TouchableOpacity
              style={wfStyles.actionBtnPrimary}
              activeOpacity={0.9}
              onPress={() => {
                setSecurityPhotos([]);
                setSecurityGeo({ latitude: null, longitude: null, accuracy: null });
                setSecurityDutyNotes('');
                setSecurityModalOpen(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
              <Text style={wfStyles.actionBtnPrimaryText}>Record security duty</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={wfStyles.actionBtnPrimary}
              activeOpacity={0.9}
              onPress={() => setHkModalOpen(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
              <Text style={wfStyles.actionBtnPrimaryText}>Record HK duty</Text>
            </TouchableOpacity>
          )}
        </View>

        {tab === 'security' ? renderSecurityBody() : renderHKBody()}
      </ScrollView>

      <Modal
        visible={securityModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSecurityModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={wfStyles.modalBg}
        >
          <TouchableOpacity
            style={wfStyles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSecurityModalOpen(false)}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={wfStyles.modalScrollOuter}
            contentContainerStyle={wfStyles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={wfStyles.modalCard}>
            <Text style={wfStyles.modalTitle}>Record security duty</Text>
            <TextInput
              style={wfStyles.input}
              placeholder="Briefing done (Yes/No)"
              value={securityDeployment.briefingDone}
              onChangeText={(v) => setSecurityDeployment((p) => ({ ...p, briefingDone: v }))}
            />
            <TextInput
              style={wfStyles.input}
              placeholder="Today date (DD/MM/YY)"
              value={securityDeployment.date}
              onChangeText={(v) => setSecurityDeployment((p) => ({ ...p, date: v }))}
            />
            <TextInput
              style={wfStyles.input}
              placeholder="Shift (Day Shift / Night Shift)"
              value={securityDeployment.shift}
              onChangeText={(v) => setSecurityDeployment((p) => ({ ...p, shift: v }))}
            />
            <TextInput
              style={wfStyles.input}
              placeholder="Supervisor status (e.g. Supervisor absent)"
              value={securityDeployment.supervisorStatus}
              onChangeText={(v) => setSecurityDeployment((p) => ({ ...p, supervisorStatus: v }))}
            />
            <View style={wfStyles.inputRow}>
              <TextInput
                style={[wfStyles.input, wfStyles.inputHalf]}
                placeholder="Lady Guard count"
                keyboardType="numeric"
                value={securityDeployment.ladyGuards}
                onChangeText={(v) => setSecurityDeployment((p) => ({ ...p, ladyGuards: v }))}
              />
              <TextInput
                style={[wfStyles.input, wfStyles.inputHalf]}
                placeholder="S/Guard count"
                keyboardType="numeric"
                value={securityDeployment.guards}
                onChangeText={(v) => setSecurityDeployment((p) => ({ ...p, guards: v }))}
              />
            </View>
            <View style={wfStyles.inputRow}>
              <TextInput
                style={[wfStyles.input, wfStyles.inputHalf]}
                placeholder="Total manpower deployment"
                keyboardType="numeric"
                value={securityDeployment.totalDeployment}
                onChangeText={(v) => setSecurityDeployment((p) => ({ ...p, totalDeployment: v }))}
              />
              <TextInput
                style={[wfStyles.input, wfStyles.inputHalf]}
                placeholder="Shortage"
                keyboardType="numeric"
                value={securityDeployment.shortage}
                onChangeText={(v) => setSecurityDeployment((p) => ({ ...p, shortage: v }))}
              />
            </View>
            <TextInput
              style={wfStyles.input}
              placeholder="Total required manpower (optional)"
              keyboardType="numeric"
              value={securityDeployment.totalRequired}
              onChangeText={(v) => setSecurityDeployment((p) => ({ ...p, totalRequired: v }))}
            />
            <View style={wfStyles.inputRow}>
              <TextInput
                style={[wfStyles.input, wfStyles.inputHalf]}
                placeholder="Reported by"
                value={securityDeployment.reportedBy}
                onChangeText={(v) => setSecurityDeployment((p) => ({ ...p, reportedBy: v }))}
              />
              <TextInput
                style={[wfStyles.input, wfStyles.inputHalf]}
                placeholder="Role"
                value={securityDeployment.reportingRole}
                onChangeText={(v) => setSecurityDeployment((p) => ({ ...p, reportingRole: v }))}
              />
            </View>
            <Text style={wfStyles.formSectionTitle}>Add security staff</Text>
            <TextInput
              style={wfStyles.input}
              placeholder="Guard name"
              value={securityForm.staff}
              onChangeText={(v) => setSecurityForm((p) => ({ ...p, staff: v }))}
            />
            <TextInput
              style={wfStyles.input}
              placeholder="Post (e.g. Main Gate)"
              value={securityForm.post}
              onChangeText={(v) => setSecurityForm((p) => ({ ...p, post: v }))}
            />
            <TextInput
              style={wfStyles.input}
              placeholder="Role (Guard / Lady Guard)"
              value={securityForm.role}
              onChangeText={(v) => setSecurityForm((p) => ({ ...p, role: v }))}
            />

            <Text style={wfStyles.formSectionTitle}>Duty photos (max {MAX_SECURITY_PHOTOS})</Text>
            <TouchableOpacity style={wfStyles.formSecondaryBtn} onPress={takeSecurityPhoto} activeOpacity={0.85}>
              <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
              <Text style={wfStyles.formSecondaryBtnText}>Take photo</Text>
            </TouchableOpacity>
            <Text style={wfStyles.photoCountHint}>
              {securityPhotos.length} / {MAX_SECURITY_PHOTOS} selected
            </Text>
            {securityPhotos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={wfStyles.photoStrip}>
                {securityPhotos.map((ph) => (
                  <View key={ph.id} style={wfStyles.photoThumbWrap}>
                    <Image source={{ uri: ph.uri }} style={wfStyles.photoThumb} />
                    <TouchableOpacity
                      style={wfStyles.photoRemove}
                      onPress={() => removeSecurityPhoto(ph.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Remove photo"
                    >
                      <Ionicons name="close-circle" size={22} color="#B91C1C" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <Text style={wfStyles.formSectionTitle}>Geo tag</Text>
            <TouchableOpacity style={wfStyles.formSecondaryBtnWide} onPress={tagSecurityLocation} activeOpacity={0.85}>
              <Ionicons name="location-outline" size={18} color={COLORS.primary} />
              <Text style={wfStyles.formSecondaryBtnText}>Tag current GPS location</Text>
            </TouchableOpacity>
            {securityGeo.latitude != null && securityGeo.longitude != null ? (
              <Text style={wfStyles.geoCoordsText}>
                {Number(securityGeo.latitude).toFixed(6)}, {Number(securityGeo.longitude).toFixed(6)}
                {securityGeo.accuracy != null ? ` (±${Math.round(securityGeo.accuracy)}m)` : ''}
              </Text>
            ) : (
              <Text style={wfStyles.geoMuted}>No location saved for this line yet.</Text>
            )}

            <Text style={wfStyles.formSectionTitle}>Duty notes (optional)</Text>
            <TextInput
              style={[wfStyles.input, wfStyles.inputMultiline]}
              placeholder="Observations, incidents, handover notes…"
              value={securityDutyNotes}
              onChangeText={setSecurityDutyNotes}
              multiline
            />

            <TouchableOpacity
              style={wfStyles.saveBtnPrimary}
              activeOpacity={0.9}
              onPress={addSecurityRecord}
            >
              <Text style={wfStyles.saveBtnPrimaryText}>Save</Text>
            </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={hkModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setHkModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={wfStyles.modalBg}
        >
          <TouchableOpacity
            style={wfStyles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setHkModalOpen(false)}
          />
          <View style={wfStyles.modalCard}>
            <Text style={wfStyles.modalTitle}>Record HK duty</Text>
            <TextInput
              style={wfStyles.input}
              placeholder="Deployment date (DD/MM/YYYY)"
              value={hkDeployment.date}
              onChangeText={(v) => setHkDeployment((p) => ({ ...p, date: v }))}
            />
            <TextInput
              style={wfStyles.input}
              placeholder="Supervisors (comma separated)"
              value={hkDeployment.supervisors}
              onChangeText={(v) => setHkDeployment((p) => ({ ...p, supervisors: v }))}
            />
            <TextInput
              style={wfStyles.input}
              placeholder="Leave names (comma separated)"
              value={hkDeployment.leave}
              onChangeText={(v) => setHkDeployment((p) => ({ ...p, leave: v }))}
            />
            <Text style={wfStyles.formSectionTitle}>Add HK staff</Text>
            <View style={wfStyles.choiceWrap}>
              {[
                { key: 'tower', label: 'Tower' },
                { key: 'common', label: 'Common' },
                { key: 'clubhouse', label: 'Club House' },
                { key: 'afternoon', label: 'Afternoon' },
                { key: 'horticulture', label: 'Horticulture' },
                { key: 'night', label: 'Night' },
                { key: 'weekoff', label: 'Week Off' },
                { key: 'leave', label: 'Leave' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    wfStyles.choiceChip,
                    hkForm.category === opt.key && wfStyles.choiceChipActive,
                  ]}
                  onPress={() => setHkForm((p) => ({ ...p, category: opt.key }))}
                >
                  <Text
                    style={[
                      wfStyles.choiceChipText,
                      hkForm.category === opt.key && wfStyles.choiceChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {hkForm.category === 'tower' ? (
              <TextInput
                style={wfStyles.input}
                placeholder="Tower (A/B/C.../J)"
                value={hkForm.tower}
                onChangeText={(v) => setHkForm((p) => ({ ...p, tower: v }))}
              />
            ) : null}
            <TextInput
              style={wfStyles.input}
              placeholder="Area (optional note)"
              value={hkForm.area}
              onChangeText={(v) => setHkForm((p) => ({ ...p, area: v }))}
            />
            <TextInput
              style={wfStyles.input}
              placeholder="Staff name"
              value={hkForm.staff}
              onChangeText={(v) => setHkForm((p) => ({ ...p, staff: v }))}
            />
            <TouchableOpacity
              style={wfStyles.saveBtnPrimary}
              activeOpacity={0.9}
              onPress={addHkRecord}
            >
              <Text style={wfStyles.saveBtnPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
export const SecurityScreen = () => <PlaceholderScreen title="Security" subtitle="Visitor log & gate management" icon="shield-checkmark" color="#EF4444" />;
export const ExpensesScreen = () => <PlaceholderScreen title="Expenses" subtitle="Financial overview & billing" icon="wallet" color="#10B981" />;
export const AMCScreen = () => <PlaceholderScreen title="AMC & Documents" subtitle="Contracts & maintenance records" icon="document-text" color="#8B5CF6" />;
export const AdminAmenitiesScreen = () => <PlaceholderScreen title="Amenities" subtitle="Facilities management" icon="star" color="#F5A623" />;
export const AdminServicesScreen = () => <PlaceholderScreen title="Services" subtitle="Service requests & vendors" icon="construct" color="#06B6D4" />;
export const ReportsScreen = () => <PlaceholderScreen title="Reports" subtitle="Analytics & insights" icon="bar-chart" color="#6366F1" />;
export const SettingsScreen = () => <PlaceholderScreen title="Settings" subtitle="System configuration" icon="settings" color="#6B7280" />;

/** Admin tab: tenants / units (uses tab bar height for bottom padding). */
export function AdminTenantScreen() {
  const tabBarH = useSafeBottomTabBarHeight();
  return (
    <PlaceholderScreen
      singleLineHeader
      contentBottomInset={tabBarH}
      title="Tenants"
      subtitle="Unit directory, leases & occupancy"
      icon="business"
      color="#0F766E"
    />
  );
}

/** @deprecated Import from `./admin/AdminSettingsScreen` */
export { default as AdminSettingsScreen } from './admin/AdminSettingsScreen';

/** @deprecated Import from `./admin/AdminPromotionsScreen` */
export { default as AdminPromotionsScreen } from './admin/AdminPromotionsScreen';

/** Pushed from admin dashboard: MyGate tickets. */
export function AdminMyGateTicketsScreen({ navigation }) {
  return (
    <PlaceholderScreen
      showStackBack
      navigation={navigation}
      singleLineHeader
      title="MyGate tickets"
      subtitle="Gate & helpdesk queue"
      icon="ticket"
      color="#0284C7"
    />
  );
}

// Resident Screens
export const MoveInOutScreen = () => <PlaceholderScreen title="Move In / Out" subtitle="Manage relocation requests" icon="swap-horizontal" color="#3B82F6" />;
export const AmenitiesScreen = () => <PlaceholderScreen title="Amenities" subtitle="Book club, gym, pool & more" icon="star" color="#F5A623" />;
export const ServicesScreen = () => <PlaceholderScreen title="Services" subtitle="Request maintenance & more" icon="construct" color="#10B981" />;
export const EventsScreen = () => <PlaceholderScreen title="Events" subtitle="Discover community events" icon="calendar" color="#8B5CF6" />;
export const CommunicationScreen = () => <PlaceholderScreen title="Communication" subtitle="Notices & announcements" icon="chatbubbles" color="#06B6D4" />;
export const HelpdeskScreen = () => <PlaceholderScreen title="Helpdesk" subtitle="Raise and track tickets" icon="headset" color="#EF4444" />;

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerRowSingle: { marginBottom: 0, minHeight: 40, alignItems: 'center' },
  stackBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: { flex: 1, fontSize: SIZES.fontXxl, fontWeight: '800', color: COLORS.white, paddingRight: 8 },
  headerTitleSingle: { fontSize: SIZES.fontXl, letterSpacing: -0.2 },
  headerTitleWithBack: { paddingRight: 4 },
  logoutBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerSub: { fontSize: SIZES.fontSm, color: 'rgba(255,255,255,0.65)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconBig: {
    width: 100, height: 100, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  comingSoon: { fontSize: SIZES.fontXxl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  comingDesc: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
});

const wfStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  pillTabs: {
    flexDirection: 'row',
    backgroundColor: '#E8ECF8',
    borderRadius: SIZES.radiusFull,
    padding: 4,
    flex: 1.1,
  },
  pillTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: SIZES.radiusFull,
  },
  pillTabActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.small,
  },
  pillTabText: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pillTabTextActive: {
    color: COLORS.white,
  },
  shiftRow: {
    flexDirection: 'row',
    flex: 0.9,
    justifyContent: 'flex-end',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#1D4ED8',
  },
  section: {
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  summaryPillPrimary: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.primary,
  },
  summaryPillPrimaryText: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.white,
  },
  summaryPillPrimaryAlt: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryPillPrimaryAltText: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  summaryPill: {
    flex: 0.8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: SIZES.fontLg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  summaryValueDanger: {
    fontSize: SIZES.fontLg,
    fontWeight: '800',
    color: COLORS.danger,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  metaNote: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '700',
  },
  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  listHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  staffName: {
    fontSize: SIZES.fontSm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  postText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  roleText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
    fontWeight: '600',
  },
  groupLabel: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.primary,
  },
  actionBtnPrimaryText: {
    fontSize: SIZES.fontSm,
    fontWeight: '700',
    color: COLORS.white,
  },
  modalBg: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopLeftRadius: SIZES.radiusXl,
    borderTopRightRadius: SIZES.radiusXl,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
    marginBottom: 10,
    backgroundColor: COLORS.background,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputHalf: {
    flex: 1,
  },
  formSectionTitle: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  choiceChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  choiceChipActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  choiceChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  choiceChipTextActive: {
    color: '#1D4ED8',
  },
  modalScrollOuter: {
    maxHeight: Platform.OS === 'web' ? '92%' : '86%',
    width: '100%',
    alignSelf: 'flex-end',
  },
  modalScrollContent: {
    paddingBottom: 12,
  },
  dutyNotesHint: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  formSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  formSecondaryBtnWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
    marginBottom: 6,
  },
  formSecondaryBtnText: {
    fontSize: SIZES.fontSm,
    fontWeight: '700',
    color: COLORS.primary,
  },
  photoCountHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  photoStrip: {
    marginBottom: 10,
    maxHeight: 88,
  },
  photoThumbWrap: {
    marginRight: 10,
    position: 'relative',
  },
  photoThumb: {
    width: 76,
    height: 76,
    borderRadius: SIZES.radiusMd,
    backgroundColor: '#E5E7EB',
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  geoCoordsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  geoMuted: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  saveBtnPrimary: {
    marginTop: 6,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  saveBtnPrimaryText: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: COLORS.white,
  },
});
