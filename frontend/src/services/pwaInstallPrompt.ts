type PromptOutcome = 'accepted' | 'dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: PromptOutcome; platform: string }>
}

const FIRST_GAME_DONE_KEY = 'poyasni_first_game_done'
const A2HS_DISMISSED_KEY = 'poyasni_a2hs_dismissed'

let deferredPrompt: BeforeInstallPromptEvent | null = null
let initialized = false
const subscribers = new Set<() => void>()

function notifySubscribers(): void {
  subscribers.forEach((listener) => listener())
}

export function initInstallPromptCapture(): void {
  if (initialized || typeof window === 'undefined') {
    return
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notifySubscribers()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    localStorage.setItem(A2HS_DISMISSED_KEY, '1')
    notifySubscribers()
  })

  initialized = true
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  subscribers.add(listener)
  return () => {
    subscribers.delete(listener)
  }
}

export async function triggerInstallPrompt(): Promise<PromptOutcome | null> {
  if (!deferredPrompt) {
    return null
  }

  await deferredPrompt.prompt()
  const choice = await deferredPrompt.userChoice
  deferredPrompt = null
  notifySubscribers()
  return choice.outcome
}

export function markFirstGameCompleted(): void {
  localStorage.setItem(FIRST_GAME_DONE_KEY, '1')
}

export function dismissInstallPrompt(): void {
  localStorage.setItem(A2HS_DISMISSED_KEY, '1')
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function getInstallPromptState() {
  if (typeof window === 'undefined') {
    return {
      shouldShowPrompt: false,
      canTriggerNativePrompt: false,
      shouldShowIosHint: false,
    }
  }

  const completedFirstGame = localStorage.getItem(FIRST_GAME_DONE_KEY) === '1'
  const dismissed = localStorage.getItem(A2HS_DISMISSED_KEY) === '1'
  const standalone = isStandalone()
  const nativePromptReady = Boolean(deferredPrompt)
  const iosHint = isIos() && !nativePromptReady

  return {
    shouldShowPrompt: completedFirstGame && !dismissed && !standalone && (nativePromptReady || iosHint),
    canTriggerNativePrompt: nativePromptReady,
    shouldShowIosHint: iosHint,
  }
}
