'use client';

type ProfileAvatarProps = {
  name?: string | null;
  photoUrl?: string | null;
  size?: number;
  className?: string;
};

function getInitials(name?: string | null) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function ProfileAvatar({ name, photoUrl, size = 48, className }: ProfileAvatarProps) {
  const initials = getInitials(name);
  const baseClassName = [
    'relative overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={baseClassName}
      style={{ width: size, height: size }}
      aria-label={name || 'Profile avatar'}
    >
      {photoUrl ? (
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(${photoUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm">
          {initials}
        </div>
      )}
    </div>
  );
}
