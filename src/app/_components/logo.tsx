export function Logo({ className }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* L letter */}
      <path
        d="M25 20 L25 85 L55 85 L55 100 L25 100 L25 20 Z"
        fill="currentColor"
        fillOpacity="0.95"
      />
      
      {/* Checkmark positioned next to L */}
      <path
        d="M70 45 L80 55 L100 35"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

