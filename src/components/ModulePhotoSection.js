import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatGeoCaption } from '../utils/geoPhoto';
import { ROLE_ROW_MAX_WIDTH } from './AttendanceRoleRow';

function themeAccent(theme) {
  return theme.accent ?? theme.teal ?? theme.gold ?? '#2dd4bf';
}

function createStyles(theme) {
  const accent = themeAccent(theme);
  return StyleSheet.create({
    root: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: ROLE_ROW_MAX_WIDTH,
    },
    uploadRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
      marginBottom: 10,
    },
    uploadBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg,
    },
    uploadBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: accent,
    },
    previewWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceRaised || theme.bg,
    },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: 10,
      backgroundColor: theme.bg,
    },
    caption: {
      flex: 1,
      fontSize: 11,
      fontWeight: '600',
      color: theme.textDim,
      lineHeight: 15,
    },
  });
}

/** Single camera + gallery block below form fields (deployment-style). */
export default function ModulePhotoSection({
  theme,
  photo,
  onCamera,
  onGallery,
  onRemovePhoto,
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const accent = themeAccent(theme);

  return (
    <View style={styles.root}>
      <View style={styles.uploadRow}>
        <TouchableOpacity style={styles.uploadBtn} onPress={onCamera} activeOpacity={0.85}>
          <Ionicons name="camera-outline" size={18} color={accent} />
          <Text style={styles.uploadBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadBtn} onPress={onGallery} activeOpacity={0.85}>
          <Ionicons name="images-outline" size={18} color={accent} />
          <Text style={styles.uploadBtnText}>Gallery</Text>
        </TouchableOpacity>
      </View>
      {photo?.uri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: photo.uri }} style={styles.thumb} />
          <Text style={styles.caption} numberOfLines={3}>
            {formatGeoCaption(photo)}
          </Text>
          {onRemovePhoto ? (
            <TouchableOpacity onPress={onRemovePhoto} hitSlop={8} activeOpacity={0.85}>
              <Ionicons name="close-circle" size={22} color={theme.red || '#f87171'} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
