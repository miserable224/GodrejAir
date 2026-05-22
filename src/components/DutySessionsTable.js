import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { SEC } from '../constants/moduleThemes';
import {
  formatDutyDurationMinutes,
  formatDutyTime,
} from '../modules/security/utils/dutyDuration';

function checkoutLabel(session) {
  if (session.exitAt) return formatDutyTime(session.exitAt);
  if (session.status === 'open') return 'On site';
  return '—';
}

function hoursLabel(session) {
  if (session.status === 'open' && session.entryAt) {
    const mins = Math.max(
      0,
      Math.round((Date.now() - new Date(session.entryAt).getTime()) / 60000),
    );
    return `${formatDutyDurationMinutes(mins)} · live`;
  }
  return session.durationLabel || formatDutyDurationMinutes(session.durationMinutes);
}

function DutyRow({ session }) {
  const onDuty = session.status === 'open';
  return (
    <View style={[styles.row, onDuty && styles.rowOpen]}>
      <Text style={[styles.cell, styles.colName]} numberOfLines={2}>
        {session.staffName || '—'}
      </Text>
      <Text style={[styles.cell, styles.colLoc]} numberOfLines={2}>
        {session.locationName || '—'}
      </Text>
      <Text style={[styles.cell, styles.colTime]} numberOfLines={2}>
        {formatDutyTime(session.entryAt)}
      </Text>
      <Text
        style={[
          styles.cell,
          styles.colTime,
          onDuty && !session.exitAt && styles.checkoutLive,
        ]}
        numberOfLines={2}
      >
        {checkoutLabel(session)}
      </Text>
      <Text
        style={[styles.cell, styles.colHours, onDuty && styles.hoursLive]}
        numberOfLines={1}
      >
        {hoursLabel(session)}
      </Text>
      <Text
        style={[
          styles.cell,
          styles.colStatus,
          onDuty ? styles.statusOn : styles.statusOff,
        ]}
        numberOfLines={1}
      >
        {onDuty ? 'On duty' : 'Out'}
      </Text>
    </View>
  );
}

/**
 * Duty attendance table — employee, location/post, check-in, check-out, hours, status.
 */
export default function DutySessionsTable({
  sessions = [],
  locationColumnLabel = 'Post',
  emptyMessage = 'No records.',
}) {
  if (!sessions.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.empty}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={Platform.OS === 'web'}
      style={styles.scroll}
    >
      <View style={styles.table}>
        <View style={[styles.row, styles.headRow]}>
          <Text style={[styles.cell, styles.colName, styles.headText]}>Employee</Text>
          <Text style={[styles.cell, styles.colLoc, styles.headText]}>{locationColumnLabel}</Text>
          <Text style={[styles.cell, styles.colTime, styles.headText]}>Check in</Text>
          <Text style={[styles.cell, styles.colTime, styles.headText]}>Check out</Text>
          <Text style={[styles.cell, styles.colHours, styles.headText]}>Hours</Text>
          <Text style={[styles.cell, styles.colStatus, styles.headText]}>Status</Text>
        </View>
        {sessions.map((session) => (
          <DutyRow
            key={session.id || `${session.staffName}-${session.entryAt}`}
            session={session}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { alignSelf: 'stretch' },
  table: {
    borderWidth: 1,
    borderColor: SEC.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: SEC.surfaceRaised,
    minWidth: 520,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: SEC.border,
    minHeight: 44,
  },
  headRow: { backgroundColor: SEC.bg, minHeight: 36 },
  rowOpen: { backgroundColor: 'rgba(34, 197, 94, 0.07)' },
  cell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '600',
    color: SEC.text,
  },
  headText: {
    fontSize: 10,
    fontWeight: '800',
    color: SEC.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  colName: { width: 108 },
  colLoc: { width: 100 },
  colTime: { width: 108, lineHeight: 16 },
  colHours: { width: 72 },
  colStatus: { width: 64 },
  checkoutLive: { color: '#93C5FD', fontWeight: '700' },
  hoursLive: { color: '#4ADE80' },
  statusOn: { color: '#22C55E', fontWeight: '800' },
  statusOff: { color: SEC.textMuted },
  emptyWrap: { paddingVertical: 16, paddingHorizontal: 4 },
  empty: { fontSize: 13, color: SEC.textDim, lineHeight: 18 },
});
