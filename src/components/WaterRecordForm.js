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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import LedgerFormModal, { ModuleSaveButton } from './LedgerFormModal';
import { SEC, WATER } from '../constants/moduleThemes';
import { buildModuleFormStyles } from '../styles/moduleFormStyles';
import {
  WATER_PHOTO_TYPE_LABELS,
  WATER_PHOTO_TYPE_ICONS,
} from '../constants/waterPhotoTypes';
import { resolvePhotoUri } from '../utils/geoPhoto';
import { formatVendorPlates } from '../utils/waterVehiclePlates';
import {
  waterFormFieldStatus,
  allWaterPhotoTypesCaptured,
  nextMissingWaterPhotoChecklistItem,
  waterPhotoTypesCapturedCount,
  waterFormSubmitHint,
} from '../utils/waterFormHelpers';

const wf = buildModuleFormStyles(SEC);
const W_PLACEHOLDER = SEC.textDim;

const READING_FIELDS = [
  {
    key: 'vehicleNo',
    label: 'Vehicle no.',
    shortLabel: 'Vehicle',
    icon: 'car-outline',
    statusKey: 'vehicle',
    keyboardType: 'default',
    upper: true,
    placeholder: 'KA01AB1234',
  },
  {
    key: 'tds',
    label: 'TDS',
    shortLabel: 'TDS',
    icon: 'water-outline',
    statusKey: 'tds',
    keyboardType: 'numeric',
    placeholder: 'e.g. 245',
  },
  {
    key: 'openingMeter',
    label: 'Starting meter',
    shortLabel: 'Start mtr',
    icon: 'speedometer-outline',
    statusKey: 'opening',
    keyboardType: 'numeric',
    placeholder: 'Before fill',
  },
  {
    key: 'closingMeter',
    label: 'Ending meter',
    shortLabel: 'End mtr',
    icon: 'speedometer',
    statusKey: 'closing',
    keyboardType: 'numeric',
    placeholder: 'After fill',
  },
];

const READING_ROWS = [
  [READING_FIELDS[0], READING_FIELDS[1]],
  [READING_FIELDS[2], READING_FIELDS[3]],
];

function SectionHeader({ step, title, complete, first = false }) {
  return (
    <View style={[localStyles.sectionHeader, first && localStyles.sectionHeaderFirst]}>
      <View
        style={[
          localStyles.sectionStepBadge,
          complete && localStyles.sectionStepBadgeDone,
        ]}
      >
        {complete ? (
          <Ionicons name="checkmark" size={11} color="#0F172A" />
        ) : (
          <Text style={localStyles.sectionStepText}>{step}</Text>
        )}
      </View>
      <Text style={localStyles.sectionHeaderText} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

function CompactField({ field, value, filled, onChangeText }) {
  return (
    <View style={localStyles.gridCell}>
      <View style={localStyles.gridLabelRow}>
        <Ionicons name={field.icon} size={13} color={filled ? SEC.teal : SEC.textDim} />
        <Text style={localStyles.gridLabel} numberOfLines={1}>
          {field.shortLabel}
        </Text>
        {filled ? (
          <Ionicons name="checkmark-circle" size={12} color="#4ADE80" />
        ) : null}
      </View>
      <TextInput
        style={[wf.input, localStyles.gridInput]}
        placeholder={field.placeholder}
        placeholderTextColor={W_PLACEHOLDER}
        keyboardType={field.keyboardType}
        value={value}
        onChangeText={onChangeText}
      />
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
  const typesCapturedCount = waterPhotoTypesCapturedCount(form);
  const allPhotosCaptured = allWaterPhotoTypesCaptured(form);
  const canCapture = Boolean(form.tankerVendorId) && !allPhotosCaptured;
  const allFieldsFilled =
    fieldStatus.opening && fieldStatus.closing && fieldStatus.tds && fieldStatus.vehicle;
  const dateTimeFilled = fieldStatus.date && fieldStatus.time;
  const vendorPicked = Boolean(form.tankerVendorId);
  const nextMissingType = nextMissingWaterPhotoChecklistItem(form);
  const submitHint = waterFormSubmitHint(form);
  const readingsFilledCount = READING_FIELDS.filter((f) => fieldStatus[f.statusKey]).length;

  return (
    <>
      <LedgerFormModal
        visible={visible}
        onClose={onClose}
        title="Record tanker water"
        theme={WATER}
        maxHeight="96%"
        footer={
          <View style={localStyles.formFooter}>
            <TouchableOpacity
              style={localStyles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Close form"
            >
              <Ionicons name="close" size={18} color={WATER.textMuted} />
              <Text style={localStyles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
            <View style={localStyles.formFooterSubmit}>
              <ModuleSaveButton
                theme={WATER}
                label={submitDisabled ? submitHint : 'Submit entry'}
                onPress={onSave}
                disabled={submitDisabled}
              />
            </View>
          </View>
        }
      >
        {/* Step 1 — vendor + date/time in one compact block */}
        <SectionHeader step={1} title="Vendor & date" complete={vendorPicked && dateTimeFilled} first />
        <View style={localStyles.basicsCard}>
          <TouchableOpacity
            style={[localStyles.vendorRow, !form.tankerVendorId && localStyles.vendorRowEmpty]}
            onPress={() => setVendorPickerOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="business" size={16} color={SEC.teal} />
            <Text
              style={[localStyles.vendorText, !selectedVendor && localStyles.vendorPlaceholder]}
              numberOfLines={1}
            >
              {selectedVendor?.name || 'Select tanker vendor'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={SEC.textMuted} />
          </TouchableOpacity>
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
        </View>

        {/* Step 2 — manual readings 2×2 */}
        <View style={localStyles.readingsHeaderRow}>
          <SectionHeader
            step={2}
            title={`Readings (${readingsFilledCount}/4)`}
            complete={allFieldsFilled}
          />
          <TouchableOpacity
            onPress={() =>
              setForm((p) => ({
                ...p,
                vehicleNo: '',
                openingMeter: '',
                closingMeter: '',
                tds: '',
                load: '',
                userValidated: false,
              }))
            }
            hitSlop={6}
            style={localStyles.clearReadingsBtnInline}
          >
            <Ionicons name="refresh-outline" size={11} color="#F87171" />
            <Text style={localStyles.clearReadings}>Clear</Text>
          </TouchableOpacity>
        </View>
        {READING_ROWS.map((row, rowIdx) => (
          <View key={`row-${rowIdx}`} style={localStyles.readingsRow}>
            {row.map((field) => (
              <CompactField
                key={field.key}
                field={field}
                filled={fieldStatus[field.statusKey]}
                value={form[field.key]}
                onChangeText={(v) =>
                  setForm((p) => ({
                    ...p,
                    [field.key]: field.upper ? v.toUpperCase() : v,
                    userValidated: false,
                  }))
                }
              />
            ))}
          </View>
        ))}

        {/* Step 3 — photos (compact) */}
        <SectionHeader
          step={3}
          title={`Photos optional (${typesCapturedCount}/4)`}
          complete={allPhotosCaptured}
        />
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
            name={!vendorPicked ? 'business' : allPhotosCaptured ? 'checkmark-circle' : 'camera'}
            size={18}
            color={allPhotosCaptured ? SEC.textDim : !vendorPicked ? '#F59E0B' : '#0F172A'}
          />
          <Text
            style={[
              localStyles.captureBtnText,
              !vendorPicked && localStyles.captureBtnTextPrompt,
              allPhotosCaptured && localStyles.captureBtnTextDisabled,
            ]}
            numberOfLines={1}
          >
            {!vendorPicked
              ? 'Select vendor first'
              : allPhotosCaptured
                ? 'All 4 photos ✓'
                : nextMissingType
                  ? `Photo: ${nextMissingType.label}`
                  : 'Take photo'}
          </Text>
        </TouchableOpacity>

        {(form.photos?.length ?? 0) > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={localStyles.photoStrip}
            contentContainerStyle={localStyles.photoStripContent}
          >
            {form.photos.map((photo) => {
              const isScanning = photo.scanStatus === 'scanning';
              const isDone = photo.scanStatus === 'done';
              const isFailed = photo.scanStatus === 'failed';
              const slotType = photo.detectedType || photo.expectedCaptureType;
              const typeLabel = slotType
                ? WATER_PHOTO_TYPE_LABELS[slotType] || 'Captured'
                : null;
              const typeIcon = slotType
                ? WATER_PHOTO_TYPE_ICONS[slotType] || 'document-text-outline'
                : 'help-circle-outline';
              const lowConf = photo.lowConfidence === true;
              const manualOnly = isDone && photo.scanAutoRead === false;

              return (
                <View key={photo.id} style={localStyles.photoCard}>
                  <View style={localStyles.thumbWrap}>
                    <Image source={{ uri: resolvePhotoUri(photo) }} style={localStyles.thumb} />
                    {isScanning ? (
                      <View style={localStyles.scanOverlay}>
                        {Platform.OS === 'web' ? (
                          <View style={localStyles.scanGlass}>
                            <ActivityIndicator size="small" color={SEC.teal} />
                          </View>
                        ) : (
                          <BlurView intensity={45} tint="dark" style={localStyles.scanGlass}>
                            <ActivityIndicator size="small" color={SEC.teal} />
                          </BlurView>
                        )}
                      </View>
                    ) : null}
                    {isDone && typeLabel ? (
                      <View
                        style={[
                          localStyles.typeBadge,
                          lowConf && localStyles.typeBadgeWarn,
                          manualOnly && localStyles.typeBadgeManual,
                        ]}
                      >
                        <Ionicons
                          name={lowConf ? 'alert-circle' : typeIcon}
                          size={9}
                          color={lowConf ? '#FEF3C7' : manualOnly ? '#BFDBFE' : '#A7F3D0'}
                        />
                        <Text style={localStyles.typeBadgeText} numberOfLines={1}>
                          {manualOnly ? `${typeLabel} · manual` : typeLabel}
                        </Text>
                      </View>
                    ) : null}
                    {isFailed && !slotType ? (
                      <View style={[localStyles.typeBadge, localStyles.typeBadgeError]}>
                        <Text style={localStyles.typeBadgeText}>Failed</Text>
                      </View>
                    ) : null}
                    {isFailed && slotType ? (
                      <View style={[localStyles.typeBadge, localStyles.typeBadgeManual]}>
                        <Ionicons name={typeIcon} size={9} color="#BFDBFE" />
                        <Text style={localStyles.typeBadgeText} numberOfLines={1}>
                          {typeLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {photo.detectedValue ? (
                    <Text style={localStyles.detectedValue} numberOfLines={1}>
                      {photo.detectedValue}
                    </Text>
                  ) : null}
                  <View style={localStyles.photoActionRow}>
                    {onRescanPhoto && (isDone || isFailed) ? (
                      <TouchableOpacity
                        style={localStyles.actionBtn}
                        onPress={() => onRescanPhoto(photo.id)}
                        hitSlop={8}
                      >
                        <Ionicons name="refresh-outline" size={12} color={SEC.teal} />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={localStyles.actionBtn}
                      onPress={() => onRemovePhoto?.(photo.id)}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={12} color="#F87171" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Step 4 — confirm */}
        <SectionHeader
          step={4}
          title="Confirm & submit"
          complete={form.userValidated && allFieldsFilled}
        />
        <View style={localStyles.statusGrid}>
          <View style={[localStyles.statusPill, allFieldsFilled && localStyles.statusPillDone]}>
            <Ionicons
              name={allFieldsFilled ? 'checkmark-circle' : 'ellipse-outline'}
              size={13}
              color={allFieldsFilled ? '#4ADE80' : SEC.textDim}
            />
            <Text style={localStyles.statusPillText}>Readings {readingsFilledCount}/4</Text>
          </View>
          <View style={[localStyles.statusPill, allPhotosCaptured && localStyles.statusPillDone]}>
            <Ionicons
              name={allPhotosCaptured ? 'checkmark-circle' : 'ellipse-outline'}
              size={13}
              color={allPhotosCaptured ? '#4ADE80' : SEC.textDim}
            />
            <Text style={localStyles.statusPillText}>Photos {typesCapturedCount}/4</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[localStyles.validateRow, form.userValidated && localStyles.validateRowActive]}
          onPress={() => {
            if (!allFieldsFilled) return;
            setForm((p) => ({ ...p, userValidated: !p.userValidated }));
          }}
          activeOpacity={0.85}
          disabled={!allFieldsFilled}
        >
          <Ionicons
            name={form.userValidated ? 'checkbox' : 'square-outline'}
            size={20}
            color={form.userValidated ? SEC.teal : SEC.textDim}
          />
          <Text style={localStyles.validateText}>
            I confirm vendor, date, readings{typesCapturedCount > 0 ? ', photos' : ''}, and time
          </Text>
        </TouchableOpacity>
      </LedgerFormModal>

      <Modal visible={vendorPickerOpen} transparent animationType="fade" onRequestClose={() => setVendorPickerOpen(false)}>
        <Pressable style={localStyles.pickerOverlay} onPress={() => setVendorPickerOpen(false)}>
          <Pressable style={localStyles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <View style={localStyles.pickerHeader}>
              <Text style={localStyles.pickerTitle}>Select tanker vendor</Text>
              <TouchableOpacity
                onPress={() => setVendorPickerOpen(false)}
                style={localStyles.pickerCloseBtn}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close vendor list"
              >
                <Ionicons name="close" size={22} color={SEC.textMuted} />
              </TouchableOpacity>
            </View>
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
                  <Text style={localStyles.pickerItemSub}>{formatVendorPlates(v)}</Text>
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
      theme={WATER}
      footer={
        <View style={localStyles.formFooter}>
          <TouchableOpacity
            style={localStyles.cancelBtn}
            onPress={onClose}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Close form"
          >
            <Ionicons name="close" size={18} color={WATER.textMuted} />
            <Text style={localStyles.cancelBtnText}>Close</Text>
          </TouchableOpacity>
          <View style={localStyles.formFooterSubmit}>
            <ModuleSaveButton theme={WATER} label="Save vendor" onPress={onSave} />
          </View>
        </View>
      }
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
        placeholder="Capacity in KL (e.g. 12.5 for 12500 L)"
        placeholderTextColor={W_PLACEHOLDER}
        keyboardType="decimal-pad"
        value={form.tankerCapacityKl}
        onChangeText={(v) => setForm((p) => ({ ...p, tankerCapacityKl: v }))}
      />
    </LedgerFormModal>
  );
}

const localStyles = StyleSheet.create({
  sectionHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionHeaderFirst: {
    marginTop: 0,
  },
  sectionStepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    fontSize: 10,
    fontWeight: '800',
    color: SEC.teal,
  },
  sectionHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: SEC.text,
    letterSpacing: 0.2,
  },
  basicsCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.surfaceRaised,
    padding: 10,
    marginBottom: 4,
    gap: 8,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: SEC.bg,
    borderWidth: 1,
    borderColor: SEC.border,
  },
  vendorRowEmpty: {
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  vendorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: SEC.text,
  },
  vendorPlaceholder: {
    color: SEC.textDim,
    fontWeight: '600',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1.2,
    marginBottom: 0,
    paddingVertical: 10,
    fontSize: 13,
  },
  timeInput: {
    flex: 1,
    marginBottom: 0,
    paddingVertical: 10,
    fontSize: 13,
  },
  readingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readingsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  gridLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  gridLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: SEC.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  gridInput: {
    marginBottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  clearReadingsBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
  },
  clearReadings: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F87171',
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: SEC.surfaceRaised,
    borderWidth: 1,
    borderColor: SEC.border,
    marginBottom: 8,
  },
  captureBtnPrompt: {
    borderColor: 'rgba(245, 158, 11, 0.55)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  captureBtnActive: {
    backgroundColor: SEC.teal,
    borderColor: SEC.teal,
  },
  captureBtnDisabled: {
    opacity: 0.55,
  },
  captureBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  captureBtnTextPrompt: {
    color: '#F59E0B',
  },
  captureBtnTextDisabled: {
    color: SEC.textDim,
  },
  photoStrip: {
    flexGrow: 0,
    marginBottom: 8,
  },
  photoStripContent: {
    gap: 8,
    paddingRight: 4,
  },
  photoCard: {
    width: 88,
    backgroundColor: SEC.surfaceRaised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SEC.border,
    padding: 6,
  },
  thumbWrap: {
    width: '100%',
    height: 72,
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
  },
  typeBadge: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    right: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  typeBadgeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  typeBadgeWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  typeBadgeManual: {
    backgroundColor: 'rgba(59, 130, 246, 0.88)',
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#ECFDF5',
    flex: 1,
  },
  detectedValue: {
    fontSize: 10,
    fontWeight: '800',
    color: SEC.teal,
    marginTop: 4,
  },
  photoActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    padding: 2,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.surfaceRaised,
  },
  statusPillDone: {
    borderColor: 'rgba(74, 222, 128, 0.5)',
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: SEC.text,
  },
  validateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.bg,
    marginBottom: 4,
  },
  validateRowActive: {
    borderColor: 'rgba(62, 232, 197, 0.45)',
    backgroundColor: 'rgba(62, 232, 197, 0.08)',
  },
  validateText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: SEC.text,
    lineHeight: 16,
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
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SEC.bg,
    borderWidth: 1,
    borderColor: SEC.border,
  },
  pickerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: SEC.text,
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
  formFooter: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SEC.border,
    backgroundColor: SEC.surfaceRaised,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: SEC.textMuted,
  },
  formFooterSubmit: {
    flex: 1,
    minWidth: 0,
  },
});
