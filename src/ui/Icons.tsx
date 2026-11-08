import type { ReactNode } from "react"

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {children}
    </svg>
  )
}

export function IconDown() {
  return <Svg><path d="M12 5v14M12 19l-5-5M12 19l5-5" /></Svg>
}
export function IconUp() {
  return <Svg><path d="M12 19V5M12 5l-5 5M12 5l5 5" /></Svg>
}
export function IconRefresh() {
  return <Svg><path d="M20 12a8 8 0 0 1-14 5M4 12a8 8 0 0 1 14-5" /><path d="M18 5h2v3M6 19H4v-3" /></Svg>
}
export function IconPlus() {
  return <Svg><path d="M12 5v14M5 12h14" /></Svg>
}
export function IconHome() {
  return <Svg><path d="M4 11l8-7 8 7" /><path d="M6 10v9h12v-9" /></Svg>
}
export function IconList() {
  return <Svg><path d="M8 7h12M8 12h12M8 17h12" /><path d="M4 7h.01M4 12h.01M4 17h.01" /></Svg>
}
export function IconHelp() {
  return <Svg><path d="M8 11a4 4 0 1 1 6 3c-1 .8-2 1.2-2 2" /><path d="M12 19h.01" /></Svg>
}
export function IconSettings() {
  return <Svg><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></Svg>
}
export function IconBack() {
  return <Svg><path d="M15 5l-7 7 7 7" /></Svg>
}
export function IconArrow() {
  return <Svg><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
}

export function SolanaMark() {
  return <svg viewBox="0 0 32 28" aria-label="Solana" role="img"><defs><linearGradient id="solana-gradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#14F195" /><stop offset="1" stopColor="#9945FF" /></linearGradient></defs><path fill="url(#solana-gradient)" d="M6.6 2.5h20.1c.8 0 1.2 1 .6 1.6l-4 4a2 2 0 0 1-1.4.6H1.8C1 8.7.6 7.7 1.2 7l4-4a2 2 0 0 1 1.4-.5ZM6.6 11.8h20.1c.8 0 1.2 1 .6 1.6l-4 4a2 2 0 0 1-1.4.6H1.8c-.8 0-1.2-1-.6-1.6l4-4a2 2 0 0 1 1.4-.6ZM6.6 21.1h20.1c.8 0 1.2 1 .6 1.6l-4 4a2 2 0 0 1-1.4.6H1.8c-.8 0-1.2-1-.6-1.6l4-4a2 2 0 0 1 1.4-.6Z" /></svg>
}
