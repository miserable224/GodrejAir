import React, { useMemo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

function themeAccent(theme) {
  return theme.accent ?? theme.teal ?? theme.gold ?? '#2dd4bf';
}

/** Max width for compact role rows inside modals (matches security role list). */
export const ROLE_ROW_MAX_WIDTH = 360;

/** Show DB role keys as readable labels; wrap only at spaces. */
function formatRoleLabel(label) {
  if (!label) return '';
  return String(label).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function createRowStyles(theme) {
  const accent = themeAccent(theme);

  return StyleSheet.create({
    block: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: ROLE_ROW_MAX_WIDTH,
      backgroundColor: theme.surfaceRaised || theme.bg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 10,
      paddingVertical: 9,
      marginBottom: 8,
    },
    line: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    title: {
      width: 94,
      flexShrink: 0,
      fontSize: 10,
      fontWeight: '800',
      color: accent,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      lineHeight: 13,
    },
    shiftsWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      minWidth: 0,
    },
    shiftGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
    },
    shiftLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.textMuted,
      flexShrink: 0,
    },
    shiftInput: {
      width: 46,
      height: 34,
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 4,
      paddingVertical: 0,
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
    },
  });
}

/** One role per row: role label · S1 label+input · S2 label+input (single horizontal line). */
export default function AttendanceRoleRow({ theme, roleLabel, shifts, placeholderColor }) {
  const row = useMemo(() => createRowStyles(theme), [theme]);
  const displayLabel = formatRoleLabel(roleLabel);

  return (
    <View style={row.block}>
      <View style={row.line}>
        <Text style={row.title} numberOfLines={2}>
          {displayLabel}
        </Text>
        <View style={row.shiftsWrap}>
          {shifts.map((shift) => (
            <View key={shift.key} style={row.shiftGroup}>
              <Text style={row.shiftLabel} numberOfLines={1}>
                {shift.label}
              </Text>
              <TextInput
                style={row.shiftInput}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={placeholderColor}
                value={shift.value}
                onChangeText={shift.onChangeText}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
