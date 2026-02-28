export type BreakpointState = {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export default function useBreakpoint(): BreakpointState
