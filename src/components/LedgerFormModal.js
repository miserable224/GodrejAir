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
  /** When false, form body does not scroll — use for compact duty check-in/out sheets. */
  scrollable = true,
  sheetMaxWidth = 400,
  theme = SEC,
}) {
  const styles = useMemo(() => createStyles(theme, sheetMaxWidth), [theme, sheetMaxWidth]);

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
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              <Pressable
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={16}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={theme.textMuted ?? theme.text}
                />
              </Pressable>
            </View>
            {scrollable ? (
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.bodyStatic}>{children}</View>
            )}
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

function createStyles(theme, sheetMaxWidth = 400) {
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
      maxWidth: sheetMaxWidth,
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
      overflow: 'hidden',
      ...Platform.select({
        web: {
          boxShadow: '0 -12px 48px rgba(0,0,0,0.55)',
          maxHeight: '92vh',
        },
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
      flexShrink: 0,
      zIndex: 100,
      backgroundColor: theme.surface,
      ...Platform.select({
        web: { position: 'sticky', top: 0 },
        default: {},
      }),
    },
    title: {
      ...SEC_FONTS.modalTitle,
      flex: 1,
      color: theme.text,
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceRaised ?? 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: theme.border ?? theme.inputBorder,
      marginLeft: 10,
      flexShrink: 0,
      zIndex: 110,
      ...Platform.select({
        web: { cursor: 'pointer' },
        default: {},
      }),
    },
    scroll: {
      flex: 1,
      minHeight: 0,
    },
    scrollContent: {
      paddingBottom: 12,
      flexGrow: 1,
    },
    bodyStatic: {
      flexShrink: 0,
      paddingBottom: 4,
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
