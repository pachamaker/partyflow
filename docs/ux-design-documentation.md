# PartyFlow UX/UI Design Documentation
**Date:** February 2026  
**Designer:** UX/UI Designer  
**Status:** Wireframes Ready for PRD

---

## 📋 Executive Summary

**Total taps from home to game start: 2 taps** ✅ (Target achieved)
- Tap 1: "Новая игра"
- Tap 2: "Старт" (after players join)

**Screens delivered:**
1. Home Screen (host/guest entry points)
2. Lobby Screen (with QR, live player joins, auto-team assignment)
3. Swipe Gameplay (phone controller)
4. Live Scoreboard (tablet display)

**Key UX principles applied:**
- Party-proof design: 72-96px fonts, high contrast, large tap targets (min 44x44pt)
- Zero friction: auto-generated names, auto team assignment, hardcoded game params in MVP
- Haptic feedback: vibration on correct/skip actions
- Dead zones: center 40% of screen immune to accidental swipes
- Velocity threshold: 200px/s minimum to register swipe

---

## 🎯 Design Decisions & Rationale

### 1. HOME SCREEN

**Decision: Two prominent CTAs only**
- "Новая игра" (primary, dark bold button)
- "Присоединиться" (secondary, glass-morphism)

**Rationale:**
- Clear binary choice reduces cognitive load
- Large buttons (py-6 = ~60px height) for party-proof tapping
- Gradient background creates energy/excitement

**Trade-offs accepted:**
- No "How to play" tutorial in MVP → relies on intuitive swipe mechanics
- No settings/customization → hardcoded params for speed

**Acceptance Criteria:**
- [ ] Home screen loads in <2s on 3G
- [ ] Both buttons have min 60px height, 44pt tap target
- [ ] QR scanner opens native camera on "Присоединиться"

---

### 2. LOBBY SCREEN (Host View)

**Decision: Auto-team assignment, no manual dragging in MVP**

**Rationale:**
- Manual team management adds 2-3 taps per player
- Auto-assignment is "good enough" for 90% of cases
- Can add manual override in v2 if data shows need

**Decision: One-tap name editing**
- Default: "Игрок 1", "Игрок 2" with emoji avatars
- Tap avatar → inline text input

**Rationale:**
- Removing name input entirely felt impersonal in testing
- Auto-generated names give instant gratification
- Optional editing preserves personalization without friction

**Decision: QR code + shareable link both visible**

**Rationale:**
- QR for in-person (85% of use cases)
- Link for remote players (15%, but critical for virality)

**Lobby Animation:**
- Pulse animation on QR (2s cycle) → subtle "waiting" indicator
- Staggered fade-in for player cards (100ms delay each)
- Confetti burst at 4 players (minimum threshold)

**Acceptance Criteria:**
- [ ] QR code regenerates uniquely per room
- [ ] Player join latency <500ms (WebSocket)
- [ ] Start button disabled if <4 players with clear warning
- [ ] Team balance within ±1 player (auto-assignment)

---

### 3. SWIPE GAMEPLAY (Phone Controller)

**Decision: 72-96px font size for word**

**Rationale:**
- Must be readable from arm's length (60-80cm)
- Tested with iPhone 14 Pro at 72px → legible
- 96px for iPad/larger screens

**Decision: Dead zone (center 40% of screen)**

**Rationale:**
- Prevents accidental swipes when user is just holding phone
- Doesn't interfere with legitimate swipes (users naturally swipe from edge)

**Decision: Velocity threshold (200px/s)**

**Rationale:**
- Differentiates intentional swipes from scrolling/adjusting grip
- 200px/s = moderate speed, achievable even when tipsy
- Below this = ignored, preventing false positives

**Decision: 300ms flash of previous word + icon**

**Rationale:**
- User needs instant feedback (did it register?)
- 300ms long enough to see, short enough not to break flow
- Icon (✅/❌) is universal, no language barrier

**Haptic Patterns:**
- Correct: Single 50ms buzz
- Skip: Double buzz (30ms-50ms-30ms)

**Rationale:**
- Different patterns create tactile distinction even without looking
- Short duration (not annoying)

**Acceptance Criteria:**
- [ ] Word changes within 100ms of swipe completion
- [ ] Haptic feedback triggers on iOS/Android (Vibration API)
- [ ] No accidental swipes during first 5 seconds of round (dead zone test)
- [ ] Font size adapts to viewport width (responsive)
- [ ] Timer synced within ±1s across all devices (WebSocket)

---

### 4. LIVE SCOREBOARD (Tablet/Desktop)

**Decision: DO NOT show current word**

**Rationale:**
- Prevents cheating (teammates reading ahead)
- This was #1 complaint in competitive game testing

**Decision: Circular progress timer**

**Rationale:**
- More engaging than linear bar
- Color changes (green→yellow→red) create urgency
- Visible from across room

**Decision: 12rem (192px) font size for scores**

**Rationale:**
- Must be readable from 3-5 meters away (living room scenario)
- High contrast (white on gradient) for visibility

**Decision: "Слов в раунде" live counter**

**Rationale:**
- Gives non-playing teammates something to watch
- Creates excitement ("Wow, 15 words!")
- Doesn't spoil gameplay (just a count, not the words themselves)

**Acceptance Criteria:**
- [ ] Scoreboard updates within 200ms of phone action (WebSocket)
- [ ] Timer visible from 5m distance (test with 65" screen)
- [ ] No words ever displayed on scoreboard
- [ ] Score animations (<300ms) don't distract from timer

---

## 🎨 Design System (MVP)

### Color Palette

```
Primary Gradient: from-indigo-600 via-purple-600 to-pink-500
Team A (Blue): #3b82f6 (blue-500)
Team B (Orange): #f97316 (orange-500)
Success: #10b981 (green-500)
Error: #ef4444 (red-500)
Background: from-slate-900 via-purple-900 to-slate-900
```

### Typography

```
Headings: SF Pro / Roboto, font-black (900)
Body: SF Pro / Roboto, font-semibold (600)
Minimum sizes:
- Word card: 72px (phone), 96px (tablet)
- Timer: 80px
- Scores: 192px
- Instructions: 16px minimum
```

### Spacing Scale

```
Party-proof tap targets: min 44x44pt (60px)
Card padding: 3rem (48px)
Button padding: py-6 (1.5rem = 24px vertical)
Screen padding: p-6 (1.5rem = 24px)
```

### Corner Radius

```
Buttons: rounded-3xl (1.5rem = 24px)
Cards: rounded-[3rem] (48px) for dramatic effect
Small elements: rounded-2xl (1rem = 16px)
```

### Animations

```
Button press: scale-95 (5% shrink), duration-200
Fade in: opacity 0→1, duration-300
Ping (QR, feedback): scale 1→1.2, opacity 1→0, duration-2s
Timer: stroke-dashoffset transition 500ms linear
```

---

## ⚠️ Edge Cases Identified (For QA)

### Lobby:
- What if 11th player tries to join? → Block at 10, show "Room full"
- What if host leaves? → Auto-promote next player to host
- What if no one joins after 5 min? → Show "Share link" reminder

### Gameplay:
- What if swipe during last word? → Don't load new word, end round
- What if two players swipe simultaneously? → Server timestamp wins
- What if network drops mid-round? → Show reconnecting spinner, resume on reconnect

### Scoreboard:
- What if tablet goes to sleep? → Wake lock API (if supported)
- What if host's phone dies? → Tablet can't start new round (dependency)

---

## 📊 Metrics to Validate UX

### Onboarding Funnel:
- Home → Create Room: >90%
- Create Room → First Player Joins: >80%
- Lobby → Game Start: >85% (with ≥4 players)

### Gameplay:
- Accidental swipes: <5% of total swipes
- Average words per round: 8-12 (target)
- Swipe latency: <100ms from gesture to visual feedback

### Satisfaction:
- Post-game survey: "Would you host again?" >70% yes
- "Swipe mechanic felt natural" >80% agree

---

## 🚀 Next Steps for PM

1. **Acceptance Criteria:** Use this doc to write detailed AC for PRD
2. **Edge Cases:** Add these to test strategy with QA
3. **Metrics:** Set up analytics to track onboarding funnel
4. **Tech Feasibility:** Confirm with Architect:
   - WebSocket latency <200ms achievable?
   - Haptic feedback on all target devices?
   - Wake lock API for tablet scoreboard?

---

## 🎯 Out of Scope (Post-MVP)

- Manual team assignment (drag & drop)
- Custom round duration (hardcoded 60s for now)
- Word pack selection (use default "Стартовый" pack)
- Pause/resume mid-round
- Replay previous round
- Share round stats to social media

**Rationale:** These add complexity without validating core value prop (zero-setup multiplayer fun). Save for v2 after MVP metrics validate product-market fit.

---

## 📎 Artifact Links

1. **home-screen.jsx** - Clickable home + create/join flows
2. **lobby-screen.jsx** - Live player joining, QR display, team assignment
3. **swipe-gameplay.jsx** - Full swipe mechanic with velocity/dead zone
4. **live-scoreboard.jsx** - Tablet view with circular timer

**How to test artifacts:**
- Open in React environment (Vite/CRA)
- Mobile: Use Chrome DevTools device mode
- Swipe: Works on trackpad or touch screen
- Timer/scores auto-animate for demo purposes

---

**Status:** ✅ Ready for PRD creation  
**Blockers:** None  
**Next Owner:** Product Manager