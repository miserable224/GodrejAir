import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SEC, HK } from '../constants/moduleThemes';
import { formatINR } from '../constants/data';

function RoleRow({ item, palette, showContractRates }) {
  const expS1 = Number(item.expectedS1 ?? item.expected) || 0;
  const expS2 = Number(item.expectedS2 ?? item.expected) || 0;
  const s1Short = item.actualS1 < expS1;
  const s2Short = item.actualS2 < expS2;
  const roleOk = !s1Short && !s2Short;
  const monthly = Number(item.monthlyRate) || 0;
  const headcount = Number(item.headcountSanctioned) || 0;

  return (
    <View style={styles.row}>
      <View style={styles.roleCol}>
        <Text style={[styles.roleName, { color: palette.teal }]} numberOfLines={2}>
          {item.role}
        </Text>
        {showContractRates && monthly > 0 ? (
          <Text style={styles.rateLine} numberOfLines={1}>
            {formatINR(monthly)}/mo
            {headcount > 0 ? ` · ${headcount} staff` : ''}
          </Text>
        ) : null}
        {showContractRates && item.shiftTimings ? (
          <Text style={styles.shiftLine} numberOfLines={1}>
            {item.shiftTimings}
          </Text>
        ) : null}
      </View>
      <View style={styles.countGroup}>
        <View style={[styles.shiftPill, s1Short && styles.shiftPillWarn]}>
          <Text style={styles.shiftLabel}>S1</Text>
          <Text style={[styles.shiftVal, s1Short && styles.shiftValError]}>
            {item.actualS1}/{expS1}
          </Text>
        </View>
        <View style={[styles.shiftPill, s2Short && styles.shiftPillWarn]}>
          <Text style={styles.shiftLabel}>S2</Text>
          <Text style={[styles.shiftVal, s2Short && styles.shiftValError]}>
            {item.actualS2}/{expS2}
          </Text>
        </View>
        <View style={[styles.statusDot, roleOk ? styles.statusOk : styles.statusWarn]} />
      </View>
    </View>
  );
}

/**
 * S1 / S2 deployment rows per role (Security or Housekeeping deployment panel).
 */
export default function SecurityDeploymentRolesPanel({
  roles = [],
  loading = false,
  error = null,
  module = 'security',
  showContractRates = false,
}) {
  const palette = module === 'housekeeping' ? HK : SEC;

  return (
    <View style={styles.panel}>
      <Text style={[styles.panelTitle, { color: palette.textMuted }]}>
        {showContractRates ? 'Manpower by role (Annexure-III)' : 'Deployment by role'}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color={palette.teal} style={styles.loader} />
      ) : roles.length === 0 ? (
        <Text style={[styles.empty, { color: palette.textDim }]}>No deployment roles for this period.</Text>
      ) : (
        <View style={styles.list}>
          {roles.map((item) => (
            <RoleRow
              key={item.id ?? item.roleCode ?? item.role}
              item={item}
              palette={palette}
              showContractRates={showContractRates}
            />
          ))}
        </View>
      )}
      {error && !loading ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginBottom: 8 },
  panelTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  loader: { marginVertical: 16 },
  empty: { fontSize: 13, paddingVertical: 12 },
  err: { fontSize: 12, color: SEC.red, marginTop: 8 },
  list: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SEC.surfaceRaised,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SEC.border,
    gap: 8,
  },
  roleCol: { flex: 1, minWidth: 72 },
  roleName: {
    fontSize: 12,
    fontWeight: '700',
  },
  rateLine: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4ADE80',
    marginTop: 2,
  },
  shiftLine: {
    fontSize: 9,
    color: SEC.textDim,
    marginTop: 2,
  },
  countGroup: {
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
    borderColor: SEC.border,
  },
  shiftPillWarn: {
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  shiftLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: SEC.textDim,
  },
  shiftVal: {
    fontSize: 12,
    fontWeight: '800',
    color: SEC.text,
  },
  shiftValError: { color: '#FCA5A5' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusOk: { backgroundColor: '#22C55E' },
  statusWarn: { backgroundColor: '#F87171' },
});
