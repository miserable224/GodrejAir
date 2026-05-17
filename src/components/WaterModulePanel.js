import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SEC, SEC_FONTS } from '../constants/moduleThemes';

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
}) {
  const s = useMemo(() => createStyles(), []);
  const st = tankStatusColors(metrics.statusBand);

  return (
    <View style={s.shell}>
      <View style={s.card}>
        <LinearGradient
          colors={SEC.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
        >
          <Text style={s.headerTitle}>Water management</Text>
          <Text style={s.headerSub}>Tank levels, tanker logs & meter audit</Text>
        </LinearGradient>

        <View style={s.body}>
          <View style={[s.tankCard, { borderColor: st.border }]}>
            <View style={s.tankTop}>
              <Text style={s.tankTitle}>Tank capacity</Text>
              <View style={[s.tankPctPill, { backgroundColor: st.dim, borderColor: st.border }]}>
                <Text style={[s.tankPctText, { color: st.accent }]}>
                  {Math.round(metrics.tankFillPct)}%
                </Text>
              </View>
            </View>
            <Text style={[s.tankStatus, { color: st.accent }]}>{st.label}</Text>
            <Text style={s.tankMeta}>
              {metrics.latestTankLevelKl || 0} kL of {metrics.safeCapacity} kL · Shortfall{' '}
              {metrics.tankShortfallKl} kL
            </Text>
            <View style={s.barTrack}>
              <View
                style={[
                  s.barFill,
                  { width: `${metrics.tankFillPct}%`, backgroundColor: st.accent },
                ]}
              />
            </View>
            <View style={s.tankRow}>
              <View style={s.miniStat}>
                <Text style={s.miniLabel}>Days left</Text>
                <Text style={s.miniVal}>
                  {metrics.daysLeftPrediction === null ? 'N/A' : `${metrics.daysLeftPrediction}d`}
                </Text>
              </View>
              <View style={s.miniStat}>
                <Text style={s.miniLabel}>Loss</Text>
                <Text style={s.miniVal}>{metrics.unaccountedLossPct}%</Text>
              </View>
              <View style={s.miniStat}>
                <Text style={s.miniLabel}>Tankers req.</Text>
                <Text style={s.miniVal}>{metrics.tankersRequired}</Text>
              </View>
            </View>
            <View style={s.alertsWrap}>
              {metrics.smartAlerts.map((alert, idx) => (
                <Text key={`wa-${idx}`} style={s.alertText}>
                  • {alert}
                </Text>
              ))}
            </View>
          </View>

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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
            <View style={s.chipRow}>
              {[
                { key: 'all', label: 'All water' },
                { key: 'tanker', label: 'Tanker' },
                { key: 'kaveri', label: 'Kaveri' },
              ].map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  active={waterSourceFilter === f.key}
                  onPress={() => {
                    onWaterSourceFilterChange(f.key);
                    onWaterTankerFilterChange('all');
                  }}
                  styles={s}
                />
              ))}
            </View>
          </ScrollView>

          {waterSourceFilter === 'tanker' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              <View style={s.chipRow}>
                <Chip
                  label="All tankers"
                  active={waterTankerFilter === 'all'}
                  onPress={() => onWaterTankerFilterChange('all')}
                  styles={s}
                />
                {metrics.tankerOptions.map((veh) => (
                  <Chip
                    key={veh}
                    label={veh}
                    active={waterTankerFilter === veh}
                    onPress={() => onWaterTankerFilterChange(veh)}
                    styles={s}
                  />
                ))}
              </View>
            </ScrollView>
          ) : null}

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

          <View style={s.statsGrid}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Entries ({metrics.periodLabel})</Text>
              <Text style={s.statVal}>{metrics.recordsInRange.length}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Total loads</Text>
              <Text style={s.statVal}>{metrics.totalLoads}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Latest inflow</Text>
              <Text style={s.statVal}>{metrics.latestInflow}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Avg TDS</Text>
              <Text style={s.statVal}>{metrics.avgTds || '—'}</Text>
            </View>
          </View>

          <View style={s.auditCard}>
            <Text style={s.auditTitle}>Start vs end meter audit</Text>
            <Text style={s.auditLine}>Opening meter: {metrics.periodStartMeter || '—'}</Text>
            <Text style={s.auditLine}>Closing meter: {metrics.periodEndMeter || '—'}</Text>
            <Text style={s.auditLine}>Net movement: {metrics.netDelta || '—'}</Text>
          </View>

          <View style={s.hubRow}>
            <TouchableOpacity style={[s.hubBtn, s.hubPrimary]} onPress={onRecordInput} activeOpacity={0.85}>
              <Ionicons name="water-outline" size={16} color={SEC.bg} />
              <Text style={s.hubTextPrimary}>Record input</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.hubBtn, s.hubSecondary]} onPress={onAddVendor} activeOpacity={0.85}>
              <Ionicons name="business-outline" size={16} color={SEC.teal} />
              <Text style={s.hubText}>Add vendor</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>
            Log tanker entries with meter photos. Track opening vs closing readings to catch mismatch.
          </Text>

          <Text style={s.sectionHead}>Filtered inputs</Text>
          {metrics.recordsInRange.length === 0 ? (
            <Text style={s.empty}>No records for selected range.</Text>
          ) : (
            metrics.recordsInRange
              .slice()
              .reverse()
              .map((r) => (
                <View key={r.id} style={s.logCard}>
                  <View style={s.logTop}>
                    <Text style={s.logDate}>{r.date}</Text>
                    <Text style={s.logVehicle}>{r.vehicleNo || 'Kaveri'}</Text>
                  </View>
                  <Text style={s.logMeta}>{r.source}</Text>
                  <Text style={s.logMeta}>
                    Meter {r.openingMeter} → {r.closingMeter} · TDS {r.tds} · Load {r.load}
                    {r.tankLevelKl ? ` · Tank ${r.tankLevelKl} kL` : ''}
                  </Text>
                  {r.photos?.length ? (
                    <Text style={s.logMeta}>Photos: {r.photos.length}</Text>
                  ) : null}
                </View>
              ))
          )}
        </View>
      </View>
    </View>
  );
}
