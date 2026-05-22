import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function GuardHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Text style={styles.greeting}>Hello, {user?.name || 'Guard'}</Text>
        <Text style={styles.sub}>Security operations · {user?.apiRole || 'SECURITY_GUARD'}</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.white} />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Today&apos;s tasks</Text>

        <TouchableOpacity
          style={[styles.card, SHADOWS.medium]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('GuardDuty')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#1E3A5F' }]}>
            <Ionicons name="shield-checkmark" size={28} color="#FFF" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Check in / Check out</Text>
            <Text style={styles.cardSub}>Report on duty at your post with photo and GPS</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, SHADOWS.medium]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('GuardWorkforce')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#0F766E' }]}>
            <Ionicons name="walk" size={28} color="#FFF" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Patrol</Text>
            <Text style={styles.cardSub}>Record patrol with photo and location</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  logoutText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  body: { flex: 1, padding: 20 },
  sectionTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  cardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
});
