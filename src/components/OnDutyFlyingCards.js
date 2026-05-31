import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SEC } from '../constants/moduleThemes';

const VARIANTS = {
  security: {
    cardBg: 'rgba(37, 99, 235, 0.14)',
    border: 'rgba(96, 165, 250, 0.45)',
    dot: '#22C55E',
    name: SEC.text,
    loc: SEC.textMuted,
    icon: 'shield-checkmark',
    iconColor: '#93C5FD',
  },
  housekeeping: {
    cardBg: 'rgba(20, 184, 166, 0.14)',
    border: 'rgba(45, 212, 191, 0.45)',
    dot: '#22C55E',
    name: SEC.text,
    loc: SEC.textMuted,
    icon: 'sparkles',
    iconColor: '#5EEAD4',
  },
};

function locationLine(session) {
  const loc = (session.locationName || '').trim();
  const role = (session.designation || '').trim();
  if (loc && role) return `${loc} · ${role}`;
  return loc || role || 'On site';
}

function OnDutyCard({ session, index, variant }) {
  const theme = VARIANTS[variant] || VARIANTS.security;
  const drift = useSharedValue(0);

  useEffect(() => {
    const duration = 2200 + (index % 5) * 180;
    drift.value = withRepeat(
      withSequence(
        withTiming(-5, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(5, { duration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [index, drift]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: drift.value },
      { rotate: `${((index % 3) - 1) * 1.5}deg` },
    ],
  }));

  const stagger = (index % 3) * 6;

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60).springify().damping(14)}
      style={[styles.cardWrap, { marginTop: stagger }]}
    >
      <Animated.View style={floatStyle}>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={[styles.dot, { backgroundColor: theme.dot }]} />
          <View style={styles.cardBody}>
            <Text style={[styles.name, { color: theme.name }]} numberOfLines={1}>
              {session.staffName || 'Staff'}
            </Text>
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={12} color={theme.iconColor} />
              <Text style={[styles.loc, { color: theme.loc }]} numberOfLines={2}>
                {locationLine(session)}
              </Text>
            </View>
          </View>
          <View style={[styles.iconBadge, { backgroundColor: `${theme.iconColor}22` }]}>
            <Ionicons name={theme.icon} size={16} color={theme.iconColor} />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Horizontal “flying” cards for staff currently on duty, with post/location.
 */
export default function OnDutyFlyingCards({
  sessions = [],
  loading = false,
  variant = 'security',
  emptyMessage = 'No one checked in right now.',
  title = 'On site now',
}) {
  const count = sessions.length;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title} {loading ? '' : `(${count})`}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color={SEC.teal} style={styles.loader} />
      ) : count === 0 ? (
        <Text style={styles.empty}>{emptyMessage}</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
        >
          {sessions.map((session, index) => (
            <OnDutyCard
              key={session.id || `${session.staffName}-${index}`}
              session={session}
              index={index}
              variant={variant}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: 'stretch',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: SEC.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  loader: { marginVertical: 12, alignSelf: 'flex-start' },
  empty: {
    fontSize: 13,
    color: SEC.textDim,
    paddingVertical: 12,
    lineHeight: 18,
  },
  scrollContent: {
    paddingRight: 12,
    paddingBottom: 8,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardWrap: {
    width: 168,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    minHeight: 72,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  loc: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
