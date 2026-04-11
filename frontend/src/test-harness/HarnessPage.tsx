import { Suspense } from 'react'
import { MotionConfig } from 'framer-motion'
import { registry } from './registry'

export default function HarnessPage() {
  const params = new URLSearchParams(window.location.search)
  const name = params.get('component') ?? ''
  const props = JSON.parse(params.get('props') ?? '{}')

  const Component = registry[name]

  if (!Component) {
    return <div style={{ color: '#fff', padding: 20 }}>Unknown component: {name}</div>
  }

  return (
    <MotionConfig transition={{ duration: 0 }}>
      <Suspense fallback={null}>
        <Component {...props} />
      </Suspense>
    </MotionConfig>
  )
}
