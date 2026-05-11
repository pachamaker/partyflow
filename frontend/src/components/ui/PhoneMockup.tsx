import type { ReactNode } from 'react'

type PhoneMockupProps = {
  children: ReactNode
  label?: string
}

export default function PhoneMockup({ children, label }: PhoneMockupProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      {label ? (
        <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--color-text-mute)' }}>
          {label}
        </span>
      ) : null}
      <div
        style={{
          position: 'relative',
          borderRadius: '44px',
          overflow: 'hidden',
          width: '220px',
          height: '460px',
          background: 'linear-gradient(145deg, #0a0a14, #04050F)',
          boxShadow: '0 0 0 1.5px rgba(255,255,255,0.06), var(--shadow-lg), 0 0 80px rgba(124,58,237,0.15)',
          border: '6px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '44px',
            height: '14px',
            borderRadius: '7px',
            background: '#000',
            zIndex: 10,
          }}
        />
        <div style={{ transform: 'scale(0.51)', transformOrigin: 'top left', width: '430px', height: '932px', pointerEvents: 'none' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
