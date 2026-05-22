import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, DARK } from '../../constants/theme';
import { PROMO } from '../../constants/moduleThemes';
import { formatINR } from '../../constants/data';
import AmbientBackground from '../../components/AmbientBackground';
import { buildModuleFormStyles } from '../../styles/moduleFormStyles';
import { useAuth } from '../../context/AuthContext';
import {
  fetchBoardMembers,
  fetchPromotionTypes,
  fetchPromotionVendors,
  fetchPromotions,
  createPromotion,
} from '../../modules/promotions/services/promotionsService';
import { ensureValidAccessToken } from '../../modules/shared/services/authService';

const GST_RATE = 0.18;
const GST_LABEL = '18%';
const form = buildModuleFormStyles(PROMO);

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoAddMonths(iso, months) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + months);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, '0');
  const nd = String(dt.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

function parseCount(value) {
  const n = parseInt(String(value).replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function parsePrice(value) {
  const n = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function parseIsoDate(value) {
  const t = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const [y, m, d] = t.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return t;
}

function computeLine(count, unitPrice) {
  const subtotal = Math.round(count * unitPrice * 100) / 100;
  const gstAmount = Math.round(subtotal * GST_RATE * 100) / 100;
  const total = Math.round((subtotal + gstAmount) * 100) / 100;
  return { subtotal, gstAmount, total };
}

function FormSelect({ label, placeholder, value, options, onChange, getLabel, required }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  const display = selected ? getLabel(selected) : '';

  return (
    <View style={styles.selectBlock}>
      <Text style={form.sectionLabel}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <TouchableOpacity
        style={form.select}
        activeOpacity={0.85}
        onPress={() => setOpen(true)}
      >
        <Text
          style={[form.selectText, !display && form.selectPlaceholder]}
          numberOfLines={1}
        >
          {display || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={PROMO.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalRow, item.id === value && styles.modalRowActive]}
                  onPress={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.modalRowText}>{getLabel(item)}</Text>
                  {item.subtitle ? (
                    <Text style={styles.modalRowSub}>{item.subtitle}</Text>
                  ) : null}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function AdminPromotionsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [types, setTypes] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [selectedBoardMemberId, setSelectedBoardMemberId] = useState(null);
  const [startDate, setStartDate] = useState(isoToday);
  const [endDate, setEndDate] = useState(() => isoAddMonths(isoToday(), 1));
  const [countText, setCountText] = useState('');
  const [priceText, setPriceText] = useState('');
  const [saved, setSaved] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const count = parseCount(countText);
  const unitPrice = parsePrice(priceText);
  const preview = useMemo(() => computeLine(count, unitPrice), [count, unitPrice]);

  const selectedType = types.find((t) => t.id === selectedTypeId);
  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);
  const selectedBoard = boardMembers.find((b) => b.id === selectedBoardMemberId);

  const vendorOptions = useMemo(
    () =>
      vendors.map((v) => ({
        id: v.id,
        subtitle: [v.contactPerson, v.phone].filter(Boolean).join(' · '),
        vendorName: v.vendorName,
        contactPerson: v.contactPerson,
        phone: v.phone,
      })),
    [vendors],
  );

  const boardOptions = useMemo(
    () =>
      boardMembers.map((b) => ({
        id: b.id,
        label: b.label,
        subtitle: b.phone || '',
        name: b.name,
        role: b.role,
        phone: b.phone,
      })),
    [boardMembers],
  );

  const loadMeta = useCallback(async () => {
    if (!token) return;
    setLoadingMeta(true);
    try {
      const typeRows = await fetchPromotionTypes(token);
      const vendorRows = await fetchPromotionVendors(token);
      const boardRows = await fetchBoardMembers(token);
      const typeList = Array.isArray(typeRows) ? typeRows : [];
      const vendorList = Array.isArray(vendorRows) ? vendorRows : [];
      const boardList = Array.isArray(boardRows) ? boardRows : [];
      setTypes(typeList);
      setVendors(vendorList);
      setBoardMembers(boardList);
      if (typeList[0]?.id) setSelectedTypeId((prev) => prev || typeList[0].id);
      if (vendorList[0]?.id) setSelectedVendorId((prev) => prev || vendorList[0].id);
      if (boardList[0]?.id) setSelectedBoardMemberId((prev) => prev || boardList[0].id);
    } catch (err) {
      Alert.alert('Setup error', err?.message || 'Could not load promotion options.');
    } finally {
      setLoadingMeta(false);
    }
  }, [token]);

  const loadSaved = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const rows = await fetchPromotions(token);
      setSaved(Array.isArray(rows) ? rows : []);
    } catch (err) {
      Alert.alert('Could not load promotions', err?.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadMeta();
      loadSaved();
    }, [loadMeta, loadSaved]),
  );

  const resetForm = () => {
    const today = isoToday();
    setStartDate(today);
    setEndDate(isoAddMonths(today, 1));
    setCountText('');
    setPriceText('');
    if (boardMembers[0]?.id) setSelectedBoardMemberId(boardMembers[0].id);
  };

  const onBookPromotion = async () => {
    setSaveError('');

    if (!selectedTypeId) {
      const msg = 'Select a promotion type.';
      setSaveError(msg);
      Alert.alert('Required', msg);
      return;
    }
    if (!selectedVendorId) {
      const msg = 'Select a vendor.';
      setSaveError(msg);
      Alert.alert('Required', msg);
      return;
    }
    if (boardMembers.length > 0 && !selectedBoardMemberId) {
      const msg = 'Select the associated board member.';
      setSaveError(msg);
      Alert.alert('Required', msg);
      return;
    }

    const start = parseIsoDate(startDate);
    const end = parseIsoDate(endDate);
    if (!start || !end) {
      const msg = 'Enter valid dates (YYYY-MM-DD).';
      setSaveError(msg);
      Alert.alert('Invalid dates', msg);
      return;
    }
    if (end < start) {
      const msg = 'End date must be on or after start date.';
      setSaveError(msg);
      Alert.alert('Invalid dates', msg);
      return;
    }
    if (count <= 0) {
      const msg = 'Count must be greater than zero.';
      setSaveError(msg);
      Alert.alert('Invalid count', msg);
      return;
    }
    if (unitPrice < 0 || priceText.trim() === '') {
      const msg = 'Enter a valid unit price.';
      setSaveError(msg);
      Alert.alert('Invalid price', msg);
      return;
    }

    setSaving(true);
    try {
      const accessToken = (await ensureValidAccessToken()) || token;
      if (!accessToken) throw new Error('Not signed in. Please log in again.');

      await createPromotion(accessToken, {
        promotionTypeId: selectedTypeId,
        vendorId: selectedVendorId,
        boardMemberId: selectedBoardMemberId || undefined,
        promotionTitle: selectedType?.name,
        quantity: count,
        unitPrice,
        startDate: start,
        endDate: end,
      });
      resetForm();
      await loadSaved();
      Alert.alert('Booked', 'Promotion booked successfully.');
    } catch (err) {
      const msg = err?.message || 'Try again.';
      setSaveError(msg);
      Alert.alert('Booking failed', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loadingMeta && types.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={PROMO.accent} />
        <Text style={styles.loadingText}>Loading booking form…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />
      <LinearGradient
        colors={COLORS.adminHeaderGradient}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 12 : 8) }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Book Promotion
          </Text>
          <View style={styles.backSpacer} />
        </View>
        <Text style={styles.headerSub}>Dates, pricing, vendor & board member</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={form.sectionLabel}>Book promotion</Text>
        <Text style={form.hint}>
          Complete all required fields. GST at {GST_LABEL} is applied automatically on the total.
        </Text>

        <FormSelect
          label="Promotion type"
          placeholder="Select type"
          value={selectedTypeId}
          options={types}
          onChange={setSelectedTypeId}
          getLabel={(o) => o.name}
          required
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={form.sectionLabel}>Start date *</Text>
            <TextInput
              style={form.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={PROMO.textDim}
              value={startDate}
              onChangeText={setStartDate}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.half}>
            <Text style={form.sectionLabel}>End date *</Text>
            <TextInput
              style={form.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={PROMO.textDim}
              value={endDate}
              onChangeText={setEndDate}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={form.sectionLabel}>Count *</Text>
            <TextInput
              style={form.input}
              placeholder="Qty"
              placeholderTextColor={PROMO.textDim}
              value={countText}
              onChangeText={setCountText}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.half}>
            <Text style={form.sectionLabel}>Unit price (₹) *</Text>
            <TextInput
              style={form.input}
              placeholder="0.00"
              placeholderTextColor={PROMO.textDim}
              value={priceText}
              onChangeText={setPriceText}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <FormSelect
          label="Vendor"
          placeholder="Select vendor"
          value={selectedVendorId}
          options={vendorOptions}
          onChange={setSelectedVendorId}
          getLabel={(o) => o.vendorName}
          required
        />

        {selectedVendor ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{selectedVendor.vendorName}</Text>
            <Text style={styles.infoLine}>
              Contact: {selectedVendor.contactPerson || '—'}
            </Text>
            <Text style={styles.infoLine}>Phone: {selectedVendor.phone || '—'}</Text>
          </View>
        ) : null}

        {boardMembers.length > 0 ? (
          <FormSelect
            label="Associated board member"
            placeholder="Select board member"
            value={selectedBoardMemberId}
            options={boardOptions}
            onChange={setSelectedBoardMemberId}
            getLabel={(o) => o.label}
            required
          />
        ) : (
          <Text style={styles.emptyHint}>No board members in database. Add one in Supabase.</Text>
        )}

        {selectedBoard ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{selectedBoard.name}</Text>
            {selectedBoard.role ? (
              <Text style={styles.infoLine}>Role: {selectedBoard.role}</Text>
            ) : null}
            {selectedBoard.phone ? (
              <Text style={styles.infoLine}>Phone: {selectedBoard.phone}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.gstBadge}>
          <Ionicons name="receipt-outline" size={16} color={PROMO.accent} />
          <Text style={styles.gstBadgeText}>GST {GST_LABEL} (fixed)</Text>
        </View>

        <View style={styles.summaryCard}>
          <SummaryRow label="Subtotal" value={formatINR(preview.subtotal)} />
          <SummaryRow label={`GST (${GST_LABEL})`} value={formatINR(preview.gstAmount)} />
          <SummaryRow label="Total" value={formatINR(preview.total)} strong />
        </View>

        {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            saving && styles.saveBtnDisabled,
            pressed && !saving && styles.saveBtnPressed,
          ]}
          onPress={() => onBookPromotion()}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Book Promotion"
        >
          {saving ? (
            <ActivityIndicator color={PROMO.saveOnAccent} />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={20} color={PROMO.saveOnAccent} />
              <Text style={styles.saveBtnText}>Book Promotion</Text>
            </>
          )}
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booked promotions</Text>
          {loading ? (
            <ActivityIndicator color={PROMO.accent} style={{ marginTop: 12 }} />
          ) : saved.length === 0 ? (
            <Text style={styles.emptyHint}>No promotions booked yet.</Text>
          ) : (
            saved.map((row) => (
              <View key={row.id} style={styles.savedCard}>
                <Text style={styles.savedTitle}>
                  {row.promotionTitle || row.promotionType}
                </Text>
                <Text style={styles.savedMeta}>
                  {row.vendorName} · {row.startDate} → {row.endDate}
                </Text>
                <Text style={styles.savedMeta}>
                  {row.quantity} × {formatINR(row.unitPrice)} · {row.promotionStatus} · GST{' '}
                  {Number(row.gstPercentage).toFixed(0)}%
                </Text>
                <Text style={styles.savedTotal}>{formatINR(row.totalAmount)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryRow({ label, value, strong }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong && styles.summaryLabelStrong]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: DARK.muted, fontSize: SIZES.fontSm },
  header: { paddingBottom: 14, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  backSpacer: { width: 36 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: SIZES.fontLg,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSub: {
    marginTop: 6,
    fontSize: SIZES.fontSm,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 18 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  selectBlock: { marginBottom: 4 },
  infoCard: {
    backgroundColor: DARK.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    padding: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '700',
    color: DARK.text,
    marginBottom: 4,
  },
  infoLine: {
    fontSize: SIZES.fontSm,
    color: DARK.muted,
    lineHeight: 20,
  },
  gstBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: PROMO.accentDim,
    borderWidth: 1,
    borderColor: PROMO.accentBorder,
    marginBottom: 12,
  },
  gstBadgeText: { fontSize: 12, fontWeight: '700', color: PROMO.accent },
  summaryCard: {
    backgroundColor: DARK.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    padding: 14,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: { fontSize: SIZES.fontSm, color: DARK.muted },
  summaryLabelStrong: { fontWeight: '700', color: DARK.text },
  summaryValue: { fontSize: SIZES.fontSm, color: DARK.text, fontWeight: '600' },
  summaryValueStrong: {
    fontSize: SIZES.fontMd,
    fontWeight: '800',
    color: PROMO.accent,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PROMO.saveAccent,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnPressed: { opacity: 0.88 },
  saveError: {
    color: '#f87171',
    fontSize: SIZES.fontSm,
    marginBottom: 10,
    lineHeight: 20,
  },
  saveBtnText: {
    fontSize: SIZES.fontMd,
    fontWeight: '800',
    color: PROMO.saveOnAccent,
  },
  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: SIZES.fontXs,
    fontWeight: '700',
    color: DARK.label,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  savedCard: {
    backgroundColor: DARK.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    padding: 12,
    marginBottom: 8,
  },
  savedTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '700',
    color: DARK.text,
    marginBottom: 2,
  },
  savedMeta: {
    fontSize: SIZES.fontSm,
    color: DARK.muted,
    marginBottom: 2,
  },
  savedTotal: {
    fontSize: SIZES.fontMd,
    fontWeight: '800',
    color: PROMO.accent,
    marginTop: 2,
  },
  emptyHint: {
    fontSize: SIZES.fontSm,
    color: DARK.muted,
    lineHeight: 20,
    marginBottom: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: DARK.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '800',
    color: DARK.text,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: DARK.inputBorder,
  },
  modalList: { maxHeight: 320 },
  modalRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DARK.inputBorder,
  },
  modalRowActive: { backgroundColor: PROMO.accentDim },
  modalRowText: { fontSize: SIZES.fontMd, fontWeight: '600', color: DARK.text },
  modalRowSub: { fontSize: SIZES.fontSm, color: DARK.muted, marginTop: 2 },
  modalClose: { alignItems: 'center', padding: 14 },
  modalCloseText: { fontSize: SIZES.fontMd, fontWeight: '700', color: PROMO.accent },
});
