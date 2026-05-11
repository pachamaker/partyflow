import type { CSSProperties, ReactNode } from 'react'

type GlassPanelProps = {
  children: ReactNode
  color?: string
  border?: string
  style?: CSSProperties
}

export default function GlassPanel({
  children,
  color = 'rgba(255,255,255,0.06)',
  border = 'rgba(255,255,255,0.1)',
  style,
}: GlassPanelProps) {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg)',
        background: `linear-gradient(145deg, ${color}, rgba(4,5,15,0.8))`,
        border: `1px solid ${border}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: 'var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
