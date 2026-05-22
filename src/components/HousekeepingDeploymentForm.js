import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LedgerFormModal, { ModuleSaveButton } from './LedgerFormModal';
import { SEC } from '../constants/moduleThemes';
import { buildModuleFormStyles } from '../styles/moduleFormStyles';
import { formatGeoCaption } from '../utils/geoPhoto';

const formStyles = buildModuleFormStyles(SEC);

export default function HousekeepingDeploymentForm({
  visible,
  onClose,
  form,
  photo,
  pendingEntries,
  pendingCount,
  draftQueuedCount,
  onOpenPicker,
  onPickCamera,
  onAddToQueue,
  onRemoveQueued,
  onSaveAll,
  saving,
}) {
  const saveCount = pendingCount + (draftQueuedCount ? 1 : 0);

  return (
    <LedgerFormModal
      visible={visible}
      onClose={onClose}
      title="Add Housekeeping"
      theme={SEC}
      maxHeight="88%"
      footer={
        <ModuleSaveButton
          theme={SEC}
          label={saveCount > 0 ? `Save all (${saveCount})` : 'Save all'}
          onPress={onSaveAll}
          loading={saving}
          disabled={saving || saveCount === 0}
        />
      }
    >
      <Text style={formStyles.hint}>
        Add HK staff with a camera photo (GPS captured automatically), then save in one API call.
      </Text>

      <TouchableOpacity style={formStyles.select} activeOpacity={0.85} onPress={() => onOpenPicker('designation')}>
        <Text style={[formStyles.selectText, !form.designation && formStyles.selectPlaceholder]} numberOfLines={1}>
          {form.designation || 'Select designation'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={SEC.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={formStyles.select} activeOpacity={0.85} onPress={() => onOpenPicker('name')}>
        <Text style={[formStyles.selectText, !form.name && formStyles.selectPlaceholder]} numberOfLines={1}>
          {form.name || 'Select staff name'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={SEC.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.85} onPress={onPickCamera}>
        <Ionicons name="camera-outline" size={18} color={SEC.teal} />
        <Text style={styles.cameraBtnText}>Camera</Text>
      </TouchableOpacity>

      {photo?.uri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: photo.uri }} style={styles.thumb} />
          <Text style={styles.caption} numberOfLines={2}>
            {formatGeoCaption(photo)}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.addBtn} activeOpacity={0.9} onPress={onAddToQueue}>
        <Ionicons name="add-circle-outline" size={18} color={SEC.saveOnAccent} />
        <Text style={styles.addBtnText}>Add Housekeeping</Text>
      </TouchableOpacity>

      {pendingEntries.length > 0 ? (
        <View style={styles.queueList}>
          <Text style={styles.queueTitle}>Queued ({pendingEntries.length})</Text>
          {pendingEntries.map((entry) => (
            <View key={entry.localId} style={styles.queueRow}>
              {entry.photo?.uri ? (
                <Image source={{ uri: entry.photo.uri }} style={styles.queueThumb} />
              ) : null}
              <View style={styles.queueMeta}>
                <Text style={styles.queueName} numberOfLines={1}>
                  {entry.staffName}
                </Text>
                <Text style={styles.queueSub} numberOfLines={1}>
                  {entry.designation}
                </Text>
              </View>
              <TouchableOpacity onPress={() => onRemoveQueued(entry.localId)} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={SEC.red} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
    </LedgerFormModal>
  );
}

const styles = StyleSheet.create({
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.bg,
    marginTop: 4,
  },
  cameraBtnText: { fontSize: 13, fontWeight: '700', color: SEC.teal },
  previewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.surfaceRaised,
  },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: SEC.bg },
  caption: { flex: 1, fontSize: 11, fontWeight: '600', color: SEC.textDim },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: SEC.saveAccent,
  },
  addBtnText: { fontSize: 15, fontWeight: '800', color: SEC.saveOnAccent },
  queueList: { marginTop: 16, gap: 8 },
  queueTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: SEC.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.surfaceRaised,
  },
  queueThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: SEC.bg },
  queueMeta: { flex: 1, minWidth: 0 },
  queueName: { fontSize: 14, fontWeight: '700', color: SEC.text },
  queueSub: { fontSize: 11, color: SEC.textMuted, marginTop: 2 },
});
