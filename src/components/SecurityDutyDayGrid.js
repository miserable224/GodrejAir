import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SEC, HK } from '../constants/moduleThemes';
import { SHIFT_LABELS, SHIFT_SUBLABELS } from '../modules/security/utils/dutyShiftFilter';
import DutySessionsTable from './DutySessionsTable';

function ShiftToggle({ activeShift, onShiftChange, theme = 'security' }) {
  const palette = theme === 'housekeeping' ? HK : SEC;
  return (
    <View style={styles.shiftRow}>
      <View>
        <Text style={styles.shiftRowTitle}>Today&apos;s duty</Text>
        <Text style={styles.shiftRowSub}>{SHIFT_SUBLABELS[activeShift]}</Text>
      </View>
      <View style={styles.shiftPills}>
        {[1, 2].map((n) => {
          const on = activeShift === n;
          return (
            <TouchableOpacity
              key={n}
              style={[
                styles.shiftPill,
                on && styles.shiftPillOn,
                on && theme === 'housekeeping' && styles.shiftPillOnHk,
              ]}
              onPress={() => onShiftChange(n)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.shiftPillText,
                  on && styles.shiftPillTextOn,
                  on && theme === 'housekeeping' && styles.shiftPillTextOnHk,
                ]}
              >
                {SHIFT_LABELS[n]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function SecurityDutyDayGrid({
  sessions = [],
  activeShift = 1,
  onShiftChange,
  loading = false,
  emptyMessage = 'No check-ins for this shift today.',
  locationColumnLabel = 'Post',
  theme = 'security',
}) {
  const palette = theme === 'housekeeping' ? HK : SEC;
  const sorted = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (b.status === 'open' && a.status !== 'open') return 1;
      const ta = a.entryAt ? new Date(a.entryAt).getTime() : 0;
      const tb = b.entryAt ? new Date(b.entryAt).getTime() : 0;
      return tb - ta;
    });
  }, [sessions]);

  return (
    <View style={styles.wrap}>
      <ShiftToggle activeShift={activeShift} onShiftChange={onShiftChange} theme={theme} />
      {loading ? (
        <ActivityIndicator color={palette.teal} style={styles.loader} />
      ) : (
        <DutySessionsTable
          sessions={sorted}
          locationColumnLabel={locationColumnLabel}
          emptyMessage={emptyMessage}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', marginTop: 4 },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  shiftRowTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: SEC.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  shiftRowSub: { fontSize: 11, color: SEC.textDim, marginTop: 2 },
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
  shiftPillOnHk: {
    backgroundColor: 'rgba(20, 184, 166, 0.35)',
    borderColor: 'rgba(45, 212, 191, 0.55)',
  },
  shiftPillText: { fontSize: 12, fontWeight: '700', color: SEC.textMuted },
  shiftPillTextOn: { color: '#E0F2FE' },
  shiftPillTextOnHk: { color: '#CCFBF1' },
  loader: { marginVertical: 20, alignSelf: 'flex-start' },
});
