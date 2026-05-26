/**
 * Resident Home — Concierge chat experience.
 *
 * The previous "hero + weather + cards" layout was replaced with a
 * full-bleed Concierge so residents land directly in the conversational
 * assistant for classes / events / vendors.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DARK } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { BRAND_LOGO } from '../../constants/branding';
import ConciergePanel from './components/ConciergePanel';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function initialsOf(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || 'U';
}

export default function ResidentHomeScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const firstName = useMemo(
    () => (user?.name ? user.name.split(' ')[0] : 'Resident'),
    [user?.name],
  );

  const greeting = useMemo(
    () =>
      `${getGreeting()}, ${firstName}. I'm your society concierge — ask about classes, events, or vendors.\n\nTip: type "clear" anytime to start a fresh chat.`,
    [firstName],
  );

  const header = (
    <View
      style={[
        styles.header,
        { paddingTop: Math.max(insets.top, 12) + 4 },
      ]}
    >
      <View style={styles.headerLeft}>
        <View style={styles.logoBox}>
          <Image source={BRAND_LOGO} style={styles.logoImg} resizeMode="contain" />
        </View>
        <View>
          <Text style={styles.brand}>Godrej Air</Text>
          <View style={styles.statusRow}>
            <View style={styles.dot} />
            <Text style={styles.statusText}>Concierge online</Text>
          </View>
        </View>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={20} color={DARK.text} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.avatar}
          activeOpacity={0.85}
          onPress={logout}
        >
          <Text style={styles.avatarText}>{initialsOf(user?.name)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />
      <ConciergePanel header={header} greeting={greeting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: DARK.card,
    borderBottomWidth: 1,
    borderBottomColor: DARK.inputBorder,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0F3D3A',
    borderWidth: 1,
    borderColor: DARK.teal + '55',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: 30, height: 30 },
  brand: { color: DARK.text, fontSize: 15, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: { color: DARK.muted, fontSize: 11 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DARK.bg,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: DARK.card,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DARK.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#08121A', fontWeight: '800', fontSize: 13 },
});
