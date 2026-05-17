import LedgerFormModal, { ModuleSaveButton } from './LedgerFormModal';
import { SEC } from '../constants/moduleThemes';

/** Security module form sheet (green accent). */
export default function SecurityFormModal(props) {
  return <LedgerFormModal {...props} theme={SEC} />;
}

export function SecSaveButton(props) {
  return <ModuleSaveButton {...props} theme={SEC} />;
}
