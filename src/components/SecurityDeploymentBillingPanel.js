import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SEC } from '../constants/moduleThemes';
import SecurityDeploymentStatsPanel from './SecurityDeploymentStatsPanel';
import SecurityDeploymentRolesPanel from './SecurityDeploymentRolesPanel';

const DATE_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom' },
];

/**
 * Deployment & billing block (stats + date filter + S1/S2 roles) for Home → Security.
 */
export default function SecurityDeploymentBillingPanel({
  staffCounts = [],
  securityRoleRates = [],
  sanctionedStrength = [],
  securityBilling = null,
  securityDashboard = null,
  roles = [],
  isLoading = false,
  fetchErrors = {},
  periodLabel = '',
  dateRange = 'Today',
  datePreset = 'today',
  customRange = { from: '', to: '' },
  onOpenDatePicker,
  onCustomRangeChange,
  onRefresh,
}) {
  const dateLabel = DATE_PRESETS.find((p) => p.key === datePreset)?.label ?? 'Today';

  return (
    <View style={styles.wrap}>
      <SecurityDeploymentStatsPanel
        staffCounts={staffCounts}
        securityRoleRates={securityRoleRates}
        sanctionedStrength={sanctionedStrength}
        securityBilling={securityBilling}
        securityDashboard={securityDashboard}
        isLoading={isLoading}
        fetchErrors={fetchErrors}
        periodLabel={periodLabel}
        dateRange={dateRange}
      />

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.filterChip}
          onPress={onOpenDatePicker}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={16} color={SEC.gold} />
          <Text style={styles.filterChipText}>{dateLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={SEC.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.85}>
          <Ionicons name="refresh-outline" size={20} color={SEC.teal} />
        </TouchableOpacity>
      </View>

      {datePreset === 'custom' ? (
        <View style={styles.customRangeRow}>
          <TextInput
            style={styles.rangeInput}
            placeholder="From DD/MM/YYYY"
            placeholderTextColor={SEC.textDim}
            value={customRange.from}
            onChangeText={(t) => onCustomRangeChange?.({ ...customRange, from: t })}
          />
          <TextInput
            style={styles.rangeInput}
            placeholder="To DD/MM/YYYY"
            placeholderTextColor={SEC.textDim}
            value={customRange.to}
            onChangeText={(t) => onCustomRangeChange?.({ ...customRange, to: t })}
          />
        </View>
      ) : null}

      <SecurityDeploymentRolesPanel
        roles={roles}
        loading={isLoading}
        error={fetchErrors?.opsDashboard}
      />
    </View>
  );
}

export { DATE_PRESETS as SECURITY_DEPLOY_DATE_PRESETS };

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.surfaceRaised,
  },
  filterChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: SEC.text,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SEC.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SEC.surfaceRaised,
  },
  customRangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: SEC.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: SEC.text,
    backgroundColor: SEC.bg,
  },
});
