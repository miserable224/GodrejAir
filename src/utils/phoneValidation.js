/** Optional Indian mobile: 10 digits, optional +91 / leading 0. */
export function isValidIndianMobile(phone) {
  const digits = extractIndianMobileDigits(phone);
  if (digits === null) return true;
  return digits.length === 10 && /^[6-9]/.test(digits);
}

export function extractIndianMobileDigits(phone) {
  if (phone == null || String(phone).trim() === '') return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return digits;
}

/** Returns 10-digit string or null when empty / invalid. */
export function normalizeIndianMobile(phone) {
  const digits = extractIndianMobileDigits(phone);
  if (digits === null) return null;
  return digits.length === 10 ? digits : null;
}
