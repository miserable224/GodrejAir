import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SEC } from '../constants/moduleThemes';
import { formatINR } from '../constants/data';
import { estimateSecurityBillFromShifts } from '../modules/security/utils/securityBillingEstimate';

/**
 * Deployment headcount + billing (Settings → Security).
 */
export default function SecurityDeploymentStatsPanel({
  staffCounts = [],
  securityRoleRates = [],
  sanctionedStrength = [],
  securityBilling = null,
  securityDashboard = null,
  isLoading = false,
  fetchErrors = {},
  periodLabel = '',
  dateRange = 'Today',
}) {
  const securityStaff = useMemo(
    () => staffCounts.filter((c) => c.category === 'Security'),
    [staffCounts],
  );

  const metrics = useMemo(() => {
    const dailyTotal =
      securityDashboard?.totalDeployed ??
      securityStaff.reduce((s, c) => s + c.actualS1 + c.actualS2, 0);
    const dailyExpected =
      securityDashboard?.totalRequired ??
      securityStaff.reduce((s, c) => s + c.expected * 2, 0);
    const dailyShortage =
      securityDashboard?.totalShortage ?? Math.max(0, dailyExpected - dailyTotal);
    const shiftBillEst = estimateSecurityBillFromShifts(
      securityStaff,
      securityRoleRates,
      sanctionedStrength,
    );
    const contractBillBroken = Boolean(
      securityBilling?.message &&
        (String(securityBilling.message).includes('42703') ||
          String(securityBilling.message).includes('Could not load vendor contract')),
    );
    const apiGrand = Number(securityBilling?.grandTotal ?? securityBilling?.GrandTotal);
    const periodWages = Number(securityDashboard?.estimatedWages ?? 0);
    const useOfficialBill =
      dateRange === 'Last 1 Month' &&
      !contractBillBroken &&
      securityBilling != null &&
      !Number.isNaN(apiGrand) &&
      apiGrand > 0;
    const displayBillAmount = useOfficialBill
      ? apiGrand
      : periodWages > 0
        ? periodWages
        : shiftBillEst;
    const headcountOk = dailyShortage === 0 && dailyExpected > 0;
    return {
      dailyTotal,
      dailyExpected,
      dailyShortage,
      headcountOk,
      billHeadline: displayBillAmount > 0 ? formatINR(displayBillAmount) : '---',
      billFootnote: useOfficialBill ? 'Vendor contract rate' : 'Shift-based estimate',
      periodLabel: periodLabel || dateRange,
    };
  }, [
    securityStaff,
    securityDashboard,
    securityBilling,
    securityRoleRates,
    sanctionedStrength,
    dateRange,
    periodLabel,
  ]);

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Deployment & billing</Text>
      <View style={styles.statsGrid}>
        {isLoading ? (
          <ActivityIndicator size="small" color={SEC.teal} style={styles.loader} />
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
              <Text style={styles.statFoot}>{metrics.billFootnote}</Text>
            </View>
          </>
        )}
      </View>
      {fetchErrors?.opsDashboard && !isLoading ? (
        <Text style={styles.err}>{fetchErrors.opsDashboard}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: SEC.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SEC.border,
    padding: 14,
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: SEC.textMuted,
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
  statFoot: { fontSize: 11, color: SEC.textMuted, marginTop: 4 },
  statDivider: {
    width: 1,
    backgroundColor: SEC.border,
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
  err: { fontSize: 12, color: SEC.red, marginTop: 8 },
});
