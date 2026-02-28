import type { ReactNode } from 'react'

type PhoneMockupProps = {
  children: ReactNode
  label?: string
}

export default function PhoneMockup({ children, label }: PhoneMockupProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      {label ? (
        <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
          {label}
        </span>
      ) : null}
      <div
        style={{
          position: 'relative',
          borderRadius: '42px',
          overflow: 'hidden',
          width: '220px',
          height: '460px',
          background: 'linear-gradient(145deg,#1a1a2e,#0a0a1a)',
          boxShadow: '0 0 0 2px rgba(255,255,255,0.12),0 24px 60px rgba(0,0,0,0.8),0 0 80px rgba(100,80,255,0.15)',
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
            width: '60px',
            height: '6px',
            borderRadius: '3px',
            background: 'rgba(255,255,255,0.15)',
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
