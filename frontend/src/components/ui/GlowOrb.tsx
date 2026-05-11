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
        // Decorative atmospheric element matching design's ambient radial gradients.
        // `color` is caller-supplied (token-agnostic by design); `22` is a ~13% alpha hex suffix.
        background: `radial-gradient(circle, ${color}22 0%, transparent 65%)`,
        filter: 'blur(60px)',
        pointerEvents: 'none',
        ...style,
      }}
    />
  )
}
