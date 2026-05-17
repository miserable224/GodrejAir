import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { brandTextStyles, DARK } from '../constants/theme';

export default function BrandWordmark({ size = 22, style }) {
  const s = { fontSize: size };
  return (
    <View style={[brandTextStyles.row, style]}>
      <Text style={[brandTextStyles.godrej, s]}>Godrej</Text>
      <Text style={[brandTextStyles.air, s]}> Air</Text>
    </View>
  );
}

export function BrandWordmarkLarge({ style }) {
  return (
    <View style={[brandTextStyles.row, style]}>
      <Text style={styles.godrejLg}>Godrej</Text>
      <Text style={styles.airLg}> Air</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  godrejLg: {
    fontSize: 28,
    fontWeight: '800',
    color: DARK.teal,
    letterSpacing: -0.6,
  },
  airLg: {
    fontSize: 28,
    fontWeight: '800',
    color: DARK.text,
    letterSpacing: -0.6,
  },
});
