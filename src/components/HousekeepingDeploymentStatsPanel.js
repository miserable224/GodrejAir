import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { HK } from '../constants/moduleThemes';
import { formatINR } from '../constants/data';
import { hkContractMonthlyTotal } from '../modules/housekeeping/constants/hkContracts';

/**
 * Deployment headcount + billing (Home → Housekeeping).
 */
export default function HousekeepingDeploymentStatsPanel({
  dashboard = null,
  isLoading = false,
  error = null,
  periodLabel = '',
}) {
  const metrics = useMemo(() => {
    const roles = dashboard?.roles ?? [];
    const dailyTotal =
      dashboard?.totalDeployed ?? roles.reduce((s, r) => s + (r.actualS1 || 0) + (r.actualS2 || 0), 0);
    const slotExpected = (r) => {
      const s1 = Number(r.expectedS1);
      const s2 = Number(r.expectedS2);
      if (s1 > 0 || s2 > 0) return s1 + s2;
      return (Number(r.expected) || 0) * 2;
    };
    const dailyExpected =
      dashboard?.totalRequired ?? roles.reduce((s, r) => s + slotExpected(r), 0);
    const dailyShortage =
      dashboard?.totalShortage ?? Math.max(0, dailyExpected - dailyTotal);
    const wages = Number(dashboard?.estimatedWages ?? 0);
    const contractMonthly =
      Number(dashboard?.contractMonthlyTotal ?? 0) || hkContractMonthlyTotal();
    const headcountOk = dailyShortage === 0 && dailyExpected > 0;
    return {
      dailyTotal,
      dailyExpected,
      dailyShortage,
      headcountOk,
      billHeadline: wages > 0 ? formatINR(wages) : '---',
      contractMonthlyLabel:
        contractMonthly > 0 ? formatINR(contractMonthly) : null,
      periodLabel: periodLabel || 'Today',
    };
  }, [dashboard, periodLabel]);

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Deployment & billing</Text>
      <View style={styles.statsGrid}>
        {isLoading ? (
          <ActivityIndicator size="small" color={HK.teal} style={styles.loader} />
        ) : (
          <>
            <View style={styles.statItem}>
              <View style={styles.statValRow}>
                <Text
                  style={[
                    styles.statMain,
                    metrics.headcountOk ? styles.valOk : styles.valWarn,
                  ]}
                >
                  {metrics.dailyTotal}/{metrics.dailyExpected}
                </Text>
                <View
                  style={[
                    styles.miniBadge,
                    metrics.headcountOk ? styles.badgeOk : styles.badgeWarn,
                  ]}
                >
                  <Text
                    style={[
                      styles.miniBadgeText,
                      metrics.headcountOk ? styles.badgeTextOk : styles.badgeTextWarn,
                    ]}
                  >
                    {metrics.headcountOk ? 'OK' : `-${metrics.dailyShortage}`}
                  </Text>
                </View>
              </View>
              <Text style={styles.statFoot} numberOfLines={2}>
                {metrics.periodLabel}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statMain, styles.valBill]}>{metrics.billHeadline}</Text>
              <Text style={styles.statFoot}>
                {metrics.contractMonthlyLabel
                  ? `Period est. · contract ${metrics.contractMonthlyLabel}/mo`
                  : 'Shift-based estimate'}
              </Text>
            </View>
          </>
        )}
      </View>
      {error && !isLoading ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: HK.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HK.border,
    padding: 14,
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: HK.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 56,
  },
  loader: { flex: 1, alignSelf: 'center' },
  statItem: { flex: 1, justifyContent: 'center' },
  statValRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statMain: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  valOk: { color: '#F87171' },
  valWarn: { color: '#F87171' },
  valBill: { color: '#4ADE80' },
  statFoot: { fontSize: 11, color: HK.textMuted, marginTop: 4 },
  statDivider: {
    width: 1,
    backgroundColor: HK.border,
    marginHorizontal: 12,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeOk: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  badgeWarn: { backgroundColor: 'rgba(248, 113, 113, 0.15)' },
  miniBadgeText: { fontSize: 11, fontWeight: '800' },
  badgeTextOk: { color: '#86EFAC' },
  badgeTextWarn: { color: '#FCA5A5' },
  err: { fontSize: 12, color: HK.red, marginTop: 8 },
});
