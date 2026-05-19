export function getSettingsBackHref(role?: string | null, hasDriverProfile?: boolean) {
  if (role === 'platform_admin' || role === 'group_admin') return '/admin';
  if (role === 'driver' || hasDriverProfile) return '/dashboard/driver';
  return '/dashboard/member';
}
