import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LedgerFormModal, { ModuleSaveButton } from './LedgerFormModal';
import { SEC } from '../constants/moduleThemes';
import { buildModuleFormStyles } from '../styles/moduleFormStyles';

const wf = buildModuleFormStyles(SEC);
const W_PLACEHOLDER = SEC.textDim;

export function WaterRecordForm({
  visible,
  onClose,
  form,
  setForm,
  vendors,
  onPickPhotos,
  onSave,
}) {
  return (
    <LedgerFormModal
      visible={visible}
      onClose={onClose}
      title="Record water input"
      theme={SEC}
      maxHeight="90%"
      footer={<ModuleSaveButton theme={SEC} label="Save water entry" onPress={onSave} />}
    >
      <Text style={wf.hint}>Log tanker or Kaveri inflow with meter readings and optional photos.</Text>
      <TextInput
        style={wf.input}
        placeholder="Date (DD/MM/YY)"
        placeholderTextColor={W_PLACEHOLDER}
        value={form.date}
        onChangeText={(v) => setForm((p) => ({ ...p, date: v }))}
      />
      <View style={wf.chipRow}>
        {[
          { key: 'tanker', label: 'Tanker water' },
          { key: 'kaveri', label: 'Kaveri water' },
        ].map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[wf.chip, form.sourceType === s.key && wf.chipActive]}
            onPress={() =>
              setForm((p) => ({
                ...p,
                sourceType: s.key,
                source: s.key === 'kaveri' ? 'Kaveri water' : p.source,
                vehicleNo: s.key === 'kaveri' ? '' : p.vehicleNo,
              }))
            }
            activeOpacity={0.85}
          >
            <Text style={[wf.chipText, form.sourceType === s.key && wf.chipTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {form.sourceType === 'tanker' ? (
        <>
          <Text style={wf.sectionLabel}>Tanker vendor</Text>
          <View style={wf.chipRow}>
            {vendors.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[wf.chip, form.tankerVendorId === v.id && wf.chipActive]}
                onPress={() =>
                  setForm((p) => ({
                    ...p,
                    tankerVendorId: v.id,
                    source: v.name,
                    vehicleNo: v.vehicleNo,
                  }))
                }
                activeOpacity={0.85}
              >
                <Text style={[wf.chipText, form.tankerVendorId === v.id && wf.chipTextActive]}>
                  {v.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={wf.sectionLabel}>Vehicle</Text>
          <View style={wf.chipRow}>
            {vendors
              .filter((v) => (form.tankerVendorId ? v.id === form.tankerVendorId : true))
              .map((v) => (
                <TouchableOpacity
                  key={`${v.id}-${v.vehicleNo}`}
                  style={[wf.chip, form.vehicleNo === v.vehicleNo && wf.chipActive]}
                  onPress={() => setForm((p) => ({ ...p, source: v.name, vehicleNo: v.vehicleNo }))}
                  activeOpacity={0.85}
                >
                  <Text style={[wf.chipText, form.vehicleNo === v.vehicleNo && wf.chipTextActive]}>
                    {v.vehicleNo}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </>
      ) : (
        <Text style={wf.hint}>Kaveri water — tanker details not required.</Text>
      )}
      <TextInput
        style={wf.input}
        placeholder="Opening meter"
        placeholderTextColor={W_PLACEHOLDER}
        keyboardType="numeric"
        value={form.openingMeter}
        onChangeText={(v) => setForm((p) => ({ ...p, openingMeter: v }))}
      />
      <TextInput
        style={wf.input}
        placeholder="Closing meter"
        placeholderTextColor={W_PLACEHOLDER}
        keyboardType="numeric"
        value={form.closingMeter}
        onChangeText={(v) => setForm((p) => ({ ...p, closingMeter: v }))}
      />
      <TextInput
        style={wf.input}
        placeholder="TDS"
        placeholderTextColor={W_PLACEHOLDER}
        keyboardType="numeric"
        value={form.tds}
        onChangeText={(v) => setForm((p) => ({ ...p, tds: v }))}
      />
      <TextInput
        style={wf.input}
        placeholder="Load"
        placeholderTextColor={W_PLACEHOLDER}
        keyboardType="numeric"
        value={form.load}
        onChangeText={(v) => setForm((p) => ({ ...p, load: v }))}
      />
      <TextInput
        style={wf.input}
        placeholder="Tank level after entry (kL)"
        placeholderTextColor={W_PLACEHOLDER}
        keyboardType="numeric"
        value={form.tankLevelKl}
        onChangeText={(v) => setForm((p) => ({ ...p, tankLevelKl: v }))}
      />
      <TouchableOpacity style={wf.uploadBtn} activeOpacity={0.85} onPress={onPickPhotos}>
        <Ionicons name="images-outline" size={18} color={SEC.teal} />
        <Text style={wf.uploadBtnText}>
          {form.photos.length ? 'Add more photos' : 'Upload meter photos'}
        </Text>
      </TouchableOpacity>
      {form.photos.length ? (
        <Text style={wf.fileMeta}>
          {form.photos.length} photo{form.photos.length === 1 ? '' : 's'} selected
        </Text>
      ) : null}
    </LedgerFormModal>
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
