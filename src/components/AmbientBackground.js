import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
const { width, height } = Dimensions.get('window');

/** Soft gradient orbs — matches login screen atmosphere. */
export default function AmbientBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['rgba(0,245,212,0.12)', 'transparent']}
        style={[styles.orb, styles.orbTopLeft]}
      />
      <LinearGradient
        colors={['rgba(168,85,247,0.1)', 'transparent']}
        style={[styles.orb, styles.orbBottomRight]}
      />
      <LinearGradient
        colors={['rgba(79,142,247,0.06)', 'transparent']}
        style={[styles.orb, styles.orbCenter]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbTopLeft: {
    width: width * 0.75,
    height: width * 0.75,
    top: -width * 0.28,
    left: -width * 0.22,
  },
  orbBottomRight: {
    width: width * 0.7,
    height: width * 0.7,
    bottom: -width * 0.18,
    right: -width * 0.22,
  },
  orbCenter: {
    width: width * 0.55,
    height: width * 0.55,
    top: height * 0.32,
    left: width * 0.22,
  },
});
