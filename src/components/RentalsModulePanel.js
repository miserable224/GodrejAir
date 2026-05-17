import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SEC, SEC_FONTS } from '../constants/moduleThemes';
import { formatINR } from '../constants/data';

function clampPct(n) {
  return Math.min(100, Math.max(0, n));
}

function barColor(pct) {
  if (pct >= 90) return SEC.green;
  if (pct >= 70) return SEC.gold;
  return SEC.red;
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
    statItem: { flex: 1 },
    statDivider: {
      width: 1,
      backgroundColor: SEC.border,
      marginHorizontal: 10,
    },
    statLabel: {
      ...SEC_FONTS.label,
      color: SEC.textMuted,
      marginBottom: 6,
    },
    statVal: {
      fontSize: 17,
      fontWeight: '800',
      color: SEC.text,
      letterSpacing: -0.3,
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
    catBlock: {
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: SEC.border,
      padding: 10,
      marginBottom: 8,
    },
    catHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    catIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: SEC.bg,
      borderWidth: 1,
      borderColor: SEC.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catLabel: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
      color: SEC.text,
    },
    catPct: {
      fontSize: 12,
      fontWeight: '800',
      minWidth: 36,
      textAlign: 'right',
    },
    barTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: SEC.bg,
      overflow: 'hidden',
      marginBottom: 6,
    },
    barFill: { height: '100%', borderRadius: 3 },
    catMeta: {
      fontSize: 10,
      color: SEC.textMuted,
      fontWeight: '600',
    },
    catMetaStrong: { color: SEC.text, fontWeight: '800' },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginVertical: 10,
    },
    dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: SEC.border },
    dividerText: {
      fontSize: 9,
      fontWeight: '800',
      color: SEC.textDim,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: SEC.border,
      marginBottom: 6,
    },
    amountLabel: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      color: SEC.textMuted,
    },
    amountVal: {
      fontSize: 13,
      fontWeight: '800',
      color: SEC.green,
    },
    agreementsPanel: {
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: SEC.border,
      padding: 10,
      marginBottom: 10,
    },
    agreementsTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: SEC.text,
      marginBottom: 8,
    },
    agreementCard: {
      backgroundColor: SEC.bg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: SEC.borderSubtle,
      padding: 10,
      marginBottom: 8,
    },
    agreementTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 4,
    },
    agreementUnit: {
      flex: 1,
      fontSize: 12,
      fontWeight: '800',
      color: SEC.teal,
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: SEC.greenDim,
      borderWidth: 1,
      borderColor: SEC.greenBorder,
    },
    statusPillWarn: {
      backgroundColor: SEC.goldDim,
      borderColor: SEC.goldBorder,
    },
    statusPillDraft: {
      backgroundColor: SEC.surfaceRaised,
      borderColor: SEC.border,
    },
    statusText: {
      fontSize: 9,
      fontWeight: '800',
      color: SEC.green,
      textTransform: 'uppercase',
    },
    statusTextWarn: { color: SEC.gold },
    statusTextDraft: { color: SEC.textMuted },
    agreementTenant: {
      fontSize: 12,
      fontWeight: '600',
      color: SEC.text,
      marginBottom: 4,
    },
    agreementMeta: {
      fontSize: 10,
      color: SEC.textDim,
      lineHeight: 14,
      marginBottom: 2,
    },
    agreementRent: {
      fontSize: 11,
      fontWeight: '800',
      color: SEC.green,
      marginTop: 4,
    },
    reminderCard: {
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: SEC.border,
      padding: 10,
      marginBottom: 10,
    },
    reminderHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    reminderTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: SEC.text,
    },
    reminderRow: {
      paddingVertical: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: SEC.borderSubtle,
    },
    reminderUnit: {
      fontSize: 12,
      fontWeight: '700',
      color: SEC.teal,
    },
    reminderText: {
      fontSize: 11,
      color: SEC.textMuted,
      marginTop: 2,
    },
    listCard: {
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: SEC.border,
      padding: 10,
      marginBottom: 10,
    },
    listTitle: {
      ...SEC_FONTS.label,
      color: SEC.textDim,
      marginBottom: 8,
    },
    listRow: {
      fontSize: 12,
      fontWeight: '600',
      color: SEC.textMuted,
      lineHeight: 18,
      marginBottom: 4,
    },
    duesBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    duesBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: SEC.surfaceRaised,
      borderWidth: 1,
      borderColor: SEC.border,
    },
    duesBtnActive: {
      borderColor: SEC.goldBorder,
      backgroundColor: SEC.goldDim,
    },
    duesHint: {
      fontSize: 12,
      fontWeight: '600',
      color: SEC.textMuted,
    },
    duesPanel: {
      marginTop: 8,
      backgroundColor: SEC.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: SEC.border,
      padding: 10,
    },
    duesPanelTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: SEC.text,
      marginBottom: 4,
    },
    duesPanelHint: {
      fontSize: 11,
      color: SEC.textDim,
      marginBottom: 10,
    },
    duesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: SEC.borderSubtle,
    },
    duesRowLeft: { flex: 1, paddingRight: 8 },
    duesLabel: { fontSize: 12, fontWeight: '700', color: SEC.text },
    duesDetail: { fontSize: 10, color: SEC.textDim, marginTop: 2 },
    duesCount: {
      minWidth: 28,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: SEC.redDim,
      borderWidth: 1,
      borderColor: SEC.redBorder,
      alignItems: 'center',
    },
    duesCountText: { fontSize: 12, fontWeight: '800', color: SEC.red },
    duesDismiss: {
      marginTop: 10,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    duesDismissText: { fontSize: 12, fontWeight: '700', color: SEC.teal },
  });
}

export default function RentalsModulePanel({
  billingCats,
  amountCats,
  collectionsSummary,
  pendingDues,
  commercialUnits,
  agreementsOpen,
  onToggleAgreements,
  reminderRows,
  trainerUpdates,
  recentPayments,
  duesTipOpen,
  onToggleDuesTip,
  onAddShop,
  onAddTrainer,
  onRecordPayment,
}) {
  const s = useMemo(() => createStyles(), []);
  const receivedPct = collectionsSummary?.receivedPct ?? 0;
  const pctOk = receivedPct >= 90;

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
              <Text style={s.headerTitle}>Collections</Text>
              <Text style={s.headerSub}>{collectionsSummary?.periodLabel}</Text>
            </View>
            <View style={s.periodPill}>
              <Ionicons name="calendar-outline" size={14} color={SEC.gold} />
              <Text style={s.periodText}>Billing cycle</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={s.body}>
          <View style={s.statsGrid}>
            <View style={s.statItem}>
              <Text style={s.statLabel}>Received</Text>
              <Text style={[s.statVal, s.statValGreen]}>{collectionsSummary?.received}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statLabel}>Pending</Text>
              <Text style={[s.statVal, s.statValGold]}>{collectionsSummary?.pendingDues}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statLabel}>Collected</Text>
              <Text style={[s.statVal, pctOk ? s.statValGreen : s.statValRed]}>
                {Math.round(receivedPct)}%
              </Text>
            </View>
          </View>

          <View style={s.hubRow}>
            <TouchableOpacity
              style={[s.hubBtn, s.hubBtnPrimary]}
              onPress={onAddShop}
              activeOpacity={0.85}
            >
              <Ionicons name="storefront-outline" size={16} color={SEC.bg} />
              <Text style={s.hubBtnTextPrimary}>Add shop</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.hubBtn, s.hubBtnSecondary]}
              onPress={onToggleAgreements}
              activeOpacity={0.85}
            >
              <Ionicons name="document-text-outline" size={16} color={SEC.teal} />
              <Text style={s.hubBtnText}>{agreementsOpen ? 'Hide agreements' : 'Agreements'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.hubBtn, s.hubBtnGhost]}
              onPress={onAddTrainer}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add-outline" size={16} color={SEC.textMuted} />
              <Text style={s.hubBtnTextMuted}>Add trainer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.hubBtn, s.hubBtnGhost]}
              onPress={onRecordPayment}
              activeOpacity={0.85}
            >
              <Ionicons name="card-outline" size={16} color={SEC.teal} />
              <Text style={s.hubBtnText}>Record payment</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.sectionHead}>Billing streams</Text>
          {billingCats.map((cat) => {
            const rowPct =
              cat.expectedAmount > 0 ? (cat.receivedAmount / cat.expectedAmount) * 100 : 0;
            const color = barColor(rowPct);
            return (
              <View key={cat.key} style={s.catBlock}>
                <View style={s.catHeader}>
                  <View style={s.catIcon}>
                    <Ionicons name={cat.icon} size={16} color={SEC.teal} />
                  </View>
                  <Text style={s.catLabel} numberOfLines={2}>
                    {cat.label}
                  </Text>
                  <Text style={[s.catPct, { color }]}>{Math.round(rowPct)}%</Text>
                </View>
                <View style={s.barTrack}>
                  <View
                    style={[s.barFill, { width: `${clampPct(rowPct)}%`, backgroundColor: color }]}
                  />
                </View>
                <Text style={s.catMeta}>
                  <Text style={s.catMetaStrong}>{formatINR(cat.receivedAmount)}</Text>
                  {' of '}
                  {formatINR(cat.expectedAmount)} expected
                </Text>
              </View>
            );
          })}

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>Other receipts</Text>
            <View style={s.dividerLine} />
          </View>

          {amountCats.map((cat) => (
            <View key={cat.key} style={s.amountRow}>
              <Ionicons name={cat.icon} size={17} color={SEC.textDim} />
              <Text style={s.amountLabel} numberOfLines={2}>
                {cat.label}
              </Text>
              <Text style={s.amountVal}>{formatINR(cat.amount)}</Text>
            </View>
          ))}

          {agreementsOpen ? (
            <View style={s.agreementsPanel}>
              <Text style={s.agreementsTitle}>Commercial unit agreements</Text>
              {commercialUnits.map((item) => {
                const isRenewal = item.status === 'Renewal Due';
                const isDraft = item.status === 'Draft';
                return (
                  <View key={item.id} style={s.agreementCard}>
                    <View style={s.agreementTop}>
                      <Text style={s.agreementUnit}>{item.unit}</Text>
                      <View
                        style={[
                          s.statusPill,
                          isRenewal && s.statusPillWarn,
                          isDraft && s.statusPillDraft,
                        ]}
                      >
                        <Text
                          style={[
                            s.statusText,
                            isRenewal && s.statusTextWarn,
                            isDraft && s.statusTextDraft,
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.agreementTenant}>{item.tenant}</Text>
                    {item.vendorName ? (
                      <Text style={s.agreementMeta}>Vendor: {item.vendorName}</Text>
                    ) : null}
                    {item.contactNumber ? (
                      <Text style={s.agreementMeta}>Contact: {item.contactNumber}</Text>
                    ) : null}
                    {item.address ? <Text style={s.agreementMeta}>Address: {item.address}</Text> : null}
                    <Text style={s.agreementMeta}>Agreement: {item.agreementId}</Text>
                    <Text style={s.agreementMeta}>
                      {item.startDate} – {item.endDate}
                    </Text>
                    {item.agreementFile ? (
                      <Text style={s.agreementMeta}>File: {item.agreementFile}</Text>
                    ) : null}
                    <Text style={s.agreementRent}>Rent: {formatINR(item.rent)} / month</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={s.reminderCard}>
            <View style={s.reminderHead}>
              <Ionicons name="notifications-outline" size={18} color={SEC.gold} />
              <Text style={s.reminderTitle}>Auto reminders</Text>
            </View>
            {reminderRows.length ? (
              reminderRows.map((row) => (
                <View key={`rem-${row.id}`} style={s.reminderRow}>
                  <Text style={s.reminderUnit}>{row.unit}</Text>
                  {row.within30Days ? (
                    <Text style={s.reminderText}>
                      30 days before expiry: {row.dLeft} day{row.dLeft === 1 ? '' : 's'} left
                    </Text>
                  ) : null}
                  {row.renewalPending ? (
                    <Text style={s.reminderText}>Renewal pending alert</Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={s.reminderText}>No upcoming expiry or renewal pending alerts.</Text>
            )}
          </View>

          {trainerUpdates?.length ? (
            <View style={s.listCard}>
              <Text style={s.listTitle}>Trainer updates</Text>
              {trainerUpdates.slice(0, 3).map((item) => (
                <Text key={item.id} style={s.listRow}>
                  {item.trainerName} · {item.serviceType} · {formatINR(item.fee)}
                </Text>
              ))}
            </View>
          ) : null}

          {recentPayments?.length ? (
            <View style={s.listCard}>
              <Text style={s.listTitle}>Recent payments</Text>
              {recentPayments.slice(0, 3).map((item) => (
                <Text key={item.id} style={s.listRow}>
                  {item.payer} · {item.category} · {formatINR(item.amount)}
                  {item.billFile ? ` · ${item.billFile}` : ''}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={s.duesBar}>
            <Pressable
              onPress={onToggleDuesTip}
              style={({ pressed }) => [
                s.duesBtn,
                duesTipOpen && s.duesBtnActive,
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={8}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={duesTipOpen ? SEC.gold : SEC.textMuted}
              />
            </Pressable>
            <Text style={s.duesHint}>Pending dues by category</Text>
          </View>

          {duesTipOpen ? (
            <View style={s.duesPanel}>
              <Text style={s.duesPanelTitle}>Due by category</Text>
              <Text style={s.duesPanelHint}>
                {collectionsSummary?.periodLabel} · {collectionsSummary?.pendingDues} pending ·{' '}
                {collectionsSummary?.pendingInvoices} invoices
              </Text>
              {pendingDues.map((row) => (
                <View key={row.key} style={s.duesRow}>
                  <View style={s.duesRowLeft}>
                    <Text style={s.duesLabel}>{row.label}</Text>
                    <Text style={s.duesDetail}>{row.detail}</Text>
                  </View>
                  <View style={s.duesCount}>
                    <Text style={s.duesCountText}>{row.countDue}</Text>
                  </View>
                </View>
              ))}
              <Pressable onPress={onToggleDuesTip} style={s.duesDismiss}>
                <Text style={s.duesDismissText}>Dismiss</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
