// Replace these 3 emails with the real admin Google accounts.
// Anyone signing in with one of these emails gets full admin access.
export const ADMIN_EMAILS = [
  'danis3@gmail.com',
  'gigo2@gmail.com',
  'mirza1@gmail.com',
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
