import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SEC, SEC_FONTS } from '../constants/moduleThemes';

function statusStyle(status, s) {
  const key = String(status || '').toLowerCase();
  if (key.includes('critical')) return { pill: s.pillCritical, text: s.textCritical };
  if (key.includes('renewal') || key.includes('due')) return { pill: s.pillWarn, text: s.textWarn };
  if (key.includes('compliant') || key.includes('active')) {
    return { pill: s.pillOk, text: s.textOk };
  }
  return { pill: s.pillMuted, text: s.textMuted };
}

function createStyles() {
  return StyleSheet.create({
    shell: {
      backgroundColor: SEC.bg,
      paddingBottom: 8,
      width: '100%',
    },
    card: {
      backgroundColor: SEC.surface,
      overflow: 'hidden',
    },
    header: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: SEC.borderSubtle,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    headerTitle: {
      ...SEC_FONTS.title,
      color: SEC.text,
    },
    headerSub: {
      fontSize: 12,
      color: SEC.textMuted,
      fontWeight: '500',
      marginTop: 4,
    },
    periodPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: SEC.surfaceRaised,
      borderWidth: 1,
      borderColor: SEC.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    periodText: {
      fontSize: 11,
      fontWeight: '700',
      color: SEC.text,
    },
    body: { padding: 10 },
    statsGrid: {
      flexDirection: 'row',
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: SEC.border,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: {
      width: 1,
      backgroundColor: SEC.border,
      marginHorizontal: 6,
    },
    statLabel: {
      ...SEC_FONTS.label,
      color: SEC.textMuted,
      marginBottom: 6,
    },
    statVal: {
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    statValGreen: { color: SEC.green },
    statValGold: { color: SEC.gold },
    statValRed: { color: SEC.red },
    hubRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    hubBtn: {
      flexGrow: 1,
      flexBasis: '47%',
      minWidth: 140,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      borderRadius: 10,
    },
    hubBtnPrimary: { backgroundColor: SEC.green },
    hubBtnSecondary: {
      backgroundColor: SEC.tealDim,
      borderWidth: 1,
      borderColor: 'rgba(45, 212, 191, 0.35)',
    },
    hubBtnGhost: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: SEC.border,
    },
    hubBtnTextPrimary: {
      fontSize: 12,
      fontWeight: '800',
      color: SEC.bg,
    },
    hubBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: SEC.teal,
    },
    hubBtnTextMuted: {
      fontSize: 12,
      fontWeight: '800',
      color: SEC.textMuted,
    },
    sectionHead: {
      ...SEC_FONTS.label,
      color: SEC.textDim,
      marginBottom: 8,
      marginTop: 2,
    },
    contractRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: SEC.border,
      paddingVertical: 10,
      paddingHorizontal: 10,
      marginBottom: 8,
      gap: 8,
    },
    contractIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: SEC.bg,
      borderWidth: 1,
      borderColor: SEC.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contractMain: { flex: 1, minWidth: 0 },
    contractTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: SEC.teal,
    },
    contractVendor: {
      fontSize: 10,
      fontWeight: '600',
      color: SEC.textMuted,
      marginTop: 2,
    },
    contractMeta: {
      fontSize: 10,
      color: SEC.textDim,
      marginTop: 2,
    },
    contractRight: { alignItems: 'flex-end', gap: 4 },
    dueText: {
      fontSize: 10,
      fontWeight: '700',
      color: SEC.textMuted,
    },
    pill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    pillOk: {
      backgroundColor: SEC.greenDim,
      borderColor: SEC.greenBorder,
    },
    pillWarn: {
      backgroundColor: SEC.goldDim,
      borderColor: SEC.goldBorder,
    },
    pillCritical: {
      backgroundColor: SEC.redDim,
      borderColor: SEC.redBorder,
    },
    pillMuted: {
      backgroundColor: SEC.bg,
      borderColor: SEC.border,
    },
    pillText: {
      fontSize: 9,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    textOk: { color: SEC.green },
    textWarn: { color: SEC.gold },
    textCritical: { color: SEC.red },
    textMuted: { color: SEC.textMuted },
    complianceCard: {
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: SEC.border,
      padding: 10,
      marginBottom: 10,
    },
    complianceHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    complianceTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: SEC.text,
    },
    complianceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: SEC.borderSubtle,
      gap: 8,
    },
    complianceLabel: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
      color: SEC.text,
    },
    emptyText: {
      fontSize: 12,
      color: SEC.textDim,
      fontWeight: '600',
      paddingVertical: 8,
    },
    footnote: {
      fontSize: 10,
      color: SEC.textDim,
      fontWeight: '600',
      lineHeight: 14,
      marginTop: 4,
    },
  });
}

export default function AmcModulePanel({
  contracts,
  complianceItems,
  stats,
  onAddContract,
  onLogCompliance,
  onViewRenewals,
  onUploadCertificate,
  renewalsFilterActive = false,
}) {
  const s = useMemo(() => createStyles(), []);

  return (
    <View style={s.shell}>
      <View style={s.card}>
        <LinearGradient
          colors={SEC.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
        >
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>AMC & compliance</Text>
              <Text style={s.headerSub}>Contracts, renewals & statutory checks</Text>
            </View>
            <View style={s.periodPill}>
              <Ionicons name="shield-checkmark-outline" size={14} color={SEC.gold} />
              <Text style={s.periodText}>FY 2026</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={s.body}>
          <View style={s.statsGrid}>
            <View style={s.statItem}>
              <Text style={s.statLabel}>Active</Text>
              <Text style={[s.statVal, s.statValGreen]}>{stats.active}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statLabel}>Due soon</Text>
              <Text style={[s.statVal, s.statValGold]}>{stats.dueSoon}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statLabel}>Critical</Text>
              <Text style={[s.statVal, s.statValRed]}>{stats.critical}</Text>
            </View>
          </View>

          <View style={s.hubRow}>
            <TouchableOpacity
              style={[s.hubBtn, s.hubBtnPrimary]}
              onPress={onAddContract}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={16} color={SEC.bg} />
              <Text style={s.hubBtnTextPrimary}>Add AMC</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.hubBtn, s.hubBtnSecondary]}
              onPress={onLogCompliance}
              activeOpacity={0.85}
            >
              <Ionicons name="clipboard-outline" size={16} color={SEC.teal} />
              <Text style={s.hubBtnText}>Log audit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.hubBtn, s.hubBtnGhost]}
              onPress={onViewRenewals}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh-outline" size={16} color={SEC.teal} />
              <Text style={s.hubBtnText}>
                {renewalsFilterActive ? 'All contracts' : 'Renewals'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.hubBtn, s.hubBtnGhost]}
              onPress={onUploadCertificate}
              activeOpacity={0.85}
            >
              <Ionicons name="document-attach-outline" size={16} color={SEC.textMuted} />
              <Text style={s.hubBtnTextMuted}>Certificate</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.sectionHead}>AMC contracts</Text>
          {contracts.length === 0 ? (
            <Text style={s.emptyText}>No AMC contracts on record.</Text>
          ) : (
            contracts.map((row) => {
              const st = statusStyle(row.status, s);
              return (
                <View key={row.id} style={s.contractRow}>
                  <View style={s.contractIcon}>
                    <Ionicons name="construct-outline" size={16} color={SEC.teal} />
                  </View>
                  <View style={s.contractMain}>
                    <Text style={s.contractTitle} numberOfLines={1}>
                      {row.label}
                    </Text>
                    <Text style={s.contractVendor} numberOfLines={1}>
                      {row.vendor}
                    </Text>
                    {row.category ? (
                      <Text style={s.contractMeta}>{row.category}</Text>
                    ) : null}
                  </View>
                  <View style={s.contractRight}>
                    <Text style={s.dueText}>{row.dueIn}</Text>
                    <View style={[s.pill, st.pill]}>
                      <Text style={[s.pillText, st.text]}>{row.status}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          <View style={s.complianceCard}>
            <View style={s.complianceHead}>
              <Ionicons name="checkmark-done-outline" size={18} color={SEC.gold} />
              <Text style={s.complianceTitle}>Compliance register</Text>
            </View>
            {complianceItems.length === 0 ? (
              <Text style={s.emptyText}>No compliance items logged.</Text>
            ) : (
              complianceItems.map((item) => {
                const st = statusStyle(item.status, s);
                return (
                  <View key={item.id} style={s.complianceRow}>
                    <Text style={s.complianceLabel} numberOfLines={2}>
                      {item.label}
                    </Text>
                    <Text style={s.dueText}>{item.dueIn}</Text>
                    <View style={[s.pill, st.pill]}>
                      <Text style={[s.pillText, st.text]}>{item.status}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <Text style={s.footnote}>
            Renew AMC before expiry and attach certificates after statutory inspections.
          </Text>
        </View>
      </View>
    </View>
  );
}
