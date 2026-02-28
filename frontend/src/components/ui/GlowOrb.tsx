import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'

type GlowOrbProps = {
  color: string
  style?: CSSProperties
}

export default function GlowOrb({ color, style }: GlowOrbProps) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 4, repeat: Infinity }}
      style={{
        position: 'absolute',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}22 0%, transparent 65%)`,
        filter: 'blur(60px)',
        pointerEvents: 'none',
        ...style,
      }}
    />
  )
}
