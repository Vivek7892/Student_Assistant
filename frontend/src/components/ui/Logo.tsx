interface LogoProps { size?: number; className?: string }

export function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="32" height="32" rx="10" fill="url(#sb-grad)" />
      {/* Open book */}
      <path d="M16 10 C13 8 9 8.5 7 10 L7 23 C9 21.5 13 21 16 23 C19 21 23 21.5 25 23 L25 10 C23 8.5 19 8 16 10Z"
        fill="white" fillOpacity="0.95" />
      <line x1="16" y1="10" x2="16" y2="23" stroke="url(#sb-grad2)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Sparkle */}
      <circle cx="23" cy="9" r="3.5" fill="white" fillOpacity="0.95" />
      <path d="M23 7.2V10.8M21.2 9H24.8" stroke="url(#sb-grad)" strokeWidth="1.2" strokeLinecap="round" />
      <defs>
        <linearGradient id="sb-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="sb-grad2" x1="16" y1="10" x2="16" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" stopOpacity="0.6" />
          <stop offset="1" stopColor="#4f46e5" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  )
}
