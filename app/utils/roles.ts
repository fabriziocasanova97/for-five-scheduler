// --- 1. THE LIST OF BOSS EMAILS ---
// Make sure to put your real email inside the quotes!
export const BOSS_EMAILS = [
  'dusan@forfivecoffee.com',
  'will@forfivecoffee.com',
  'escummings901@gmail.com'
];

// --- 2. THE CHECK FUNCTION ---
export function isBoss(email: string | undefined | null): boolean {
  if (!email) return false;
  return BOSS_EMAILS.includes(email);
}