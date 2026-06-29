// Anyone signing in with one of these emails gets admin access.
export const ADMIN_EMAILS = [
  'imer5@gmail.com',
  'emir4@gmail.com',
  'gigo2@gmail.com',
  'mirza1@gmail.com',
];

export const SUPERADMIN_EMAILS = [
  'danis3@gmail.com',
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return [...ADMIN_EMAILS, ...SUPERADMIN_EMAILS].map((e) => e.toLowerCase()).includes(normalized);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPERADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
