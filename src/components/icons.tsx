const ICON_PROPS = {
  viewBox: '0 0 24 24',
  width: 18,
  height: 18,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function BackIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export function ChevronIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export function GearIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.06Z" />
    </svg>
  )
}

export function TrophyIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4M17 5h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
    </svg>
  )
}

export function ChartIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  )
}

export function LeaderboardIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export function LockedIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

// Replaces the 🔥 streak glyph — a simple flame outline, same stroke
// language as the rest of the icon set rather than an emoji glyph.
export function FlameIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-.5-2-.5-2 1.5 1 2.5 3 2.5 5a5 5 0 0 1-10 0c0-4.5 3.5-6 5-11Z" />
    </svg>
  )
}
