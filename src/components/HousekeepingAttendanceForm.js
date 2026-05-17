import React from 'react';
import { Text } from 'react-native';
import LedgerFormModal, { ModuleSaveButton } from './LedgerFormModal';
import AttendanceRoleRow from './AttendanceRoleRow';
import ModulePhotoSection from './ModulePhotoSection';
import { HK } from '../constants/moduleThemes';
import { buildModuleFormStyles } from '../styles/moduleFormStyles';

const hkForm = buildModuleFormStyles(HK);
const HK_PLACEHOLDER = HK.textDim;

export default function HousekeepingAttendanceForm({
  visible,
  onClose,
  roles,
  attendanceData,
  onChangeAttendance,
  photo,
  onPickCamera,
  onPickGallery,
  onClearPhoto,
  onSave,
  saving,
}) {
  return (
    <LedgerFormModal
      visible={visible}
      onClose={onClose}
      title="Housekeeping attendance"
      theme={HK}
      maxHeight="88%"
      footer={
        <ModuleSaveButton
          theme={HK}
          label="Save attendance"
          onPress={onSave}
          loading={saving}
          disabled={saving}
        />
      }
    >
      <Text style={hkForm.hint}>
        Enter deployed headcount per role for S1 and S2. Add one verification photo below if required.
      </Text>
      {roles.length === 0 ? (
        <Text style={hkForm.hint}>No FM and HK roles configured in manpower deployment.</Text>
      ) : null}
      {roles.map((row) => (
        <AttendanceRoleRow
          key={row.id}
          theme={HK}
          roleLabel={row.role}
          placeholderColor={HK_PLACEHOLDER}
          shifts={[
            {
              key: 's1',
              label: `S1 (${row.expected})`,
              value: attendanceData[`${row.role}||Shift1`] || '',
              onChangeText: (v) => onChangeAttendance(row.role, 'Shift1', v),
            },
            {
              key: 's2',
              label: `S2 (${row.expected})`,
              value: attendanceData[`${row.role}||Shift2`] || '',
              onChangeText: (v) => onChangeAttendance(row.role, 'Shift2', v),
            },
          ]}
        />
      ))}
      <ModulePhotoSection
        theme={HK}
        photo={photo}
        onCamera={onPickCamera}
        onGallery={onPickGallery}
        onRemovePhoto={onClearPhoto}
      />
    </LedgerFormModal>
  );
}
