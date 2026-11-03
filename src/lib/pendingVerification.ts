// A customer who has just created an account must confirm the 6-digit code
// sent to their email before using the marketplace. The pending address is
// kept in localStorage so the check survives a reload or a new tab.
const PENDING_VERIFICATION_KEY = 'nkayPendingVerificationEmail';

export function getPendingVerificationEmail(): string {
  try {
    return localStorage.getItem(PENDING_VERIFICATION_KEY) || '';
  } catch {
    return '';
  }
}

export function setPendingVerificationEmail(email: string) {
  try {
    localStorage.setItem(PENDING_VERIFICATION_KEY, email);
  } catch {
    /* ignore storage errors */
  }
}

export function clearPendingVerificationEmail() {
  try {
    localStorage.removeItem(PENDING_VERIFICATION_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export function emailsMatch(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}
