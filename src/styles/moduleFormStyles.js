import { StyleSheet, Platform } from 'react-native';
import { SEC_FONTS } from '../constants/moduleThemes';

/** Themed form field styles for LedgerFormModal content. */
export function buildModuleFormStyles(theme) {
  return StyleSheet.create({
    hint: {
      ...SEC_FONTS.modalHint,
      color: theme.textMuted,
      marginBottom: 14,
    },
    input: {
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.text,
      marginBottom: 10,
      ...Platform.select({ web: { outlineStyle: 'none' } }),
    },
    inputMultiline: {
      minHeight: 88,
      textAlignVertical: 'top',
    },
    select: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      marginBottom: 10,
    },
    selectText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    selectPlaceholder: {
      color: theme.textDim,
      fontWeight: '500',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg,
    },
    chipActive: {
      borderColor: theme.accentBorder,
      backgroundColor: theme.accentDim,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
    },
    chipTextActive: {
      color: theme.accent,
    },
    sectionLabel: {
      ...SEC_FONTS.label,
      color: theme.textDim,
      marginBottom: 8,
      marginTop: 4,
    },
    roleBlock: {
      backgroundColor: theme.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      marginBottom: 10,
    },
    roleTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.accent,
      marginBottom: 8,
    },
    shiftRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    shiftWrap: {
      flex: 1,
      minWidth: '42%',
    },
    shiftLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted,
      marginBottom: 4,
    },
    uploadRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    uploadBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.accentBorder,
      backgroundColor: theme.accentDim,
      ...Platform.select({ web: { cursor: 'pointer' } }),
    },
    uploadBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.accent,
    },
    fileMeta: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 10,
    },
  });
}
