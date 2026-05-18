/**
 * apiService — thin compatibility shim.
 *
 * New code should import from securityService directly.
 * This file keeps legacy call-sites working during migration.
 */
import {
  API_ORIGIN,
  fetchStaff,
  fetchMonthlyBilling,
  fetchSanctionedStrength,
  fetchSecurityRates,
} from '../../security/services/securityService';
import { loginWithCredentials } from './authService';

export { API_ORIGIN };

export const apiService = {
  login: (username, password) => loginWithCredentials(username, password),
  fetchStaff: (token) => fetchStaff(token),
  fetchMonthlyBilling: (token, month) => fetchMonthlyBilling(token, month),
  fetchSanctionedStrength: (token) => fetchSanctionedStrength(token),
  fetchSecurityRates: (token) => fetchSecurityRates(token),
};
