import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SEC, SEC_FONTS } from '../constants/moduleThemes';
import { formatINR } from '../constants/data';

const EXPENSE_CATEGORIES = ['Electrical', 'Mechanical', 'AMC', 'Staff Payments'];

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
    totalCard: {
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: SEC.border,
      padding: 14,
      marginBottom: 12,
      alignItems: 'center',
    },
    totalLabel: { ...SEC_FONTS.label, color: SEC.textDim, marginBottom: 4 },
    totalVal: { fontSize: 26, fontWeight: '800', color: SEC.green, letterSpacing: -0.5 },
    totalMeta: { fontSize: 11, color: SEC.textMuted, marginTop: 4, textAlign: 'center' },
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
    chipActive: { borderColor: SEC.greenBorder, backgroundColor: SEC.greenDim },
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
    customLab: {
      fontSize: 10,
      fontWeight: '700',
      color: SEC.textDim,
      marginBottom: 4,
    },
    customField: { flex: 1 },
    hubRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
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
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    catCard: {
      width: '48%',
      flexGrow: 1,
      minWidth: 140,
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: SEC.border,
      padding: 10,
    },
    catLab: { fontSize: 10, fontWeight: '700', color: SEC.textMuted, marginBottom: 4 },
    catVal: { fontSize: 13, fontWeight: '800', color: SEC.text, marginBottom: 6 },
    catBar: { height: 4, borderRadius: 2, backgroundColor: SEC.bg, overflow: 'hidden' },
    catBarFill: { height: '100%', borderRadius: 2, backgroundColor: SEC.green },
    txnCard: {
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: SEC.border,
      overflow: 'hidden',
    },
    txnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
    },
    txnTitle: { fontSize: 13, fontWeight: '800', color: SEC.text },
    txnSub: { fontSize: 10, color: SEC.textDim, marginTop: 2 },
    txnBody: { paddingHorizontal: 12, paddingBottom: 10 },
    txnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: SEC.borderSubtle,
      gap: 8,
    },
    txnMain: { flex: 1, minWidth: 0 },
    txnVendor: { fontSize: 12, fontWeight: '700', color: SEC.text },
    txnMeta: { fontSize: 10, color: SEC.textDim, marginTop: 2 },
    txnAmt: { fontSize: 13, fontWeight: '800', color: SEC.green },
    empty: { fontSize: 12, color: SEC.textDim, padding: 12 },
  });
}

export default function ExpensesModulePanel({
  totalSpend,
  periodLabel,
  transactionCount,
  byCategory,
  expenseTimePreset,
  onExpenseTimePresetChange,
  expenseDateRange,
  onExpenseDateFromChange,
  onExpenseDateToChange,
  transactions,
  transactionsExpanded,
  onToggleTransactions,
  onRecordExpense,
}) {
  const s = useMemo(() => createStyles(), []);

  const presets = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This week' },
    { key: 'month', label: 'This month' },
    { key: 'custom', label: 'Custom' },
  ];

  const sortedTxns = transactions
    .slice()
    .sort((a, b) => {
      const ta = a._d?.getTime?.() ?? 0;
      const tb = b._d?.getTime?.() ?? 0;
      if (tb !== ta) return tb - ta;
      return String(b.id).localeCompare(String(a.id));
    });

  return (
    <View style={s.shell}>
      <View style={s.card}>
        <LinearGradient
          colors={SEC.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
        >
          <Text style={s.headerTitle}>Society expenses</Text>
          <Text style={s.headerSub}>Utilities, AMC, payroll & vendor spend</Text>
        </LinearGradient>

        <View style={s.body}>
          <View style={s.totalCard}>
            <Text style={s.totalLabel}>Total spend</Text>
            <Text style={s.totalVal}>{formatINR(totalSpend)}</Text>
            <Text style={s.totalMeta}>
              {transactionCount} transaction{transactionCount === 1 ? '' : 's'} · {periodLabel}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
            <View style={s.chipRow}>
              {presets.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[s.chip, expenseTimePreset === key && s.chipActive]}
                  onPress={() => onExpenseTimePresetChange(key)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.chipText, expenseTimePreset === key && s.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {expenseTimePreset === 'custom' ? (
            <View style={s.customRow}>
              <View style={s.customField}>
                <Text style={s.customLab}>From</Text>
                <TextInput
                  style={s.customInput}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={SEC.textDim}
                  value={expenseDateRange.from}
                  onChangeText={onExpenseDateFromChange}
                />
              </View>
              <View style={s.customField}>
                <Text style={s.customLab}>To</Text>
                <TextInput
                  style={s.customInput}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={SEC.textDim}
                  value={expenseDateRange.to}
                  onChangeText={onExpenseDateToChange}
                />
              </View>
            </View>
          ) : null}

          <View style={s.hubRow}>
            <TouchableOpacity style={[s.hubBtn, s.hubPrimary]} onPress={onRecordExpense} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={16} color={SEC.bg} />
              <Text style={s.hubTextPrimary}>Record expense</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.hubBtn, s.hubSecondary]} onPress={onRecordExpense} activeOpacity={0.85}>
              <Ionicons name="document-attach-outline" size={16} color={SEC.teal} />
              <Text style={s.hubText}>Upload bill</Text>
            </TouchableOpacity>
          </View>

          <View style={s.catGrid}>
            {byCategory.map((row) => (
              <View key={row.category} style={s.catCard}>
                <Text style={s.catLab} numberOfLines={1}>
                  {row.category}
                </Text>
                <Text style={s.catVal}>{formatINR(row.amount)}</Text>
                <View style={s.catBar}>
                  <View
                    style={[
                      s.catBarFill,
                      {
                        width: `${totalSpend > 0 ? Math.min(100, (row.amount / totalSpend) * 100) : 0}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          <View style={s.txnCard}>
            <Pressable style={s.txnHeader} onPress={onToggleTransactions}>
              <View>
                <Text style={s.txnTitle}>Transactions</Text>
                <Text style={s.txnSub}>
                  {transactionCount} in range · newest first
                  {transactionsExpanded ? '' : ' · tap to expand'}
                </Text>
              </View>
              <Ionicons
                name={transactionsExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={SEC.textMuted}
              />
            </Pressable>
            {transactionsExpanded ? (
              <View style={s.txnBody}>
                {sortedTxns.length === 0 ? (
                  <Text style={s.empty}>No expenses in this range.</Text>
                ) : (
                  sortedTxns.map((row) => (
                    <View key={row.id} style={s.txnRow}>
                      <View style={s.txnMain}>
                        <Text style={s.txnVendor} numberOfLines={1}>
                          {row.vendor}
                        </Text>
                        <Text style={s.txnMeta} numberOfLines={1}>
                          {row.date} · {row.category}
                          {row.billFile ? ' · Bill attached' : ''}
                        </Text>
                      </View>
                      <Text style={s.txnAmt}>{formatINR(row.amount)}</Text>
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export { EXPENSE_CATEGORIES };
