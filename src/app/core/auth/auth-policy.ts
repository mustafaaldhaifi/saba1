/** Compatibility policy only. Firestore rules must independently enforce access.
 * Replace this legacy UID with server-managed claims in a separate migration.
 */
export const LEGACY_ADMIN_UID = 'z8B2PHGNnaRIRCqEsvesvE5IeAL2';
export const ACCOUNT_EMAIL_DOMAIN = 'saba321.com';

export function isAdminUser(user: { uid: string } | null): boolean {
  return user?.uid === LEGACY_ADMIN_UID;
}

export function homeRouteFor(user: { uid: string }): '/dashboard' | '/branch' {
  return isAdminUser(user) ? '/dashboard' : '/branch';
}
