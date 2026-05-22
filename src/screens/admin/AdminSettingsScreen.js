import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomTabBarHeight } from '../../utils/safeTabBarHeight';
import { COLORS, SIZES, DARK } from '../../constants/theme';
import AmbientBackground from '../../components/AmbientBackground';
import { useAuth } from '../../context/AuthContext';
import { isModuleVisible } from '../../constants/roles';

const SETTINGS_SECTIONS = [
  {
    label: 'Actions',
    items: [
      {
        id: 'recordPatrol',
        title: 'Patrolling',
        subtitle: 'Record patrol from Home → Security',
        icon: 'walk-outline',
        color: '#0F766E',
        moduleId: 'Security',
        homeAction: 'recordPatrol',
      },
      {
        id: 'addPromotions',
        title: 'Book Promotion',
        subtitle: 'Dates, vendor, board member & GST 18%',
        icon: 'megaphone-outline',
        color: '#D97706',
        moduleId: 'promotions',
        stackScreen: 'AdminPromotions',
        params: { openForm: true },
      },
    ],
  },
];

export default function AdminSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const tabBarH = useSafeBottomTabBarHeight();
  const { logout, user } = useAuth();

  const sections = useMemo(
    () =>
      SETTINGS_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((a) => {
          if (a.stackScreen === 'AdminPromotions') {
            return isModuleVisible('promotions', user?.apiRole);
          }
          return isModuleVisible(a.moduleId, user?.apiRole);
        }),
      })).filter((s) => s.items.length > 0),
    [user?.apiRole],
  );

  const stackNav = navigation.getParent();

  const onActionPress = (action) => {
    if (action.stackScreen) {
      stackNav?.navigate(action.stackScreen, action.params ?? {});
      return;
    }
    if (action.homeAction) {
      stackNav?.navigate('Home', { settingsAction: action.homeAction });
    }
  };

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />
      <LinearGradient
        colors={COLORS.adminHeaderGradient}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 12 : 8) }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} accessibilityLabel="Sign out">
            <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>Quick actions & society tools</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarH + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {sections.length === 0 ? (
          <Text style={styles.emptyHint}>No settings available for your role.</Text>
        ) : (
          sections.map((section) => (
            <View key={section.label} style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              {section.items.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionCard}
                  activeOpacity={0.85}
                  onPress={() => onActionPress(action)}
                >
                  <View style={[styles.actionIcon, { backgroundColor: `${action.color}22` }]}>
                    <Ionicons name={action.icon} size={24} color={action.color} />
                  </View>
                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionSub}>{action.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={DARK.label} />
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK.bg },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  headerTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.2,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSub: {
    marginTop: 6,
    fontSize: SIZES.fontSm,
    color: 'rgba(255,255,255,0.65)',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionBlock: { marginBottom: 8 },
  sectionLabel: {
    fontSize: SIZES.fontXs,
    fontWeight: '700',
    color: DARK.label,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  emptyHint: {
    fontSize: SIZES.fontMd,
    color: DARK.muted,
    lineHeight: 22,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1 },
  actionTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '700',
    color: DARK.text,
    marginBottom: 2,
  },
  actionSub: {
    fontSize: SIZES.fontSm,
    color: DARK.muted,
    lineHeight: 18,
  },
});
