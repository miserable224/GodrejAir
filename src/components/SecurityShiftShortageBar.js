import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SEC } from '../constants/moduleThemes';

/**
 * S1 / S2 headcount and shortage for security deployment rows.
 */
export default function SecurityShiftShortageBar({ metrics, compact = false }) {
  if (!metrics) return null;

  const chips = [
    {
      key: 's1',
      label: 'Shift 1',
      present: metrics.s1Act,
      expected: metrics.s1Exp,
      short: metrics.s1Short,
    },
    {
      key: 's2',
      label: 'Shift 2',
      present: metrics.s2Act,
      expected: metrics.s2Exp,
      short: metrics.s2Short,
    },
  ];

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!compact ? <Text style={styles.heading}>Shortage today</Text> : null}
      <View style={styles.row}>
        {chips.map((c) => {
          const ok = c.short === 0 && c.expected > 0;
          return (
            <View
              key={c.key}
              style={[styles.chip, ok ? styles.chipOk : c.short > 0 ? styles.chipWarn : styles.chipNeutral]}
            >
              <Text style={styles.chipLabel}>{c.label}</Text>
              <Text style={styles.chipCount}>
                {c.present}/{c.expected}
              </Text>
              <Text style={[styles.chipShort, c.short > 0 && styles.chipShortWarn]}>
                {c.short > 0 ? `Short ${c.short}` : c.expected > 0 ? 'OK' : '—'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function computeSecurityShiftShortage(securityRows = []) {
  let s1Exp = 0;
  let s1Act = 0;
  let s2Exp = 0;
  let s2Act = 0;
  for (const r of securityRows) {
    s1Exp += Number(r.expectedS1 ?? r.expected) || 0;
    s1Act += Number(r.actualS1) || 0;
    s2Exp += Number(r.expectedS2 ?? r.expected) || 0;
    s2Act += Number(r.actualS2) || 0;
  }
  return {
    s1Exp,
    s1Act,
    s2Exp,
    s2Act,
    s1Short: Math.max(0, s1Exp - s1Act),
    s2Short: Math.max(0, s2Exp - s2Act),
  };
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', marginBottom: 12 },
  wrapCompact: { marginBottom: 0, paddingHorizontal: 12, paddingBottom: 10 },
  heading: {
    fontSize: 10,
    fontWeight: '700',
    color: SEC.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  chipOk: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  chipWarn: {
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
  },
  chipNeutral: {
    borderColor: SEC.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: SEC.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chipCount: {
    fontSize: 16,
    fontWeight: '800',
    color: SEC.text,
    marginTop: 4,
  },
  chipShort: {
    fontSize: 11,
    fontWeight: '700',
    color: '#86EFAC',
    marginTop: 2,
  },
  chipShortWarn: { color: '#FCA5A5' },
});
