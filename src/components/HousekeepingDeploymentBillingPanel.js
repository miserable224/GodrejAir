import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HK } from '../constants/moduleThemes';
import { DEPLOY_DATE_PRESETS } from '../constants/deployDatePresets';
import HousekeepingDeploymentStatsPanel from './HousekeepingDeploymentStatsPanel';
import SecurityDeploymentRolesPanel from './SecurityDeploymentRolesPanel';

/**
 * Deployment & billing block for Home → Housekeeping (matches Security layout).
 */
export default function HousekeepingDeploymentBillingPanel({
  dashboard = null,
  roles = [],
  isLoading = false,
  error = null,
  periodLabel = '',
  datePreset = 'today',
  customRange = { from: '', to: '' },
  onOpenDatePicker,
  onCustomRangeChange,
  onRefresh,
}) {
  const dateLabel = DEPLOY_DATE_PRESETS.find((p) => p.key === datePreset)?.label ?? 'Today';

  return (
    <View style={styles.wrap}>
      <HousekeepingDeploymentStatsPanel
        dashboard={dashboard}
        isLoading={isLoading}
        error={error}
        periodLabel={periodLabel}
      />

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.filterChip}
          onPress={onOpenDatePicker}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={16} color={HK.gold} />
          <Text style={styles.filterChipText}>{dateLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={HK.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.85}>
          <Ionicons name="refresh-outline" size={20} color={HK.teal} />
        </TouchableOpacity>
      </View>

      {datePreset === 'custom' ? (
        <View style={styles.customRangeRow}>
          <TextInput
            style={styles.rangeInput}
            placeholder="From DD/MM/YYYY"
            placeholderTextColor={HK.textDim}
            value={customRange.from}
            onChangeText={(t) => onCustomRangeChange?.({ ...customRange, from: t })}
          />
          <TextInput
            style={styles.rangeInput}
            placeholder="To DD/MM/YYYY"
            placeholderTextColor={HK.textDim}
            value={customRange.to}
            onChangeText={(t) => onCustomRangeChange?.({ ...customRange, to: t })}
          />
        </View>
      ) : null}

      <SecurityDeploymentRolesPanel
        roles={roles}
        loading={isLoading}
        error={error}
        module="housekeeping"
        showContractRates
      />
    </View>
  );
}

export { DEPLOY_DATE_PRESETS as HK_DEPLOY_DATE_PRESETS };

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
    borderColor: HK.border,
    backgroundColor: HK.surfaceRaised,
  },
  filterChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: HK.text,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: HK.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HK.surfaceRaised,
  },
  customRangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: HK.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: HK.text,
    backgroundColor: HK.bg,
  },
});
