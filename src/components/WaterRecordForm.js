import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import LedgerFormModal, { ModuleSaveButton } from './LedgerFormModal';
import { SEC } from '../constants/moduleThemes';
import { buildModuleFormStyles } from '../styles/moduleFormStyles';
import {
  WATER_PHOTO_TYPE_LABELS,
  WATER_PHOTO_TYPE_ICONS,
} from '../constants/waterPhotoTypes';
import { formatGeoCaption } from '../utils/geoPhoto';
import {
  waterFormFieldStatus,
  waterPhotoTypeStatus,
  allWaterPhotoTypesCaptured,
} from '../utils/waterFormHelpers';
import { WATER_PHOTO_TYPES } from '../constants/waterPhotoTypes';

const wf = buildModuleFormStyles(SEC);
const W_PLACEHOLDER = SEC.textDim;

const CHECKLIST = [
  { type: WATER_PHOTO_TYPES.OPENING, label: 'Starting meter', icon: 'speedometer-outline', hint: 'Reading BEFORE fill' },
  { type: WATER_PHOTO_TYPES.CLOSING, label: 'Ending meter', icon: 'speedometer', hint: 'Reading AFTER fill' },
  { type: WATER_PHOTO_TYPES.TDS, label: 'TDS', icon: 'water-outline', hint: 'Hand-held TDS meter' },
  { type: WATER_PHOTO_TYPES.VEHICLE, label: 'Vehicle number', icon: 'car-outline', hint: 'Tanker number plate' },
];

function SectionHeader({ step, title, complete }) {
  return (
    <View style={localStyles.sectionHeader}>
      <View
        style={[
          localStyles.sectionStepBadge,
          complete && localStyles.sectionStepBadgeDone,
        ]}
      >
        {complete ? (
          <Ionicons name="checkmark" size={12} color="#0F172A" />
        ) : (
          <Text style={localStyles.sectionStepText}>{step}</Text>
        )}
      </View>
      <Text style={localStyles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function FieldRow({ label, value, onChangeText, icon, filled, keyboardType = 'default' }) {
  return (
    <View style={localStyles.fieldRow}>
      <View style={localStyles.fieldLabelRow}>
        <Ionicons name={icon} size={16} color={filled ? SEC.teal : SEC.textDim} />
        <Text style={localStyles.fieldLabel}>{label}</Text>
        {filled ? (
          <View style={localStyles.fieldOkBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
          </View>
        ) : (
          <Text style={localStyles.fieldPending}>Awaiting photo</Text>
        )}
      </View>
      <TextInput
        style={[wf.input, localStyles.fieldInput]}
        placeholder={`Enter ${label.toLowerCase()}`}
        placeholderTextColor={W_PLACEHOLDER}
        keyboardType={keyboardType}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

function PhotoChecklistTile({ label, hint, icon, captured }) {
  return (
    <View
      style={[
        localStyles.checklistTile,
        captured && localStyles.checklistTileDone,
      ]}
    >
      <View
        style={[
          localStyles.checklistIcon,
          captured && localStyles.checklistIconDone,
        ]}
      >
        <Ionicons
          name={captured ? 'checkmark' : icon}
          size={captured ? 18 : 16}
          color={captured ? '#0F172A' : SEC.teal}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={localStyles.checklistLabel}>{label}</Text>
        <Text style={localStyles.checklistHint}>
          {captured ? '✓ Captured' : hint}
        </Text>
      </View>
    </View>
  );
}

export function WaterRecordForm({
  visible,
  onClose,
  form,
  setForm,
  vendors,
  onCapturePhoto,
  onRemovePhoto,
  onRescanPhoto,
  onSave,
  submitDisabled = true,
}) {
  const [vendorPickerOpen, setVendorPickerOpen] = useState(false);
  const selectedVendor = vendors.find((v) => v.id === form.tankerVendorId);
  const fieldStatus = useMemo(() => waterFormFieldStatus(form), [form]);
  const photoTypeStatus = useMemo(() => waterPhotoTypeStatus(form), [form]);
  const typesCapturedCount =
    (photoTypeStatus.opening ? 1 : 0) +
    (photoTypeStatus.closing ? 1 : 0) +
    (photoTypeStatus.tds ? 1 : 0) +
    (photoTypeStatus.vehicle ? 1 : 0);
  const allPhotosCaptured = allWaterPhotoTypesCaptured(form);
  const canCapture = Boolean(form.tankerVendorId) && !allPhotosCaptured;
  const allFieldsFilled =
    fieldStatus.opening && fieldStatus.closing && fieldStatus.tds && fieldStatus.vehicle;
  const dateTimeFilled = fieldStatus.date && fieldStatus.time;
  const vendorPicked = Boolean(form.tankerVendorId);

  const nextMissingType = CHECKLIST.find((c) => !photoTypeStatus[
    c.type === WATER_PHOTO_TYPES.OPENING ? 'opening' :
    c.type === WATER_PHOTO_TYPES.CLOSING ? 'closing' :
    c.type === WATER_PHOTO_TYPES.TDS ? 'tds' : 'vehicle'
  ]);

  return (
    <>
      <LedgerFormModal
        visible={visible}
        onClose={onClose}
        title="Record tanker water"
        theme={SEC}
        maxHeight="92%"
        footer={
          <ModuleSaveButton
            theme={SEC}
            label={submitDisabled ? 'Complete all 4 photos to submit' : 'Submit entry'}
            onPress={onSave}
            disabled={submitDisabled}
          />
        }
      >
        <SectionHeader step={1} title="Tanker vendor" complete={vendorPicked} />
        <TouchableOpacity
          style={[localStyles.select, !form.tankerVendorId && localStyles.selectEmpty]}
          onPress={() => setVendorPickerOpen(true)}
          activeOpacity={0.85}
        >
          <View style={localStyles.selectIconWrap}>
            <Ionicons name="business" size={18} color={SEC.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={localStyles.selectLabel}>
              {selectedVendor ? 'Vendor' : 'Tap to select vendor'}
            </Text>
            <Text
              style={[localStyles.selectText, !selectedVendor && localStyles.selectPlaceholder]}
              numberOfLines={1}
            >
              {selectedVendor?.name || `${vendors.length} vendor${vendors.length === 1 ? '' : 's'} available`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={SEC.textMuted} />
        </TouchableOpacity>

        <SectionHeader step={2} title="Date & time" complete={dateTimeFilled} />
        <View style={localStyles.dateTimeRow}>
          <TextInput
            style={[wf.input, localStyles.dateInput]}
            placeholder="DD/MM/YY"
            placeholderTextColor={W_PLACEHOLDER}
            value={form.date}
            onChangeText={(v) => setForm((p) => ({ ...p, date: v, userValidated: false }))}
          />
          <TextInput
            style={[wf.input, localStyles.timeInput]}
            placeholder="Time"
            placeholderTextColor={W_PLACEHOLDER}
            value={form.time}
            onChangeText={(v) => setForm((p) => ({ ...p, time: v, userValidated: false }))}
          />
        </View>

        <SectionHeader
          step={3}
          title={`Required photos (${typesCapturedCount}/4)`}
          complete={allPhotosCaptured}
        />
        <View style={localStyles.checklistGrid}>
          {CHECKLIST.map((c) => (
            <PhotoChecklistTile
              key={c.type}
              label={c.label}
              hint={c.hint}
              icon={c.icon}
              captured={photoTypeStatus[
                c.type === WATER_PHOTO_TYPES.OPENING ? 'opening' :
                c.type === WATER_PHOTO_TYPES.CLOSING ? 'closing' :
                c.type === WATER_PHOTO_TYPES.TDS ? 'tds' : 'vehicle'
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            localStyles.captureBtn,
            !vendorPicked && localStyles.captureBtnPrompt,
            allPhotosCaptured && localStyles.captureBtnDisabled,
            canCapture && nextMissingType && localStyles.captureBtnActive,
          ]}
          activeOpacity={0.85}
          onPress={() => {
            if (!vendorPicked) {
              setVendorPickerOpen(true);
              return;
            }
            if (allPhotosCaptured) return;
            onCapturePhoto?.();
          }}
          disabled={allPhotosCaptured}
        >
          <Ionicons
            name={
              !vendorPicked
                ? 'business'
                : allPhotosCaptured
                  ? 'checkmark-circle'
                  : 'camera'
            }
            size={20}
            color={
              allPhotosCaptured
                ? SEC.textDim
                : !vendorPicked
                  ? '#F59E0B'
                  : '#0F172A'
            }
          />
          <Text
            style={[
              localStyles.captureBtnText,
              !vendorPicked && localStyles.captureBtnTextPrompt,
              allPhotosCaptured && localStyles.captureBtnTextDisabled,
            ]}
          >
            {!vendorPicked
              ? 'Tap to select vendor first'
              : allPhotosCaptured
                ? 'All 4 photos captured ✓'
                : nextMissingType
                  ? `Take ${nextMissingType.label.toLowerCase()} photo`
                  : 'Take photo'}
          </Text>
        </TouchableOpacity>

        {(form.photos?.length ?? 0) > 0 ? (
          <View style={localStyles.photoGrid}>
            {form.photos.map((photo) => {
              const isScanning = photo.scanStatus === 'scanning';
              const isDone = photo.scanStatus === 'done';
              const isFailed = photo.scanStatus === 'failed';
              const typeLabel = photo.detectedType
                ? WATER_PHOTO_TYPE_LABELS[photo.detectedType] || 'Detected'
                : null;
              const typeIcon = photo.detectedType
                ? WATER_PHOTO_TYPE_ICONS[photo.detectedType] || 'document-text-outline'
                : 'help-circle-outline';

              const lowConf = photo.lowConfidence === true;
              const confPct =
                typeof photo.scanConfidence === 'number'
                  ? Math.round(photo.scanConfidence * 100)
                  : null;
              return (
                <View key={photo.id} style={localStyles.photoCard}>
                  <View style={localStyles.thumbWrap}>
                    <Image source={{ uri: photo.uri }} style={localStyles.thumb} />
                    {isScanning ? (
                      <View style={localStyles.scanOverlay}>
                        <BlurView intensity={45} tint="dark" style={localStyles.scanGlass}>
                          <ActivityIndicator size="small" color={SEC.teal} />
                          <Text style={localStyles.scanText}>Scanning…</Text>
                        </BlurView>
                      </View>
                    ) : null}
                    {isDone && typeLabel ? (
                      <View
                        style={[
                          localStyles.typeBadge,
                          lowConf && localStyles.typeBadgeWarn,
                        ]}
                      >
                        <Ionicons
                          name={lowConf ? 'alert-circle' : typeIcon}
                          size={10}
                          color={lowConf ? '#FEF3C7' : '#A7F3D0'}
                        />
                        <Text style={localStyles.typeBadgeText} numberOfLines={1}>
                          {typeLabel}
                          {confPct != null ? ` · ${confPct}%` : ''}
                        </Text>
                      </View>
                    ) : null}
                    {isFailed ? (
                      <View style={[localStyles.typeBadge, localStyles.typeBadgeError]}>
                        <Text style={localStyles.typeBadgeText}>Scan failed</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={localStyles.photoMeta} numberOfLines={2}>
                    {formatGeoCaption(photo)}
                  </Text>
                  {photo.detectedValue ? (
                    <Text
                      style={[
                        localStyles.detectedValue,
                        lowConf && localStyles.detectedValueWarn,
                      ]}
                      numberOfLines={1}
                    >
                      → {photo.detectedValue}
                      {lowConf ? '  (verify)' : ''}
                    </Text>
                  ) : null}
                  <View style={localStyles.photoActionRow}>
                    {onRescanPhoto && (isDone || isFailed) ? (
                      <TouchableOpacity
                        style={localStyles.actionBtn}
                        onPress={() => onRescanPhoto(photo.id)}
                        hitSlop={8}
                      >
                        <Ionicons name="refresh-outline" size={14} color={SEC.teal} />
                        <Text style={[localStyles.actionBtnText, { color: SEC.teal }]}>
                          Rescan
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={localStyles.actionBtn}
                      onPress={() => onRemovePhoto?.(photo.id)}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={14} color="#F87171" />
                      <Text style={[localStyles.actionBtnText, { color: '#F87171' }]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={localStyles.photoHint}>
            Each photo stores GPS + timestamp. OCR detects meter, TDS, or plate automatically.
          </Text>
        )}

        {allPhotosCaptured ? (
          <>
            <SectionHeader
              step={4}
              title="Readings (verify & edit if needed)"
              complete={allFieldsFilled}
            />
            <TouchableOpacity
              onPress={() =>
                setForm((p) => ({
                  ...p,
                  openingMeter: '',
                  closingMeter: '',
                  tds: '',
                  vehicleNo: '',
                  load: '',
                  userValidated: false,
                }))
              }
              hitSlop={6}
              style={localStyles.clearReadingsBtnInline}
            >
              <Ionicons name="refresh-outline" size={12} color="#F87171" />
              <Text style={localStyles.clearReadings}>Clear all readings</Text>
            </TouchableOpacity>
            <FieldRow
              label="Starting meter"
              icon="speedometer-outline"
              filled={fieldStatus.opening}
              value={form.openingMeter}
              keyboardType="numeric"
              onChangeText={(v) =>
                setForm((p) => ({ ...p, openingMeter: v, userValidated: false }))
              }
            />
            <FieldRow
              label="Ending meter"
              icon="speedometer"
              filled={fieldStatus.closing}
              value={form.closingMeter}
              keyboardType="numeric"
              onChangeText={(v) =>
                setForm((p) => ({ ...p, closingMeter: v, userValidated: false }))
              }
            />
            <FieldRow
              label="TDS"
              icon="water-outline"
              filled={fieldStatus.tds}
              value={form.tds}
              keyboardType="numeric"
              onChangeText={(v) => setForm((p) => ({ ...p, tds: v, userValidated: false }))}
            />
            <FieldRow
              label="Vehicle number"
              icon="car-outline"
              filled={fieldStatus.vehicle}
              value={form.vehicleNo}
              onChangeText={(v) =>
                setForm((p) => ({ ...p, vehicleNo: v.toUpperCase(), userValidated: false }))
              }
            />
          </>
        ) : (
          <View style={localStyles.readingsLocked}>
            <Ionicons name="lock-closed-outline" size={18} color={SEC.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={localStyles.readingsLockedTitle}>
                Readings unlock after all 4 photos
              </Text>
              <Text style={localStyles.readingsLockedHint}>
                {typesCapturedCount > 0
                  ? `${4 - typesCapturedCount} more photo${4 - typesCapturedCount === 1 ? '' : 's'} to go${nextMissingType ? ` — next: ${nextMissingType.label.toLowerCase()}` : ''}.`
                  : 'Start by tapping the camera button above.'}
              </Text>
            </View>
          </View>
        )}

        <SectionHeader
          step={5}
          title="Confirm & submit"
          complete={form.userValidated && allPhotosCaptured && allFieldsFilled}
        />
        <View style={localStyles.statusGrid}>
          <View
            style={[
              localStyles.statusPill,
              allPhotosCaptured && localStyles.statusPillDone,
            ]}
          >
            <Ionicons
              name={allPhotosCaptured ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={allPhotosCaptured ? '#4ADE80' : SEC.textDim}
            />
            <Text style={localStyles.statusPillText}>
              Photos {typesCapturedCount}/4
            </Text>
          </View>
          <View
            style={[
              localStyles.statusPill,
              allFieldsFilled && localStyles.statusPillDone,
            ]}
          >
            <Ionicons
              name={allFieldsFilled ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={allFieldsFilled ? '#4ADE80' : SEC.textDim}
            />
            <Text style={localStyles.statusPillText}>
              Readings {Object.values(fieldStatus).filter((v, i) => i < 4 && v).length}/4
            </Text>
          </View>
        </View>

        {!allPhotosCaptured && (
          <View style={localStyles.warningRow}>
            <Ionicons name="warning-outline" size={14} color="#F59E0B" />
            <Text style={localStyles.warningText}>
              {nextMissingType
                ? `Missing: ${nextMissingType.label}. All 4 photos are required.`
                : 'Capture all 4 photos before submitting.'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[localStyles.validateRow, form.userValidated && localStyles.validateRowActive]}
          onPress={() => {
            if (!allFieldsFilled || !allPhotosCaptured) return;
            setForm((p) => ({ ...p, userValidated: !p.userValidated }));
          }}
          activeOpacity={0.85}
          disabled={!allFieldsFilled || !allPhotosCaptured}
        >
          <Ionicons
            name={form.userValidated ? 'checkbox' : 'square-outline'}
            size={22}
            color={form.userValidated ? SEC.teal : SEC.textDim}
          />
          <Text style={localStyles.validateText}>
            I confirm all readings, photos, date/time, and vendor are correct
          </Text>
        </TouchableOpacity>
      </LedgerFormModal>

      <Modal visible={vendorPickerOpen} transparent animationType="fade" onRequestClose={() => setVendorPickerOpen(false)}>
        <Pressable style={localStyles.pickerOverlay} onPress={() => setVendorPickerOpen(false)}>
          <Pressable style={localStyles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={localStyles.pickerTitle}>Select tanker vendor</Text>
            {vendors.length === 0 ? (
              <View style={localStyles.emptyVendorBox}>
                <Ionicons name="business-outline" size={32} color={SEC.textDim} />
                <Text style={localStyles.emptyVendorText}>No tanker vendors yet</Text>
                <Text style={localStyles.emptyVendorHint}>
                  Add a tanker vendor first from the Water module before recording an entry.
                </Text>
              </View>
            ) : null}
            <ScrollView style={localStyles.pickerList}>
              {vendors.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    localStyles.pickerItem,
                    form.tankerVendorId === v.id && localStyles.pickerItemActive,
                  ]}
                  onPress={() => {
                    // Intentionally do NOT auto-fill vehicleNo from the vendor's
                    // stored plate — the vehicle field is the single source of
                    // truth from the photo scan. Pre-filling it here marks it
                    // as ✓ verified, which misleads the user when a different
                    // tanker shows up today.
                    setForm((p) => ({
                      ...p,
                      tankerVendorId: v.id,
                      source: v.name,
                      userValidated: false,
                    }));
                    setVendorPickerOpen(false);
                  }}
                >
                  <Text style={localStyles.pickerItemName}>{v.name}</Text>
                  <Text style={localStyles.pickerItemSub}>{v.vehicleNo}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function WaterVendorForm({ visible, onClose, form, setForm, onSave }) {
  return (
    <LedgerFormModal
      visible={visible}
      onClose={onClose}
      title="Add tanker vendor"
      theme={SEC}
      footer={<ModuleSaveButton theme={SEC} label="Save vendor" onPress={onSave} />}
    >
      <Text style={wf.hint}>Register a tanker supplier for quick selection when logging water entries.</Text>
      <TextInput
        style={wf.input}
        placeholder="Vendor name"
        placeholderTextColor={W_PLACEHOLDER}
        value={form.name}
        onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
      />
      <TextInput
        style={wf.input}
        placeholder="Contact number"
        placeholderTextColor={W_PLACEHOLDER}
        keyboardType="phone-pad"
        value={form.contactNumber}
        onChangeText={(v) => setForm((p) => ({ ...p, contactNumber: v }))}
      />
      <TextInput
        style={[wf.input, wf.inputMultiline]}
        placeholder="Address"
        placeholderTextColor={W_PLACEHOLDER}
        multiline
        value={form.address}
        onChangeText={(v) => setForm((p) => ({ ...p, address: v }))}
      />
      <TextInput
        style={wf.input}
        placeholder="Vehicle no."
        placeholderTextColor={W_PLACEHOLDER}
        value={form.vehicleNo}
        onChangeText={(v) => setForm((p) => ({ ...p, vehicleNo: v }))}
      />
    </LedgerFormModal>
  );
}

const localStyles = StyleSheet.create({
  selectIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(62, 232, 197, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: SEC.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  captureBtnPrompt: {
    borderColor: 'rgba(245, 158, 11, 0.55)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  captureBtnTextPrompt: {
    color: '#F59E0B',
  },
  emptyVendorBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyVendorText: {
    fontSize: 13,
    fontWeight: '700',
    color: SEC.textMuted,
    textAlign: 'center',
  },
  emptyVendorHint: {
    fontSize: 11,
    fontWeight: '500',
    color: SEC.textDim,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionStepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: SEC.surfaceRaised,
    borderWidth: 1.5,
    borderColor: 'rgba(62, 232, 197, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionStepBadgeDone: {
    backgroundColor: SEC.teal,
    borderColor: SEC.teal,
  },
  sectionStepText: {
    fontSize: 11,
    fontWeight: '800',
    color: SEC.teal,
  },
  sectionHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: SEC.text,
    letterSpacing: 0.3,
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  checklistTile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.surfaceRaised,
  },
  checklistTileDone: {
    borderColor: 'rgba(74, 222, 128, 0.55)',
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  checklistIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(62, 232, 197, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistIconDone: {
    backgroundColor: '#4ADE80',
  },
  checklistLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: SEC.text,
    marginBottom: 1,
  },
  checklistHint: {
    fontSize: 10,
    fontWeight: '600',
    color: SEC.textMuted,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: SEC.surfaceRaised,
    borderWidth: 1,
    borderColor: SEC.border,
    marginBottom: 14,
  },
  captureBtnActive: {
    backgroundColor: SEC.teal,
    borderColor: SEC.teal,
  },
  captureBtnDisabled: {
    opacity: 0.55,
  },
  captureBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  captureBtnTextDisabled: {
    color: SEC.textDim,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.surfaceRaised,
  },
  statusPillDone: {
    borderColor: 'rgba(74, 222, 128, 0.5)',
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: SEC.text,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    marginBottom: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#FCD34D',
  },
  readingsLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderStyle: 'dashed',
  },
  readingsLockedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: SEC.textMuted,
    marginBottom: 2,
  },
  readingsLockedHint: {
    fontSize: 11,
    fontWeight: '500',
    color: SEC.textDim,
    lineHeight: 15,
  },
  clearReadingsBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.surfaceRaised,
    marginBottom: 12,
  },
  selectEmpty: {
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  selectText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: SEC.text,
  },
  selectPlaceholder: {
    color: SEC.textDim,
    fontWeight: '600',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  dateInput: {
    flex: 1.2,
  },
  timeInput: {
    flex: 1,
  },
  uploadBtnDisabled: {
    opacity: 0.55,
  },
  uploadBtnTextDisabled: {
    color: SEC.textDim,
  },
  photoHint: {
    fontSize: 11,
    color: SEC.textMuted,
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    marginBottom: 12,
  },
  photoCard: {
    width: '48%',
    backgroundColor: SEC.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SEC.border,
    padding: 8,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  scanGlass: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 18, 25, 0.6)',
    gap: 6,
  },
  scanText: {
    fontSize: 10,
    fontWeight: '800',
    color: SEC.teal,
  },
  typeBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.85)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  typeBadgeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
  },
  typeBadgeWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ECFDF5',
    flex: 1,
  },
  photoMeta: {
    fontSize: 9,
    color: SEC.textMuted,
    marginTop: 6,
    lineHeight: 12,
  },
  detectedValue: {
    fontSize: 11,
    fontWeight: '800',
    color: SEC.teal,
    marginTop: 2,
  },
  detectedValueWarn: {
    color: '#F59E0B',
  },
  photoActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  clearReadings: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F87171',
    textDecorationLine: 'underline',
  },
  fieldRow: {
    marginBottom: 10,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fieldLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: SEC.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldOkBadge: {
    marginLeft: 'auto',
  },
  fieldPending: {
    fontSize: 10,
    fontWeight: '600',
    color: SEC.textDim,
    marginLeft: 'auto',
  },
  fieldInput: {
    marginBottom: 0,
  },
  validateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.bg,
    marginBottom: 8,
  },
  validateRowActive: {
    borderColor: 'rgba(62, 232, 197, 0.45)',
    backgroundColor: 'rgba(62, 232, 197, 0.08)',
  },
  validateText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: SEC.text,
    lineHeight: 18,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: SEC.surfaceRaised,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '50%',
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: SEC.text,
    marginBottom: 12,
  },
  pickerList: {
    maxHeight: 280,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SEC.border,
    marginBottom: 8,
    backgroundColor: SEC.surfaceRaised,
  },
  pickerItemActive: {
    borderColor: SEC.teal,
    backgroundColor: 'rgba(62, 232, 197, 0.1)',
  },
  pickerItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: SEC.text,
  },
  pickerItemSub: {
    fontSize: 11,
    color: SEC.textMuted,
    marginTop: 2,
  },
});
