import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LedgerFormModal, { ModuleSaveButton } from './LedgerFormModal';
import { SEC } from '../constants/moduleThemes';
import { buildModuleFormStyles } from '../styles/moduleFormStyles';

const rf = buildModuleFormStyles(SEC);
const PLACEHOLDER = SEC.textDim;

export function RentalsShopForm({
  visible,
  onClose,
  form,
  onChange,
  onPickAgreement,
  onSave,
}) {
  return (
    <LedgerFormModal
      visible={visible}
      onClose={onClose}
      title="Add shop"
      theme={SEC}
      maxHeight="88%"
      footer={<ModuleSaveButton theme={SEC} label="Save shop" onPress={onSave} />}
    >
      <Text style={rf.hint}>Register a commercial unit with tenant and agreement details.</Text>
      <TextInput
        style={rf.input}
        placeholder="Unit (e.g. Shop D-01)"
        placeholderTextColor={PLACEHOLDER}
        value={form.unit}
        onChangeText={(v) => onChange('unit', v)}
      />
      <TextInput
        style={rf.input}
        placeholder="Tenant name"
        placeholderTextColor={PLACEHOLDER}
        value={form.tenant}
        onChangeText={(v) => onChange('tenant', v)}
      />
      <TextInput
        style={rf.input}
        placeholder="Vendor name"
        placeholderTextColor={PLACEHOLDER}
        value={form.vendorName}
        onChangeText={(v) => onChange('vendorName', v)}
      />
      <TextInput
        style={rf.input}
        placeholder="Contact number"
        placeholderTextColor={PLACEHOLDER}
        keyboardType="phone-pad"
        value={form.contactNumber}
        onChangeText={(v) => onChange('contactNumber', v)}
      />
      <TextInput
        style={[rf.input, rf.inputMultiline]}
        placeholder="Address"
        placeholderTextColor={PLACEHOLDER}
        multiline
        value={form.address}
        onChangeText={(v) => onChange('address', v)}
      />
      <TextInput
        style={rf.input}
        placeholder="Agreement ID"
        placeholderTextColor={PLACEHOLDER}
        value={form.agreementId}
        onChangeText={(v) => onChange('agreementId', v)}
      />
      <TextInput
        style={rf.input}
        placeholder="Start date (e.g. 01 Jun 2026)"
        placeholderTextColor={PLACEHOLDER}
        value={form.startDate}
        onChangeText={(v) => onChange('startDate', v)}
      />
      <TextInput
        style={rf.input}
        placeholder="End date (e.g. 31 May 2029)"
        placeholderTextColor={PLACEHOLDER}
        value={form.endDate}
        onChangeText={(v) => onChange('endDate', v)}
      />
      <TextInput
        style={rf.input}
        placeholder="Monthly rent"
        placeholderTextColor={PLACEHOLDER}
        keyboardType="numeric"
        value={form.rent}
        onChangeText={(v) => onChange('rent', v)}
      />
      <TouchableOpacity style={rf.uploadBtn} activeOpacity={0.85} onPress={onPickAgreement}>
        <Ionicons name="cloud-upload-outline" size={18} color={SEC.teal} />
        <Text style={rf.uploadBtnText}>
          {form.agreementFile ? 'Change agreement file' : 'Upload agreement'}
        </Text>
      </TouchableOpacity>
      {form.agreementFile ? (
        <Text style={rf.fileMeta}>Selected: {form.agreementFile}</Text>
      ) : null}
    </LedgerFormModal>
  );
}

export function RentalsTrainerForm({ visible, onClose, form, setForm, onSave }) {
  return (
    <LedgerFormModal
      visible={visible}
      onClose={onClose}
      title="Add trainer"
      theme={SEC}
      footer={<ModuleSaveButton theme={SEC} label="Save trainer" onPress={onSave} />}
    >
      <Text style={rf.hint}>Create a trainer service fee profile for billing.</Text>
      <TextInput
        style={rf.input}
        placeholder="Trainer name"
        placeholderTextColor={PLACEHOLDER}
        value={form.trainerName}
        onChangeText={(v) => setForm((p) => ({ ...p, trainerName: v }))}
      />
      <TextInput
        style={rf.input}
        placeholder="Service type"
        placeholderTextColor={PLACEHOLDER}
        value={form.serviceType}
        onChangeText={(v) => setForm((p) => ({ ...p, serviceType: v }))}
      />
      <TextInput
        style={rf.input}
        placeholder="Contact number"
        placeholderTextColor={PLACEHOLDER}
        keyboardType="phone-pad"
        value={form.contactNumber}
        onChangeText={(v) => setForm((p) => ({ ...p, contactNumber: v }))}
      />
      <TextInput
        style={rf.input}
        placeholder="Service fee"
        placeholderTextColor={PLACEHOLDER}
        keyboardType="numeric"
        value={form.fee}
        onChangeText={(v) => setForm((p) => ({ ...p, fee: v }))}
      />
    </LedgerFormModal>
  );
}

export function RentalsPaymentForm({
  visible,
  onClose,
  form,
  setForm,
  onPickBill,
  onSave,
}) {
  return (
    <LedgerFormModal
      visible={visible}
      onClose={onClose}
      title="Record payment"
      theme={SEC}
      footer={<ModuleSaveButton theme={SEC} label="Save payment" onPress={onSave} />}
    >
      <Text style={rf.hint}>Capture payer, amount, and attach a bill or receipt.</Text>
      <TextInput
        style={rf.input}
        placeholder="Payer / Unit"
        placeholderTextColor={PLACEHOLDER}
        value={form.payer}
        onChangeText={(v) => setForm((p) => ({ ...p, payer: v }))}
      />
      <TextInput
        style={rf.input}
        placeholder="Category"
        placeholderTextColor={PLACEHOLDER}
        value={form.category}
        onChangeText={(v) => setForm((p) => ({ ...p, category: v }))}
      />
      <TextInput
        style={rf.input}
        placeholder="Amount"
        placeholderTextColor={PLACEHOLDER}
        keyboardType="numeric"
        value={form.amount}
        onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))}
      />
      <TextInput
        style={rf.input}
        placeholder="Reference / Txn ID"
        placeholderTextColor={PLACEHOLDER}
        value={form.reference}
        onChangeText={(v) => setForm((p) => ({ ...p, reference: v }))}
      />
      <TouchableOpacity style={rf.uploadBtn} activeOpacity={0.85} onPress={onPickBill}>
        <Ionicons name="receipt-outline" size={18} color={SEC.teal} />
        <Text style={rf.uploadBtnText}>
          {form.billFile ? 'Change bill file' : 'Upload bill'}
        </Text>
      </TouchableOpacity>
      {form.billFile ? <Text style={rf.fileMeta}>Selected: {form.billFile}</Text> : null}
    </LedgerFormModal>
  );
}
