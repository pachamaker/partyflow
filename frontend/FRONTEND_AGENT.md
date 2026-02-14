# 🎨 AI Agent Guide: Frontend Development

**Project:** Alias Web (PartyFlow) - Multiplayer Party Game  
**Role:** Frontend Developer Agent (React + WebSocket Client)  
**Tech Stack:** React 18, TypeScript, Vite, TailwindCSS, Socket.io-client, Framer Motion  
**Your Mission:** Build real-time multiplayer game UI with dual-screen support (phone controller + tablet scoreboard)

---

## 📋 Overview

You are an AI coding agent working on the frontend for a viral multiplayer party game. This is a **solo-developed project** where you'll work alongside a Backend AI agent. Your code must be production-ready, performant, and optimized for mobile-first experience with PWA support.

---

## 📚 Essential Context Documents
Before starting ANY task, read these documents in /docs:

ALIAS – Product Requirements Document PRD.pdf — Core product spec
partyflow_websocket_architecture.md — WebSocket protocol & architecture
agent-task-01-websocket-server.md — WebSocket server implementation guide
agent-task-02-state-machine.md — Game state machine implementation guide
agent-task-03-reconnection.md — Reconnection system implementation guide

Key files to reference:

/docs/executive_summary.md — Product vision
/docs/ux-design-documentation.md — UX flows and edge cases
/docs/QA_Test_Strategy.pdf — Testing requirements

---

## 🎯 Your Responsibilities

### Core Tasks:
1. **Home Screen** - Room creation/join with QR code generation
2. **Lobby Screen** - Real-time player list, team display, game start
3. **Swipe Gameplay** - Touch-based word explanation interface for phones
4. **Live Scoreboard** - Timer and score display for tablets (NO words shown)
5. **Dual-Screen Sync** - Auto-detect device mode (controller vs scoreboard)
6. **WebSocket Client** - Real-time bidirectional communication
7. **PWA Support** - Installable on home screen, offline fallback
8. **Animations** - Smooth transitions, haptic feedback, delightful UX

### Key Constraints:
- **Performance:** First Contentful Paint <1.5s, Time to Interactive <3s
- **Mobile-First:** Optimized for phones (controller), tablets (scoreboard)
- **Zero Install:** Works in browser, PWA install optional
- **Offline:** Service Worker with fallback page
- **Accessibility:** ARIA labels, keyboard navigation, high contrast

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Architecture                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │   React UI   │─────▶│ Socket.io    │─────▶│ Backend  │ │
│  │  Components  │      │   Client     │      │ WebSocket│ │
│  └──────────────┘      └──────────────┘      └──────────┘ │
│         │                      │                           │
│         ▼                      ▼                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              State Management (Context + Hooks)      │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  RoomContext  │  GameContext  │  WebSocketContext   │  │
│  │  PlayerContext│  DeviceContext│  AnalyticsContext   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Technology Choices:
- **React 18** - Modern hooks, concurrent features, Suspense
- **TypeScript** - Type safety, better DX, fewer runtime errors
- **Vite** - Lightning-fast HMR, optimized builds
- **TailwindCSS** - Utility-first, mobile-first, design tokens
- **Socket.io-client** - WebSocket client with auto-reconnection
- **Framer Motion** - Smooth animations, gesture support
- **React Router** - Client-side routing
- **Vite PWA Plugin** - Service Worker, offline support, installability
- **QRCode.react** - QR code generation for room joining

---

## 📁 Project Structure

```
frontend/
├── public/
│   ├── icons/
│   │   ├── icon-192x192.png
│   │   ├── icon-512x512.png
│   │   └── favicon.ico
│   ├── sounds/
│   │   ├── swipe-up.mp3
│   │   ├── swipe-down.mp3
│   │   └── timer-tick.mp3
│   └── manifest.json
├── src/
│   ├── App.tsx                    # Root component, routing
│   ├── main.tsx                   # Entry point, providers
│   ├── vite-env.d.ts
│   ├── pages/
│   │   ├── HomePage.tsx           # Room creation/join
│   │   ├── LobbyPage.tsx          # Pre-game lobby
│   │   ├── GamePage.tsx           # Main game screen (dual-mode)
│   │   └── ResultsPage.tsx        # Post-game stats
│   ├── components/
│   │   ├── home/
│   │   │   ├── CreateRoomButton.tsx
│   │   │   ├── JoinRoomModal.tsx
│   │   │   └── QRCodeDisplay.tsx
│   │   ├── lobby/
│   │   │   ├── PlayerList.tsx
│   │   │   ├── TeamDisplay.tsx
│   │   │   └── StartGameButton.tsx
│   │   ├── game/
│   │   │   ├── SwipeCard.tsx      # Controller mode: word card
│   │   │   ├── Scoreboard.tsx     # Scoreboard mode: timer + scores
│   │   │   ├── CircularTimer.tsx
│   │   │   └── TeamScores.tsx
│   │   ├── results/
│   │   │   ├── RoundStats.tsx
│   │   │   ├── MVPDisplay.tsx
│   │   │   └── Confetti.tsx
│   │   └── shared/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ReconnectOverlay.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts        # WebSocket connection management
│   │   ├── useRoom.ts             # Room state management
│   │   ├── useGame.ts             # Game state management
│   │   ├── useSwipe.ts            # Swipe gesture detection
│   │   ├── useDeviceMode.ts       # Auto-detect controller/scoreboard
│   │   ├── useTimer.ts            # Timer state sync
│   │   └── useHaptic.ts           # Vibration feedback
│   ├── context/
│   │   ├── WebSocketContext.tsx   # Socket.io provider
│   │   ├── RoomContext.tsx        # Room state provider
│   │   ├── GameContext.tsx        # Game state provider
│   │   └── DeviceContext.tsx      # Device mode provider
│   ├── services/
│   │   ├── api.service.ts         # REST API calls
│   │   ├── websocket.service.ts   # WebSocket event handlers
│   │   └── analytics.service.ts   # Event tracking
│   ├── utils/
│   │   ├── constants.ts           # Config, colors, timings
│   │   ├── validators.ts          # Input validation
│   │   └── storage.ts             # localStorage helpers
│   ├── types/
│   │   ├── room.types.ts
│   │   ├── player.types.ts
│   │   ├── game.types.ts
│   │   └── events.types.ts
│   └── styles/
│       ├── index.css              # Global styles, Tailwind imports
│       └── animations.css         # Custom CSS animations
├── .env.example
├── .env.local
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── FRONTEND_AGENT.md
```

---

## 🚀 Getting Started

### Initial Setup (Week 1, Day 1)

```bash
# 1. Create Vite project with React + TypeScript
npm create vite@latest frontend -- --template react-ts
cd frontend

# 2. Install dependencies
npm install socket.io-client react-router-dom qrcode.react
npm install framer-motion @headlessui/react
npm install -D tailwindcss postcss autoprefixer
npm install -D vite-plugin-pwa workbox-window

# 3. Setup TailwindCSS
npx tailwindcss init -p

# 4. Install dev dependencies
npm install -D @types/qrcode.react
npm install -D @vitejs/plugin-react
npm install -D vitest @testing-library/react @testing-library/jest-dom

# 5. Create folder structure
mkdir -p src/{pages,components/{home,lobby,game,results,shared},hooks,context,services,utils,types,styles}
mkdir -p public/{icons,sounds}

# 6. Setup environment variables
cat > .env.local << EOF
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_APP_NAME=PartyFlow
EOF

# 7. Add scripts to package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint src --ext ts,tsx"
  }
}
```

### TailwindCSS Configuration

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B00',
          dark: '#E55D00',
          light: '#FF8533',
        },
        secondary: {
          DEFAULT: '#1A1D29',
          light: '#2A2D39',
        },
        accent: {
          DEFAULT: '#C4F82A',
          dark: '#A8D922',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce-in': 'bounceIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png', 'sounds/*.mp3'],
      manifest: {
        name: 'PartyFlow - Alias Game',
        short_name: 'PartyFlow',
        description: 'Multiplayer party game - play directly in browser!',
        theme_color: '#FF6B00',
        background_color: '#1A1D29',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.partyflow\.ru\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'socket': ['socket.io-client'],
          'animations': ['framer-motion'],
        },
      },
    },
  },
});
```

### Verification Checklist:
- [ ] `npm run dev` starts on localhost:5173
- [ ] TailwindCSS styles apply correctly
- [ ] TypeScript compiles without errors
- [ ] Hot reload works
- [ ] Can navigate to different routes

---

## 🔧 Core Implementation Guide

### 1. App Entry Point (`src/main.tsx`)

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { WebSocketProvider } from './context/WebSocketContext';
import { DeviceProvider } from './context/DeviceContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DeviceProvider>
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </DeviceProvider>
  </React.StrictMode>
);
```

### 2. Global Styles (`src/styles/index.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply box-border;
  }
  
  html {
    @apply h-full;
  }
  
  body {
    @apply h-full m-0 font-sans antialiased bg-secondary text-white;
    -webkit-tap-highlight-color: transparent;
    touch-action: pan-x pan-y;
  }
  
  #root {
    @apply h-full;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200;
  }
  
  .btn-secondary {
    @apply bg-secondary-light hover:bg-opacity-80 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200;
  }
  
  .card {
    @apply bg-secondary-light rounded-xl p-6 shadow-lg;
  }
}

@layer utilities {
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
```

---

### 3. WebSocket Hook (`src/hooks/useWebSocket.ts`)

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    // Initialize socket connection
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: maxReconnectAttempts,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
      setIsConnected(true);
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server terminated, need manual reconnect
        socket.connect();
      }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
      setIsReconnecting(true);
      reconnectAttemptsRef.current = attemptNumber;
    });

    socket.on('reconnect_failed', () => {
      console.log('💥 Reconnection failed after max attempts');
      setIsReconnecting(false);
      // Optionally redirect to error page
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Cannot emit, socket not connected');
    }
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    socketRef.current?.off(event, handler);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isReconnecting,
    reconnectAttempts: reconnectAttemptsRef.current,
    emit,
    on,
    off,
  };
}
```

---

### 4. Device Mode Detection (`src/hooks/useDeviceMode.ts`)

```typescript
import { useState, useEffect } from 'react';

export type DeviceMode = 'controller' | 'scoreboard';

const BREAKPOINT = 768; // px
const STORAGE_KEY = 'partyflow_device_mode';

export function useDeviceMode() {
  const [mode, setMode] = useState<DeviceMode>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY) as DeviceMode | null;
    if (stored) return stored;
    
    // Auto-detect based on screen width
    return window.innerWidth < BREAKPOINT ? 'controller' : 'scoreboard';
  });

  useEffect(() => {
    const handleResize = () => {
      // Only auto-switch if user hasn't manually set preference
      const hasManualPreference = localStorage.getItem(STORAGE_KEY);
      if (!hasManualPreference) {
        setMode(window.innerWidth < BREAKPOINT ? 'controller' : 'scoreboard');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setDeviceMode = (newMode: DeviceMode) => {
    setMode(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  const toggleMode = () => {
    const newMode = mode === 'controller' ? 'scoreboard' : 'controller';
    setDeviceMode(newMode);
  };

  return {
    mode,
    isController: mode === 'controller',
    isScoreboard: mode === 'scoreboard',
    setMode: setDeviceMode,
    toggleMode,
  };
}
```

---

### 5. Swipe Detection Hook (`src/hooks/useSwipe.ts`)

```typescript
import { useRef, useCallback } from 'react';

interface SwipeConfig {
  threshold?: number; // Minimum distance for swipe (px)
  deadZone?: number; // Dead zone to prevent accidental swipes (px)
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export function useSwipe({
  threshold = 100,
  deadZone = 50,
  onSwipeUp,
  onSwipeDown,
}: SwipeConfig) {
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null) return;
    currentY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (startY.current === null || currentY.current === null) {
      startY.current = null;
      currentY.current = null;
      return;
    }

    const deltaY = startY.current - currentY.current;
    const absDeltaY = Math.abs(deltaY);

    // Check if swipe is outside dead zone
    if (absDeltaY < deadZone) {
      startY.current = null;
      currentY.current = null;
      return;
    }

    // Check if swipe meets threshold
    if (absDeltaY >= threshold) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      if (deltaY > 0) {
        // Swiped up
        onSwipeUp?.();
      } else {
        // Swiped down
        onSwipeDown?.();
      }
    }

    startY.current = null;
    currentY.current = null;
  }, [threshold, deadZone, onSwipeUp, onSwipeDown]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
```

---

### 6. Home Page (`src/pages/HomePage.tsx`)

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiService } from '../services/api.service';

export function HomePage() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const { roomId } = await apiService.createRoom();
      navigate(`/lobby/${roomId}`);
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Не удалось создать комнату. Попробуйте ещё раз.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-secondary via-secondary-light to-secondary">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-primary mb-2">
            ⚡️
          </h1>
          <h2 className="text-4xl font-bold mb-2">
            Объясни словами
          </h2>
          <p className="text-gray-400 text-lg">
            Вечеринка в твоём телефоне
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-4 w-full max-w-sm mx-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="btn-primary w-full text-xl py-4 disabled:opacity-50"
          >
            {isCreating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Создаём...
              </span>
            ) : (
              '▶ Новая игра'
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowJoinModal(true)}
            className="btn-secondary w-full text-xl py-4"
          >
            🔗 Присоединиться
          </motion.button>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center text-sm text-gray-400">
          <div>
            <div className="text-2xl mb-1">📱</div>
            <div>Без установки</div>
          </div>
          <div>
            <div className="text-2xl mb-1">⚡️</div>
            <div>Мгновенный старт</div>
          </div>
          <div>
            <div className="text-2xl mb-1">👥</div>
            <div>2-10 игроков</div>
          </div>
        </div>
      </motion.div>

      {/* Join Modal */}
      {showJoinModal && (
        <JoinRoomModal onClose={() => setShowJoinModal(false)} />
      )}
    </div>
  );
}

function JoinRoomModal({ onClose }: { onClose: () => void }) {
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length === 6) {
      navigate(`/lobby/${roomCode.toUpperCase()}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-6 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-secondary-light rounded-xl p-6 w-full max-w-md"
      >
        <h3 className="text-2xl font-bold mb-4">Введите код комнаты</h3>
        <form onSubmit={handleJoin}>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="w-full px-4 py-3 rounded-lg bg-secondary text-white text-center text-2xl tracking-widest uppercase mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={roomCode.length !== 6}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Войти
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
```

---

### 7. Swipe Gameplay Component (`src/components/game/SwipeCard.tsx`)

```typescript
import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useSwipe } from '../../hooks/useSwipe';

interface SwipeCardProps {
  word: string;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
}

export function SwipeCard({ word, onSwipeUp, onSwipeDown }: SwipeCardProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<'up' | 'down' | null>(null);
  
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-100, 0, 100], [0.5, 1, 0.5]);
  const backgroundColor = useTransform(
    y,
    [-100, -50, 0, 50, 100],
    ['#22C55E', '#22C55E', '#FFFFFF', '#EF4444', '#EF4444']
  );

  const handleSwipeUp = () => {
    setExitDirection('up');
    setIsExiting(true);
    setTimeout(() => {
      onSwipeUp();
      setIsExiting(false);
      setExitDirection(null);
    }, 300);
  };

  const handleSwipeDown = () => {
    setExitDirection('down');
    setIsExiting(true);
    setTimeout(() => {
      onSwipeDown();
      setIsExiting(false);
      setExitDirection(null);
    }, 300);
  };

  const swipeHandlers = useSwipe({
    threshold: 100,
    deadZone: 50,
    onSwipeUp: handleSwipeUp,
    onSwipeDown: handleSwipeDown,
  });

  return (
    <div className="relative h-full flex items-center justify-center p-6">
      <motion.div
        {...swipeHandlers}
        style={{ y, opacity, backgroundColor }}
        animate={
          isExiting
            ? { y: exitDirection === 'up' ? -500 : 500, opacity: 0 }
            : { y: 0, opacity: 1 }
        }
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full max-w-md aspect-[3/4] rounded-3xl shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {/* Word */}
        <h1 className="text-6xl font-bold text-secondary px-8 text-center leading-tight">
          {word}
        </h1>

        {/* Swipe indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: y.get() < -50 ? 1 : 0 }}
          className="absolute top-8 left-1/2 -translate-x-1/2 text-green-500 text-2xl font-bold"
        >
          ✓ Угадали
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: y.get() > 50 ? 1 : 0 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-red-500 text-2xl font-bold"
        >
          ✗ Пропуск
        </motion.div>
      </motion.div>

      {/* Instruction hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-400 text-sm text-center">
        Свайп вверх = Угадали<br />
        Свайп вниз = Пропуск
      </div>
    </div>
  );
}
```

---

### 8. Live Scoreboard Component (`src/components/game/Scoreboard.tsx`)

```typescript
import React from 'react';
import { motion } from 'framer-motion';
import { CircularTimer } from './CircularTimer';
import { TeamScores } from './TeamScores';

interface ScoreboardProps {
  timeLeft: number;
  totalTime: number;
  teamAScore: number;
  teamBScore: number;
  currentTeam: 'A' | 'B';
}

export function Scoreboard({
  timeLeft,
  totalTime,
  teamAScore,
  teamBScore,
  currentTeam,
}: ScoreboardProps) {
  // Color based on remaining time
  const getTimerColor = () => {
    if (timeLeft > 30) return '#22C55E'; // green
    if (timeLeft > 10) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  return (
    <div className="h-screen bg-gradient-to-br from-secondary via-secondary-light to-secondary p-8 flex flex-col items-center justify-center">
      {/* Timer */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-12"
      >
        <CircularTimer
          timeLeft={timeLeft}
          totalTime={totalTime}
          color={getTimerColor()}
          size={200}
        />
      </motion.div>

      {/* Scores */}
      <TeamScores
        teamAScore={teamAScore}
        teamBScore={teamBScore}
        currentTeam={currentTeam}
      />

      {/* Current team indicator */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="mt-8 px-6 py-3 rounded-full bg-primary text-white font-bold text-xl"
      >
        {currentTeam === 'A' ? '🔵 Команда А объясняет' : '🔴 Команда Б объясняет'}
      </motion.div>

      {/* IMPORTANT: NO WORD SHOWN ON SCOREBOARD */}
      {/* This prevents cheating - only controller sees words */}
    </div>
  );
}
```

---

### 9. API Service (`src/services/api.service.ts`)

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiService = {
  async createRoom(): Promise<{ roomId: string }> {
    const response = await fetch(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    return response.json();
  },

  async getRoomInfo(roomId: string): Promise<any> {
    const response = await fetch(`${API_URL}/api/rooms/${roomId}`);

    if (!response.ok) {
      throw new Error('Room not found');
    }

    return response.json();
  },
};
```

---

## 🎨 Design System

### Color Palette

```typescript
// src/utils/constants.ts
export const COLORS = {
  primary: {
    DEFAULT: '#FF6B00',
    dark: '#E55D00',
    light: '#FF8533',
  },
  secondary: {
    DEFAULT: '#1A1D29',
    light: '#2A2D39',
  },
  accent: {
    DEFAULT: '#C4F82A',
    dark: '#A8D922',
  },
  teamA: '#3B82F6', // Blue
  teamB: '#EF4444', // Red
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;
```

### Typography

```css
/* Headings */
h1: text-4xl font-bold
h2: text-3xl font-bold
h3: text-2xl font-semibold
h4: text-xl font-semibold

/* Body */
body: text-base (16px)
small: text-sm (14px)

/* Word Display */
.word-display: text-6xl font-bold
```

### Spacing

```
xs: 0.5rem (8px)
sm: 1rem (16px)
md: 1.5rem (24px)
lg: 2rem (32px)
xl: 3rem (48px)
```

---

## 🧪 Testing Strategy

### Component Testing

```typescript
// src/components/home/__tests__/HomePage.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from '../HomePage';

describe('HomePage', () => {
  it('should render create and join buttons', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('▶ Новая игра')).toBeInTheDocument();
    expect(screen.getByText('🔗 Присоединиться')).toBeInTheDocument();
  });

  it('should open join modal when join button clicked', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('🔗 Присоединиться'));
    expect(screen.getByText('Введите код комнаты')).toBeInTheDocument();
  });
});
```

### Hook Testing

```typescript
// src/hooks/__tests__/useSwipe.test.ts
import { renderHook } from '@testing-library/react';
import { useSwipe } from '../useSwipe';

describe('useSwipe', () => {
  it('should detect swipe up', () => {
    const onSwipeUp = jest.fn();
    const { result } = renderHook(() =>
      useSwipe({ threshold: 100, onSwipeUp })
    );

    // Simulate touch events
    const mockEvent = {
      touches: [{ clientY: 100 }],
    } as any;

    result.current.onTouchStart(mockEvent);
    result.current.onTouchMove({ touches: [{ clientY: 0 }] } as any);
    result.current.onTouchEnd();

    expect(onSwipeUp).toHaveBeenCalled();
  });
});
```

**Testing Requirements:**
- [ ] Component tests for all pages
- [ ] Hook tests for custom hooks
- [ ] Integration tests for WebSocket flows
- [ ] E2E tests with Playwright
- [ ] Accessibility tests with axe

---

## 📱 PWA Implementation

### Manifest (`public/manifest.json`)

```json
{
  "name": "PartyFlow - Объясни словами",
  "short_name": "PartyFlow",
  "description": "Multiplayer party game - play directly in browser!",
  "theme_color": "#FF6B00",
  "background_color": "#1A1D29",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Install Prompt

```typescript
// src/hooks/useInstallPrompt.ts
import { useState, useEffect } from 'react';

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return false;

    installPrompt.prompt();
    const result = await installPrompt.userChoice;

    if (result.outcome === 'accepted') {
      setIsInstallable(false);
      return true;
    }

    return false;
  };

  return {
    isInstallable,
    promptInstall,
  };
}
```

---

## 🔒 Security & Best Practices

### Input Sanitization

```typescript
// src/utils/validators.ts
export const validators = {
  roomCode: (code: string): boolean => {
    return /^[A-Z0-9]{6}$/.test(code);
  },

  playerName: (name: string): boolean => {
    return name.length >= 2 && name.length <= 20;
  },

  sanitizeInput: (input: string): string => {
    return input.replace(/[<>'"]/g, '');
  },
};
```

### Error Boundaries

```typescript
// src/components/shared/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to Sentry or analytics
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center">
            <h1 className="text-4xl mb-4">😕</h1>
            <h2 className="text-2xl mb-2">Что-то пошло не так</h2>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-4"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 🚀 Performance Optimization

### Code Splitting

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const HomePage = lazy(() => import('./pages/HomePage'));
const LobbyPage = lazy(() => import('./pages/LobbyPage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lobby/:roomId" element={<LobbyPage />} />
          <Route path="/game/:roomId" element={<GamePage />} />
          <Route path="/results/:roomId" element={<ResultsPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### Image Optimization

```typescript
// Use WebP with fallback
<picture>
  <source srcSet="/images/hero.webp" type="image/webp" />
  <img src="/images/hero.png" alt="Hero" loading="lazy" />
</picture>
```

### React.memo for Heavy Components

```typescript
export const TeamScores = React.memo(({ teamAScore, teamBScore }: Props) => {
  // Component implementation
});
```

---

## ✅ Acceptance Criteria (Before Marking Task Complete)

### Week 1-2: Foundation
- [ ] Vite dev server runs on localhost:5173
- [ ] TailwindCSS styles apply correctly
- [ ] Home page renders with create/join buttons
- [ ] Create room button calls POST /api/rooms
- [ ] Room code input validates 6-character format
- [ ] Navigation to /lobby/:roomId works
- [ ] WebSocket connection established on lobby page
- [ ] Component tests pass

### Week 3-4: Core UI
- [ ] Swipe card detects up/down swipes correctly
- [ ] Swipe threshold and dead zone work as expected
- [ ] Haptic feedback triggers on swipe
- [ ] Word animates out on swipe (up/down)
- [ ] Next word fades in smoothly
- [ ] Scoreboard displays timer and scores (NO words)
- [ ] Circular timer animates countdown
- [ ] Timer color changes: green → yellow → red
- [ ] Score updates with bounce animation

### Week 5: Dual-Screen & Advanced
- [ ] Device mode auto-detects: <768px = controller, ≥768px = scoreboard
- [ ] User can manually toggle device mode
- [ ] Device mode persists in localStorage
- [ ] Controller mode shows word cards
- [ ] Scoreboard mode shows timer/scores only (NO words)
- [ ] Reconnection overlay shows on disconnect
- [ ] Auto-reconnect attempts with exponential backoff
- [ ] State restores after successful reconnection

### Week 6: PWA & Polish
- [ ] PWA manifest configured correctly
- [ ] Service Worker caches assets
- [ ] Offline fallback page works
- [ ] "Add to Home Screen" prompt shows
- [ ] Install prompt can be triggered manually
- [ ] App works when installed on home screen
- [ ] Page transitions smooth (Framer Motion)
- [ ] Loading states show skeleton screens
- [ ] Toast notifications for errors
- [ ] Lighthouse Performance >90

---

## 🆘 Troubleshooting

### WebSocket Connection Issues

```typescript
// Enable debug mode
const socket = io(WS_URL, {
  transports: ['websocket', 'polling'], // Allow fallback
  reconnection: true,
  debug: true, // Enable in dev
});

// Check connection in console
socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('connect_error', (err) => console.error('Connection error:', err));
```

### Swipe Not Detecting

```typescript
// Check touch event listeners
<div
  onTouchStart={(e) => {
    console.log('Touch start:', e.touches[0].clientY);
  }}
  onTouchMove={(e) => {
    console.log('Touch move:', e.touches[0].clientY);
  }}
  onTouchEnd={() => {
    console.log('Touch end');
  }}
>
```

### PWA Not Installing

```bash
# Check manifest
curl http://localhost:5173/manifest.json

# Check Service Worker registration
console.log('SW:', navigator.serviceWorker.controller);

# Use Chrome DevTools > Application > Manifest
```

---

## 📚 Reference Documents

- **PRD:** `/mnt/project/ALIAS___Product_Requirements_Document_PRD.pdf`
- **UX Design:** `/mnt/project/ux-design-documentation.md`
- **UI Components:** 
  - `/mnt/project/home-screen.jsx`
  - `/mnt/project/lobby-screen.jsx`
  - `/mnt/project/swipe-gameplay.jsx`
  - `/mnt/project/live-scoreboard.jsx`

---

## ✅ Daily Checklist

Before ending your work session:

- [ ] All code committed and pushed to Git
- [ ] Component tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Dev server runs without errors (`npm run dev`)
- [ ] Updated task status in Asana
- [ ] Documented any blockers or questions
- [ ] Tested on real mobile device (if possible)

---

## 🤝 Working with Backend Agent

**API Contract:**
- REST: POST /api/rooms → `{ roomId: string }`
- WebSocket: See events.types.ts for full list
- Data formats: ISO 8601 timestamps
- Error format: `{ error: string, code?: string }`

**Coordination:**
- Backend provides API → Frontend integrates
- Backend emits events → Frontend listens
- Use mock data during parallel development
- Integration testing at end of each week

---

**You got this! Build something beautiful. 🎨**

---

**Last Updated:** February 12, 2026  
**Maintainer:** Solo Developer + AI Agents  
**Questions?** Check UX docs or PRD.
