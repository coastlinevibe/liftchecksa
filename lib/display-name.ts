type DisplayNameInput = {
  firstName?: string | null;
  surname?: string | null;
  email?: string | null;
  fallback?: string;
};

const GENERIC_PLACEHOLDERS = new Set([
  'driver',
  'member',
  'user',
  'passenger',
  'unknown',
  'test',
]);

function titleCase(value: string) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function normalizeNameParts(firstName?: string | null, surname?: string | null) {
  const first = (firstName || '').trim();
  const last = (surname || '').trim();

  if (!first && !last) {
    return '';
  }

  const isGeneric = GENERIC_PLACEHOLDERS.has(first.toLowerCase());
  if (isGeneric && !last) {
    return '';
  }

  return [first, last].filter(Boolean).join(' ').trim();
}

export function getDisplayName({
  firstName,
  surname,
  email,
  fallback = 'User',
}: DisplayNameInput) {
  const fullName = normalizeNameParts(firstName, surname);
  if (fullName) {
    return fullName;
  }

  const emailName = email?.split('@')[0]?.trim() || '';
  if (emailName) {
    return titleCase(emailName);
  }

  return fallback;
}
