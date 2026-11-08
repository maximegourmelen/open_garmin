export function RunIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="16" cy="4" r="2" />
      <path d="m7 21 3-5 2-2m-5-7 4-1 3 4 3 1 2 4m-8-5-4 4-4 1m8-5 2 4-2 7" />
    </svg>
  );
}
