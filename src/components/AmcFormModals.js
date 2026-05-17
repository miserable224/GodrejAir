import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LedgerFormModal, { ModuleSaveButton } from './LedgerFormModal';
import { SEC } from '../constants/moduleThemes';
import { buildModuleFormStyles } from '../styles/moduleFormStyles';

const af = buildModuleFormStyles(SEC);
const PLACEHOLDER = SEC.textDim;

export function AmcContractForm({
  visible,
  onClose,
  form,
  setForm,
  onPickDocument,
  onSave,
}) {
  return (
    <LedgerFormModal
      visible={visible}
      onClose={onClose}
      title="Add AMC contract"
      theme={SEC}
      maxHeight="88%"
      footer={<ModuleSaveButton theme={SEC} label="Save contract" onPress={onSave} />}
    >
      <Text style={af.hint}>Register vendor AMC with renewal dates and annual value.</Text>
      <TextInput
        style={af.input}
        placeholder="Asset / service (e.g. Lift AMC)"
        placeholderTextColor={PLACEHOLDER}
        value={form.label}
        onChangeText={(v) => setForm((p) => ({ ...p, label: v }))}
      />
      <TextInput
        style={af.input}
        placeholder="Vendor name"
        placeholderTextColor={PLACEHOLDER}
        value={form.vendor}
        onChangeText={(v) => setForm((p) => ({ ...p, vendor: v }))}
      />
      <TextInput
        style={af.input}
        placeholder="Category (Mechanical / Electrical / Fire)"
        placeholderTextColor={PLACEHOLDER}
        value={form.category}
        onChangeText={(v) => setForm((p) => ({ ...p, category: v }))}
      />
      <TextInput
        style={af.input}
        placeholder="Renewal due in (e.g. 12 days)"
        placeholderTextColor={PLACEHOLDER}
        value={form.dueIn}
        onChangeText={(v) => setForm((p) => ({ ...p, dueIn: v }))}
      />
      <TextInput
        style={af.input}
        placeholder="Annual contract value"
        placeholderTextColor={PLACEHOLDER}
        keyboardType="numeric"
        value={form.annualValue}
        onChangeText={(v) => setForm((p) => ({ ...p, annualValue: v }))}
      />
      <TouchableOpacity style={af.uploadBtn} activeOpacity={0.85} onPress={onPickDocument}>
        <Ionicons name="document-attach-outline" size={18} color={SEC.teal} />
        <Text style={af.uploadBtnText}>
          {form.documentFile ? 'Change contract file' : 'Attach contract PDF'}
        </Text>
      </TouchableOpacity>
      {form.documentFile ? <Text style={af.fileMeta}>Selected: {form.documentFile}</Text> : null}
    </LedgerFormModal>
  );
}

export function AmcComplianceForm({
  visible,
  onClose,
  form,
  setForm,
  onPickCertificate,
  onSave,
}) {
  return (
    <LedgerFormModal
      visible={visible}
      onClose={onClose}
      title="Log compliance"
      theme={SEC}
      maxHeight="88%"
      footer={<ModuleSaveButton theme={SEC} label="Save entry" onPress={onSave} />}
    >
      <Text style={af.hint}>Record a statutory check, inspection, or compliance certificate.</Text>
      <TextInput
        style={af.input}
        placeholder="Item (e.g. Fire NOC, Lift inspection)"
        placeholderTextColor={PLACEHOLDER}
        value={form.label}
        onChangeText={(v) => setForm((p) => ({ ...p, label: v }))}
      />
      <TextInput
        style={af.input}
        placeholder="Authority / agency"
        placeholderTextColor={PLACEHOLDER}
        value={form.authority}
        onChangeText={(v) => setForm((p) => ({ ...p, authority: v }))}
      />
      <TextInput
        style={af.input}
        placeholder="Due / valid until (e.g. 45 days)"
        placeholderTextColor={PLACEHOLDER}
        value={form.dueIn}
        onChangeText={(v) => setForm((p) => ({ ...p, dueIn: v }))}
      />
      <TextInput
        style={[af.input, af.inputMultiline]}
        placeholder="Notes"
        placeholderTextColor={PLACEHOLDER}
        multiline
        value={form.notes}
        onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
      />
      <TouchableOpacity style={af.uploadBtn} activeOpacity={0.85} onPress={onPickCertificate}>
        <Ionicons name="cloud-upload-outline" size={18} color={SEC.teal} />
        <Text style={af.uploadBtnText}>
          {form.certificateFile ? 'Change certificate' : 'Upload certificate'}
        </Text>
      </TouchableOpacity>
      {form.certificateFile ? (
        <Text style={af.fileMeta}>Selected: {form.certificateFile}</Text>
      ) : null}
    </LedgerFormModal>
  );
}

export function AmcCertificateForm({
  visible,
  onClose,
  form,
  setForm,
  onPickCertificate,
  onSave,
}) {
  return (
    <LedgerFormModal
      visible={visible}
      onClose={onClose}
      title="Upload certificate"
      theme={SEC}
      footer={<ModuleSaveButton theme={SEC} label="Save certificate" onPress={onSave} />}
    >
      <Text style={af.hint}>Attach a compliance or AMC certificate for records.</Text>
      <TextInput
        style={af.input}
        placeholder="Linked asset / compliance item"
        placeholderTextColor={PLACEHOLDER}
        value={form.label}
        onChangeText={(v) => setForm((p) => ({ ...p, label: v }))}
      />
      <TouchableOpacity style={af.uploadBtn} activeOpacity={0.85} onPress={onPickCertificate}>
        <Ionicons name="cloud-upload-outline" size={18} color={SEC.teal} />
        <Text style={af.uploadBtnText}>
          {form.certificateFile ? 'Change file' : 'Choose certificate file'}
        </Text>
      </TouchableOpacity>
      {form.certificateFile ? (
        <Text style={af.fileMeta}>Selected: {form.certificateFile}</Text>
      ) : null}
    </LedgerFormModal>
  );
}
