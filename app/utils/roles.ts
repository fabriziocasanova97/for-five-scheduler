// --- 1. THE LIST OF BOSS EMAILS ---
// KEEP THESE ALL LOWERCASE!
export const BOSS_EMAILS = [
  'dusan@forfivecoffee.com',
  'will@operations.com',
  'emily@operations.com',
  'dusan@operations.com',
];

// --- 2. THE SMART CHECK FUNCTION ---
export function isBoss(email: string | undefined | null): boolean {
  if (!email) return false;
  
  // STEP 1: Clean the incoming email
  // .trim() removes invisible spaces at the start/end
  // .toLowerCase() turns "Will@..." into "will@..."
  const cleanEmail = email.trim().toLowerCase();
  
  // STEP 2: Check the list
  return BOSS_EMAILS.includes(cleanEmail);
}