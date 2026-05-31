import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SEC, SEC_FONTS } from '../constants/moduleThemes';

const PHOTO_TYPE_LABEL = {
  starting_meter: 'Starting meter',
  ending_meter: 'Ending meter',
  tds: 'TDS',
  vehicle_number: 'Vehicle plate',
  unknown: 'Photo',
};

function photoLabel(type) {
  return PHOTO_TYPE_LABEL[(type || 'unknown').toLowerCase()] || 'Photo';
}

function PhotoViewer({ photos, index, onClose, onChangeIndex }) {
  if (!photos || photos.length === 0) return null;
  const safeIndex = Math.max(0, Math.min(index, photos.length - 1));
  const current = photos[safeIndex];
  const { width, height } = Dimensions.get('window');
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={viewerStyles.backdrop}>
        <Pressable style={viewerStyles.closeBtn} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <View style={[viewerStyles.imageWrap, { width: width - 24, height: height * 0.65 }]}>
          {current?.uri ? (
            <Image source={{ uri: current.uri }} style={viewerStyles.image} resizeMode="contain" />
          ) : (
            <Text style={viewerStyles.missing}>No image</Text>
          )}
        </View>
        <View style={viewerStyles.captionWrap}>
          <Text style={viewerStyles.caption}>
            {photoLabel(current?.detectedType)}
            {current?.detectedValue ? ` · ${current.detectedValue}` : ''}
          </Text>
          {current?.capturedAt ? (
            <Text style={viewerStyles.subCaption}>
              {new Date(current.capturedAt).toLocaleString()}
            </Text>
          ) : null}
          {typeof current?.lat === 'number' && typeof current?.lng === 'number' ? (
            <Text style={viewerStyles.subCaption}>
              {current.lat.toFixed(5)}, {current.lng.toFixed(5)}
            </Text>
          ) : null}
          {photos.length > 1 ? (
            <View style={viewerStyles.pager}>
              <Pressable
                onPress={() => onChangeIndex(Math.max(0, safeIndex - 1))}
                disabled={safeIndex === 0}
                style={[viewerStyles.pagerBtn, safeIndex === 0 && viewerStyles.pagerBtnDisabled]}
              >
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </Pressable>
              <Text style={viewerStyles.pagerText}>
                {safeIndex + 1} / {photos.length}
              </Text>
              <Pressable
                onPress={() => onChangeIndex(Math.min(photos.length - 1, safeIndex + 1))}
                disabled={safeIndex === photos.length - 1}
                style={[
                  viewerStyles.pagerBtn,
                  safeIndex === photos.length - 1 && viewerStyles.pagerBtnDisabled,
                ]}
              >
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const viewerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 36,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  imageWrap: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  missing: { color: '#888', fontSize: 14 },
  captionWrap: { marginTop: 14, alignItems: 'center' },
  caption: { color: '#fff', fontSize: 14, fontWeight: '700' },
  subCaption: { color: '#bbb', fontSize: 12, marginTop: 4 },
  pager: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 14 },
  pagerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerBtnDisabled: { opacity: 0.35 },
  pagerText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

function tankStatusColors(band) {
  if (band === 'critical') return { accent: SEC.red, dim: SEC.redDim, border: SEC.redBorder, label: 'Critical' };
  if (band === 'warning') return { accent: SEC.gold, dim: SEC.goldDim, border: SEC.goldBorder, label: 'Warning' };
  return { accent: SEC.green, dim: SEC.greenDim, border: SEC.greenBorder, label: 'Safe' };
}

function createStyles() {
  return StyleSheet.create({
    shell: { backgroundColor: SEC.bg, paddingBottom: 8, width: '100%' },
    card: { backgroundColor: SEC.surface, overflow: 'hidden' },
    header: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: SEC.borderSubtle,
    },
    headerTitle: { ...SEC_FONTS.title, color: SEC.text },
    headerSub: { fontSize: 12, color: SEC.textMuted, fontWeight: '500', marginTop: 4 },
    body: { padding: 10 },
    tankCard: {
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: SEC.border,
      padding: 12,
      marginBottom: 12,
    },
    tankTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    tankTitle: { fontSize: 13, fontWeight: '800', color: SEC.text },
    tankPctPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
    },
    tankPctText: { fontSize: 14, fontWeight: '800' },
    tankStatus: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
    tankMeta: { fontSize: 11, color: SEC.textMuted, marginBottom: 8 },
    barTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: SEC.bg,
      overflow: 'hidden',
      marginBottom: 8,
    },
    barFill: { height: '100%', borderRadius: 4 },
    tankRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    miniStat: {
      flex: 1,
      backgroundColor: SEC.bg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: SEC.borderSubtle,
      padding: 8,
    },
    miniLabel: { fontSize: 9, fontWeight: '700', color: SEC.textDim, marginBottom: 2 },
    miniVal: { fontSize: 12, fontWeight: '800', color: SEC.text },
    alertsWrap: { marginTop: 6 },
    alertText: { fontSize: 10, color: SEC.textMuted, lineHeight: 15, marginBottom: 2 },
    chipScroll: { marginBottom: 8 },
    chipRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: SEC.border,
      backgroundColor: SEC.bg,
    },
    chipActive: {
      borderColor: SEC.greenBorder,
      backgroundColor: SEC.greenDim,
    },
    chipText: { fontSize: 11, fontWeight: '600', color: SEC.textMuted },
    chipTextActive: { color: SEC.green, fontWeight: '800' },
    customRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    customInput: {
      flex: 1,
      backgroundColor: SEC.bg,
      borderWidth: 1,
      borderColor: SEC.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 10,
      fontSize: 13,
      color: SEC.text,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    statBox: {
      width: '48%',
      flexGrow: 1,
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: SEC.border,
      padding: 10,
    },
    statLabel: { ...SEC_FONTS.label, color: SEC.textDim, marginBottom: 4 },
    statVal: { fontSize: 16, fontWeight: '800', color: SEC.teal },
    auditCard: {
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: SEC.border,
      padding: 10,
      marginBottom: 12,
    },
    auditTitle: { fontSize: 12, fontWeight: '800', color: SEC.text, marginBottom: 6 },
    auditLine: { fontSize: 11, color: SEC.textMuted, marginBottom: 2 },
    hubRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    hubBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      borderRadius: 10,
    },
    hubPrimary: { backgroundColor: SEC.green },
    hubSecondary: {
      backgroundColor: SEC.tealDim,
      borderWidth: 1,
      borderColor: 'rgba(45, 212, 191, 0.35)',
    },
    hubTextPrimary: { fontSize: 12, fontWeight: '800', color: SEC.bg },
    hubText: { fontSize: 12, fontWeight: '800', color: SEC.teal },
    hint: { fontSize: 10, color: SEC.textDim, lineHeight: 14, marginBottom: 10 },
    sectionHead: { ...SEC_FONTS.label, color: SEC.textDim, marginBottom: 8 },
    logCard: {
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: SEC.border,
      padding: 10,
      marginBottom: 8,
    },
    logTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    logDate: { fontSize: 12, fontWeight: '800', color: SEC.teal },
    logVehicle: { fontSize: 11, fontWeight: '700', color: SEC.textMuted },
    logMeta: { fontSize: 10, color: SEC.textDim, lineHeight: 14 },
    photoStripWrap: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: SEC.borderSubtle,
    },
    photoStripLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: SEC.textMuted,
      marginBottom: 6,
    },
    photoStrip: { flexGrow: 0 },
    photoThumbWrap: { marginRight: 8, width: 72 },
    photoThumb: {
      width: 72,
      height: 72,
      borderRadius: 8,
      backgroundColor: SEC.bg,
      borderWidth: 1,
      borderColor: SEC.border,
    },
    photoThumbMissing: { alignItems: 'center', justifyContent: 'center' },
    photoThumbLabel: {
      fontSize: 9,
      color: SEC.textMuted,
      marginTop: 4,
      textAlign: 'center',
    },
    vendorAccHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: SEC.border,
      padding: 12,
      marginTop: 12,
    },
    vendorAccTitle: { fontSize: 13, fontWeight: '800', color: SEC.text },
    vendorAccSub: { fontSize: 11, color: SEC.textMuted, marginTop: 2 },
    vendorAccBody: {
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: SEC.border,
      borderTopWidth: 0,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      padding: 10,
      marginTop: -1,
    },
    vendorRate: {
      fontSize: 10,
      fontWeight: '700',
      color: SEC.teal,
      marginBottom: 8,
    },
    vendorHeaderRow: {
      flexDirection: 'row',
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: SEC.borderSubtle,
      marginBottom: 4,
      minWidth: 520,
    },
    vendorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: SEC.borderSubtle,
      minWidth: 520,
    },
    vendorRowTotal: { backgroundColor: SEC.bg, borderBottomWidth: 0 },
    vendorCellVendor: { width: 130, paddingRight: 6 },
    vendorCellNum: { width: 78, textAlign: 'right' },
    vendorCellMoney: { width: 78, textAlign: 'right' },
    vendorCellHead: { fontSize: 10, fontWeight: '800', color: SEC.textMuted },
    vendorCell: { fontSize: 11, color: SEC.text },
    vendorCellShortfall: { color: SEC.red, fontWeight: '700' },
    vendorName: { fontSize: 12, fontWeight: '700', color: SEC.text },
    vendorMeta: { fontSize: 9, color: SEC.textMuted, marginTop: 2 },
    vendorTotalLabel: { fontWeight: '800', color: SEC.text },
    vendorLegend: {
      fontSize: 9,
      color: SEC.textMuted,
      marginTop: 8,
      lineHeight: 13,
    },

    // ── Redesigned vendor cost grid ────────────────────────────────────────
    totalsRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 8 },
    totalsCard: {
      flex: 1,
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: SEC.border,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    totalsLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: SEC.textMuted,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    totalsValue: {
      fontSize: 20,
      fontWeight: '800',
      color: SEC.text,
      marginTop: 4,
    },
    totalsSub: { fontSize: 10, color: SEC.textDim, marginTop: 2 },

    varianceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    tariffText: { fontSize: 10, color: SEC.teal, fontWeight: '700' },
    variancePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    varianceText: { fontSize: 11, fontWeight: '800' },

    emptyCard: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: SEC.borderSubtle,
      paddingVertical: 32,
      paddingHorizontal: 16,
      marginTop: 8,
    },
    emptyTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: SEC.text,
      marginTop: 8,
    },
    emptySub: {
      fontSize: 11,
      color: SEC.textMuted,
      marginTop: 4,
      textAlign: 'center',
    },

    // ── Single consolidated grid ───────────────────────────────────────────
    gridCard: {
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: SEC.border,
      overflow: 'hidden',
      marginTop: 12,
    },
    gridHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: SEC.bg,
      borderBottomWidth: 1,
      borderBottomColor: SEC.border,
    },
    gridHeadCell: {
      fontSize: 9,
      fontWeight: '800',
      color: SEC.textMuted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    gridHeadRight: { textAlign: 'right' },
    gridDataRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: SEC.borderSubtle,
    },
    gridTotalRow: {
      backgroundColor: 'rgba(20,184,166,0.06)',
      borderBottomWidth: 2,
      borderBottomColor: SEC.border,
    },
    gridSubHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: SEC.bg,
      borderBottomWidth: 1,
      borderBottomColor: SEC.borderSubtle,
    },
    gridSubHeadText: {
      fontSize: 9,
      fontWeight: '800',
      color: SEC.textMuted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    gridTariffMini: {
      fontSize: 9,
      fontWeight: '700',
      color: SEC.teal,
    },
    gridSubHeadRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    refreshBtn: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: SEC.bg,
      borderWidth: 1,
      borderColor: SEC.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyRefresh: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: SEC.tealBorder ?? 'rgba(20,184,166,0.35)',
      backgroundColor: SEC.tealDim ?? 'rgba(20,184,166,0.08)',
    },
    emptyRefreshText: {
      fontSize: 11,
      fontWeight: '700',
      color: SEC.teal,
    },
    gridColVendor: { flex: 2.2, paddingRight: 6 },
    gridColNum: { flex: 1, alignItems: 'flex-end', paddingLeft: 4 },
    gridVendorName: {
      fontSize: 13,
      fontWeight: '800',
      color: SEC.text,
    },
    gridVendorMeta: {
      fontSize: 10,
      color: SEC.textMuted,
      marginTop: 2,
    },
    // ₹ is the primary number in each cell now (per "i want to see the cost
    // in the grid"). KL drops to a small caption underneath.
    gridCostMain: {
      fontSize: 14,
      fontWeight: '800',
      color: SEC.text,
      textAlign: 'right',
    },
    gridKlSub: {
      fontSize: 10,
      fontWeight: '700',
      color: SEC.textMuted,
      marginTop: 2,
      textAlign: 'right',
    },
    gridValueVariance: {
      fontSize: 14,
      fontWeight: '800',
      textAlign: 'right',
    },
    gridTotalLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: SEC.text,
    },
    empty: { fontSize: 12, color: SEC.textDim, paddingVertical: 8 },
  });
}

function Chip({ label, active, onPress, styles: s }) {
  return (
    <TouchableOpacity
      style={[s.chip, active && s.chipActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function WaterModulePanel({
  metrics,
  waterFilter,
  onWaterFilterChange,
  waterCustomFrom,
  waterCustomTo,
  onWaterCustomFromChange,
  onWaterCustomToChange,
  waterSourceFilter,
  onWaterSourceFilterChange,
  waterTankerFilter,
  onWaterTankerFilterChange,
  onRecordInput,
  onAddVendor,
  onRefresh,
  refreshing = false,
}) {
  const s = useMemo(() => createStyles(), []);
  const formatInr = (n) => {
    const v = Math.round(Number(n) || 0);
    const sign = v < 0 ? '-' : '';
    return `${sign}₹${Math.abs(v).toLocaleString('en-IN')}`;
  };
  // Compact Indian currency for tight grid cells on mobile.
  //   ≥ 1 Cr  → ₹1.50Cr
  //   ≥ 10 K  → ₹0.23L   (e.g. 22,880 → ₹0.23L; 1,37,280 → ₹1.37L)
  //   < 10 K  → ₹5,200   (full digits — already short enough)
  const formatInrCompact = (n) => {
    const v = Math.round(Number(n) || 0);
    const sign = v < 0 ? '-' : '';
    const abs = Math.abs(v);
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
    if (abs >= 10000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
    return `${sign}₹${abs.toLocaleString('en-IN')}`;
  };
  const formatNum = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');
  const formatLitres = (litres) => `${formatNum(litres)} L`;
  const formatLitresVariance = (litres) => {
    const v = Math.round(Number(litres) || 0);
    if (v === 0) return '0 L';
    const sign = v > 0 ? '+' : '-';
    return `${sign}${Math.abs(v).toLocaleString('en-IN')} L`;
  };
  const declaredLitresPerLoad = metrics.waterDeclaredLitresPerLoad ?? 12500;

  return (
    <View style={s.shell}>
      <View style={s.card}>
        <LinearGradient
          colors={SEC.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
        >
          <Text style={s.headerTitle}>Vendor delivery summary</Text>
          <Text style={s.headerSub}>Declared vs received litres per tanker vendor</Text>
        </LinearGradient>

        <View style={s.body}>
          {/* Period selector — single row of chips. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
            <View style={s.chipRow}>
              {[
                { key: 'today', label: 'Today' },
                { key: 'week', label: '1 Week' },
                { key: 'month', label: '1 Month' },
                { key: 'custom', label: 'Custom' },
              ].map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  active={waterFilter === f.key}
                  onPress={() => onWaterFilterChange(f.key)}
                  styles={s}
                />
              ))}
            </View>
          </ScrollView>

          {waterFilter === 'custom' ? (
            <View style={s.customRow}>
              <TextInput
                style={s.customInput}
                placeholder="From (DD/MM/YY)"
                placeholderTextColor={SEC.textDim}
                value={waterCustomFrom}
                onChangeText={onWaterCustomFromChange}
              />
              <TextInput
                style={s.customInput}
                placeholder="To (DD/MM/YY)"
                placeholderTextColor={SEC.textDim}
                value={waterCustomTo}
                onChangeText={onWaterCustomToChange}
              />
            </View>
          ) : null}

          {/* Single consolidated vendor cost grid with totals inside */}
          {(metrics.vendorSummary?.length ?? 0) === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="cube-outline" size={28} color={SEC.textMuted} />
              <Text style={s.emptyTitle}>No vendor data yet</Text>
              <Text style={s.emptySub}>
                Record a tanker entry to start tracking declared vs received litres.
              </Text>
              {onRefresh ? (
                <TouchableOpacity
                  onPress={onRefresh}
                  style={s.emptyRefresh}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={refreshing ? 'sync' : 'refresh-outline'}
                    size={14}
                    color={SEC.teal}
                  />
                  <Text style={s.emptyRefreshText}>
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={s.gridCard}>
              {/* Column header row — labels align with the numeric cells below. */}
              <View style={s.gridHeadRow}>
                <View style={s.gridColVendor}>
                  <Text style={s.gridHeadCell}>Vendor</Text>
                </View>
                <View style={s.gridColNum}>
                  <Text style={[s.gridHeadCell, s.gridHeadRight]}>Declared (L)</Text>
                </View>
                <View style={s.gridColNum}>
                  <Text style={[s.gridHeadCell, s.gridHeadRight]}>Received (L)</Text>
                </View>
                <View style={s.gridColNum}>
                  <Text style={[s.gridHeadCell, s.gridHeadRight]}>Variance (L)</Text>
                </View>
              </View>

              {/* Totals row — now lives inside the grid, on the same columns. */}
              {(() => {
                const t = metrics.vendorSummaryTotals;
                const isShort = t.varianceLitres < -1;
                const tone = isShort ? SEC.red : SEC.green;
                return (
                  <View style={[s.gridDataRow, s.gridTotalRow]}>
                    <View style={s.gridColVendor}>
                      <Text style={s.gridTotalLabel}>Total</Text>
                      <Text style={s.gridVendorMeta} numberOfLines={1}>
                        {metrics.vendorSummary.length} vendor
                        {metrics.vendorSummary.length === 1 ? '' : 's'} ·{' '}
                        {t.loads} load{t.loads === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <View style={s.gridColNum}>
                      <Text style={[s.gridCostMain, s.gridTotalLabel]}>
                        {formatLitres(t.declaredLitres)}
                      </Text>
                    </View>
                    <View style={s.gridColNum}>
                      <Text style={[s.gridCostMain, s.gridTotalLabel]}>
                        {formatLitres(t.measuredLitres)}
                      </Text>
                    </View>
                    <View style={s.gridColNum}>
                      <Text style={[s.gridValueVariance, s.gridTotalLabel, { color: tone }]}>
                        {formatLitresVariance(t.varianceLitres)}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Sub-header for per-vendor breakdown */}
              <View style={s.gridSubHead}>
                <Text style={s.gridSubHeadText}>By vendor</Text>
                <View style={s.gridSubHeadRight}>
                  {onRefresh ? (
                    <TouchableOpacity
                      onPress={onRefresh}
                      hitSlop={10}
                      style={s.refreshBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={refreshing ? 'sync' : 'refresh-outline'}
                        size={14}
                        color={refreshing ? SEC.textMuted : SEC.teal}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {metrics.vendorSummary.map((row, idx) => {
                const shortfall = row.varianceLitres < -1;
                const isLast = idx === metrics.vendorSummary.length - 1;
                return (
                  <View
                    key={row.vendorId ?? row.vendorName}
                    style={[s.gridDataRow, isLast && { borderBottomWidth: 0 }]}
                  >
                    <View style={s.gridColVendor}>
                      <Text style={s.gridVendorName} numberOfLines={1}>
                        {row.vendorName}
                      </Text>
                      <Text style={s.gridVendorMeta} numberOfLines={1}>
                        {row.vehicleNo || '—'} · {row.loads} load
                        {row.loads === 1 ? '' : 's'} ·{' '}
                        {formatLitres(row.declaredLitresPerLoad ?? declaredLitresPerLoad)}/load
                      </Text>
                    </View>

                    <View style={s.gridColNum}>
                      <Text style={s.gridCostMain}>{formatLitres(row.declaredLitres)}</Text>
                    </View>

                    <View style={s.gridColNum}>
                      <Text style={[s.gridCostMain, shortfall && { color: SEC.red }]}>
                        {formatLitres(row.measuredLitres)}
                      </Text>
                    </View>

                    <View style={s.gridColNum}>
                      <Text
                        style={[
                          s.gridValueVariance,
                          { color: shortfall ? SEC.red : SEC.green },
                        ]}
                      >
                        {formatLitresVariance(row.varianceLitres)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
