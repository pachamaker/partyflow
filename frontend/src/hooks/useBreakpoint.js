import { useEffect, useState } from 'react'

const MOBILE_MAX = 767
const TABLET_MAX = 1023

function getWidth() {
  if (typeof window === 'undefined') {
    return 0
  }

  return window.innerWidth
}

function getFlags(width) {
  const isMobile = width <= MOBILE_MAX
  const isTablet = width >= 768 && width <= TABLET_MAX
  const isDesktop = width >= 1024

  return { isMobile, isTablet, isDesktop }
}

export default function useBreakpoint() {
  const [state, setState] = useState(() => getFlags(getWidth()))

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)')
    const desktopQuery = window.matchMedia('(min-width: 1024px)')

    const update = () => {
      setState({
        isMobile: mobileQuery.matches,
        isTablet: tabletQuery.matches,
        isDesktop: desktopQuery.matches,
      })
    }

    update()

    window.addEventListener('resize', update)
    mobileQuery.addEventListener('change', update)
    tabletQuery.addEventListener('change', update)
    desktopQuery.addEventListener('change', update)

    return () => {
      window.removeEventListener('resize', update)
      mobileQuery.removeEventListener('change', update)
      tabletQuery.removeEventListener('change', update)
      desktopQuery.removeEventListener('change', update)
    }
  }, [])

  return state
}
