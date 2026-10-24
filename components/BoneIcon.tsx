export function BoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 12" fill="currentColor" aria-hidden="true">
      <circle cx="3" cy="3" r="3" />
      <circle cx="3" cy="9" r="3" />
      <circle cx="21" cy="3" r="3" />
      <circle cx="21" cy="9" r="3" />
      <rect x="3" y="3" width="18" height="6" />
    </svg>
  );
}
