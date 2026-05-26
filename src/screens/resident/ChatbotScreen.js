/**
 * Standalone Concierge screen — kept for cases where chat is pushed
 * onto the navigation stack (e.g. from a future deep link). The
 * resident Home tab already embeds the same ConciergePanel.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DARK } from '../../constants/theme';
import ConciergePanel from './components/ConciergePanel';

export default function ChatbotScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const header = (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
      <TouchableOpacity
        style={styles.headerBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={22} color={DARK.text} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <View style={styles.headerAvatar}>
          <Ionicons name="sparkles" size={16} color={DARK.teal} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Concierge</Text>
          <Text style={styles.headerSub}>Classes · Events · Vendors</Text>
        </View>
      </View>
      <View style={styles.headerBtn} />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />
      <ConciergePanel header={header} withSafeBottom />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DARK.inputBorder,
    backgroundColor: DARK.card,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0F3D3A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DARK.teal + '55',
  },
  headerTitle: { color: DARK.text, fontSize: 15, fontWeight: '700' },
  headerSub: { color: DARK.muted, fontSize: 11, marginTop: 1 },
});
