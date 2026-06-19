export const SUPER_ADMIN_EMAIL = 'admin@out.com';
export const ADMIN_ROLE = 'platform_admin';

export function isSuperAdminEmail(email?: string | null) {
  return email?.toLowerCase() === SUPER_ADMIN_EMAIL;
}

export function isAdminRole(role?: string | null) {
  return role === ADMIN_ROLE;
}
