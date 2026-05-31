import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ToastContext = createContext(null);

const TOAST_META = {
  success: {
    icon: 'checkmark-circle',
    accent: '#4ade80',
    bg: 'rgba(34, 197, 94, 0.14)',
    border: 'rgba(74, 222, 128, 0.45)',
  },
  error: {
    icon: 'close-circle',
    accent: '#f87171',
    bg: 'rgba(239, 68, 68, 0.14)',
    border: 'rgba(248, 113, 113, 0.45)',
  },
  warning: {
    icon: 'warning',
    accent: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(251, 191, 36, 0.45)',
  },
  info: {
    icon: 'information-circle',
    accent: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.4)',
  },
};

function ToastBanner({ toast, onDismiss }) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const meta = TOAST_META[toast.type] || TOAST_META.info;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -10,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onDismiss();
    });
  }, [onDismiss, opacity, translateY]);

  return (
    <View
      style={[styles.host, { paddingTop: Math.max(insets.top, 12) + 8 }]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.toast,
          {
            opacity,
            transform: [{ translateY }],
            backgroundColor: meta.bg,
            borderColor: meta.border,
          },
        ]}
      >
        <Ionicons name={meta.icon} size={22} color={meta.accent} style={styles.icon} />
        <View style={styles.textWrap}>
          {toast.title ? (
            <Text style={[styles.title, { color: meta.accent }]} numberOfLines={2}>
              {toast.title}
            </Text>
          ) : null}
          {toast.message ? (
            <Text style={styles.message} numberOfLines={4}>
              {toast.message}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={dismiss}
          hitSlop={10}
          style={styles.closeBtn}
          accessibilityLabel="Dismiss notification"
        >
          <Ionicons name="close" size={18} color="#9ca3af" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const hideTimerRef = useRef(null);

  const hideToast = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    ({ type = 'info', title = '', message = '', duration = 3800 } = {}) => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      const next = {
        type: TOAST_META[type] ? type : 'info',
        title: String(title || '').trim(),
        message: String(message || '').trim(),
      };
      setToast(next);
      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null;
        setToast(null);
      }, Math.max(2000, duration));
    },
    [],
  );

  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastBanner toast={toast} onDismiss={hideToast} /> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: 'center',
    paddingHorizontal: 16,
    ...Platform.select({
      web: { position: 'fixed' },
      default: {},
    }),
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  icon: {
    marginRight: 10,
    marginTop: 1,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    color: '#e5e7eb',
    lineHeight: 18,
  },
  closeBtn: {
    marginLeft: 8,
    padding: 2,
  },
});
