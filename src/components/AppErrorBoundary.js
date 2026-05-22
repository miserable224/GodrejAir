import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[AppErrorBoundary]', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.msg}>{error?.message || 'Unknown error'}</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => this.setState({ error: null })}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#070A10',
  },
  title: { color: '#F9FAFB', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  msg: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  btn: {
    backgroundColor: '#F2C94C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { color: '#0B0E14', fontWeight: '800' },
});
