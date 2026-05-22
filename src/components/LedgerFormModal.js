import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SEC, SEC_FONTS } from '../constants/moduleThemes';

/**
 * Themed bottom-sheet modal (Security / Housekeeping / Water).
 */
export default function LedgerFormModal({
  visible,
  onClose,
  title,
  children,
  footer,
  maxHeight = '88%',
  theme = SEC,
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetHost}
        >
          <View style={[styles.sheet, { maxHeight }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function ModuleSaveButton({ label, onPress, loading, disabled, theme = SEC }) {
  const styles = useMemo(() => createStyles(theme), [theme]);

  const inactive = Boolean(loading || disabled);

  return (
    <TouchableOpacity
      style={[styles.saveBtn, inactive && styles.saveBtnDisabled]}
      onPress={() => {
        if (!inactive) onPress?.();
      }}
      activeOpacity={0.88}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.saveOnAccent} />
      ) : (
        <Text style={styles.saveBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(7, 10, 16, 0.78)',
    },
    sheetHost: {
      width: '100%',
      maxWidth: 380,
      alignSelf: 'center',
      zIndex: 10,
      ...Platform.select({
        web: { position: 'relative' },
        default: { elevation: 24 },
      }),
    },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'ios' ? 24 : 18,
      paddingTop: 8,
      width: '100%',
      flexDirection: 'column',
      ...Platform.select({
        web: { boxShadow: '0 -12px 48px rgba(0,0,0,0.55)' },
        default: {},
      }),
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    title: {
      ...SEC_FONTS.modalTitle,
      flex: 1,
      color: theme.text,
    },
    closeBtn: {
      padding: 4,
    },
    scroll: {
      flexGrow: 1,
      flexShrink: 1,
    },
    scrollContent: {
      paddingBottom: 8,
    },
    footer: {
      flexShrink: 0,
      paddingTop: 8,
      zIndex: 20,
      ...Platform.select({
        web: { position: 'relative' },
        default: {},
      }),
    },
    saveBtn: {
      backgroundColor: theme.saveAccent,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      minHeight: 48,
      width: '100%',
      ...Platform.select({
        web: { cursor: 'pointer' },
        default: {},
      }),
    },
    saveBtnPressed: {
      opacity: 0.92,
    },
    saveBtnDisabled: {
      opacity: 0.65,
    },
    saveBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.saveOnAccent,
    },
  });
}
