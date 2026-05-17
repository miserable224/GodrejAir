import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LedgerFormModal, { ModuleSaveButton } from './LedgerFormModal';
import { SEC } from '../constants/moduleThemes';
import { buildModuleFormStyles } from '../styles/moduleFormStyles';
import { EXPENSE_CATEGORIES } from './ExpensesModulePanel';

const ef = buildModuleFormStyles(SEC);
const PLACEHOLDER = SEC.textDim;

export function ExpenseRecordForm({
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
      title="Record expense"
      theme={SEC}
      maxHeight="88%"
      footer={<ModuleSaveButton theme={SEC} label="Save expense" onPress={onSave} />}
    >
      <Text style={ef.hint}>Add amount, category, vendor, and attach a bill or receipt.</Text>
      <TextInput
        style={ef.input}
        placeholder="Date (DD/MM/YY)"
        placeholderTextColor={PLACEHOLDER}
        value={form.date}
        onChangeText={(v) => setForm((p) => ({ ...p, date: v }))}
      />
      <Text style={ef.sectionLabel}>Category</Text>
      <View style={ef.chipRow}>
        {EXPENSE_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[ef.chip, form.category === cat && ef.chipActive]}
            onPress={() => setForm((p) => ({ ...p, category: cat }))}
            activeOpacity={0.85}
          >
            <Text style={[ef.chipText, form.category === cat && ef.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={ef.input}
        placeholder="Amount"
        placeholderTextColor={PLACEHOLDER}
        keyboardType="numeric"
        value={form.amount}
        onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))}
      />
      <TextInput
        style={ef.input}
        placeholder="Vendor / Payee"
        placeholderTextColor={PLACEHOLDER}
        value={form.vendor}
        onChangeText={(v) => setForm((p) => ({ ...p, vendor: v }))}
      />
      <TextInput
        style={[ef.input, ef.inputMultiline]}
        placeholder="Notes"
        placeholderTextColor={PLACEHOLDER}
        multiline
        value={form.note}
        onChangeText={(v) => setForm((p) => ({ ...p, note: v }))}
      />
      <TouchableOpacity style={ef.uploadBtn} activeOpacity={0.85} onPress={onPickBill}>
        <Ionicons
          name={form.billFile ? 'checkmark-circle' : 'document-attach-outline'}
          size={18}
          color={form.billFile ? SEC.green : SEC.teal}
        />
        <Text style={[ef.uploadBtnText, form.billFile && { color: SEC.green }]}>
          {form.billFile ? form.billFile : 'Attach bill / receipt'}
        </Text>
      </TouchableOpacity>
    </LedgerFormModal>
  );
}
