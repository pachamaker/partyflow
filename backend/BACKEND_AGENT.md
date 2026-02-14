# 🤖 AI Agent Guide: Backend Development

**Project:** Alias Web (PartyFlow) - Multiplayer Party Game  
**Role:** Backend Developer Agent (Node.js + WebSocket + Redis)  
**Tech Stack:** Node.js 20+, Express, Socket.io, Redis, TypeScript  
**Your Mission:** Build real-time multiplayer game backend with WebSocket support

---

## 📋 Overview

You are an AI coding agent working on the backend for a viral multiplayer party game. This is a **solo-developed project** where you'll work alongside a Frontend AI agent. Your code must be production-ready, well-tested, and optimized for real-time performance.

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
1. **WebSocket Server** - Real-time bidirectional communication for 2-10 players
2. **Room Management** - Create, join, manage game rooms with 6-character codes
3. **Game State Machine** - Handle game flow: LOBBY → PLAYING → ROUND_END → GAME_END
4. **Word Management** - Load, shuffle, track word packs for gameplay
5. **Score Sync** - Real-time score updates with <100ms latency
6. **Player State** - Auto-balancing teams, reconnection logic, session management
7. **Security** - Rate limiting, input validation, CORS, authentication
8. **Analytics** - Event tracking for product metrics

### Key Constraints:
- **Performance:** WebSocket latency <200ms, support 100+ concurrent rooms
- **Reliability:** Handle disconnects gracefully, ensure state consistency
- **Security:** Protect against DoS, validate all inputs, prevent cheating
- **Scalability:** Stateless architecture, Redis for shared state

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Backend Architecture                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │   Express    │─────▶│  Socket.io   │─────▶│  Redis   │ │
│  │   REST API   │      │   WebSocket  │      │  State   │ │
│  └──────────────┘      └──────────────┘      └──────────┘ │
│         │                      │                     │      │
│         ▼                      ▼                     ▼      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Business Logic Layer                    │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  RoomService  │  GameService  │  WordService        │  │
│  │  PlayerService│  ScoreService │  AnalyticsService   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Technology Choices:
- **Node.js 20+** - Modern async/await, better performance
- **TypeScript** - Type safety, better IDE support, fewer runtime errors
- **Socket.io** - Proven WebSocket library, handles reconnection, room support
- **ioredis** - Fast Redis client with cluster support, promise-based
- **Express** - REST API for room creation, analytics endpoints
- **Winston** - Structured logging for debugging and monitoring
- **Joi/Zod** - Input validation schema
- **Jest** - Unit and integration testing

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.ts                 # Entry point, server initialization
│   ├── config/
│   │   ├── env.ts               # Environment variables, validation
│   │   ├── redis.ts             # Redis connection config
│   │   └── socket.ts            # Socket.io config
│   ├── controllers/
│   │   ├── room.controller.ts   # REST API: POST /api/rooms
│   │   └── analytics.controller.ts # Analytics endpoints
│   ├── services/
│   │   ├── room.service.ts      # Room CRUD, code generation
│   │   ├── player.service.ts    # Player management, teams
│   │   ├── game.service.ts      # Game state machine
│   │   ├── word.service.ts      # Word pack loading, shuffling
│   │   ├── score.service.ts     # Score calculation, sync
│   │   └── analytics.service.ts # Event tracking
│   ├── websocket/
│   │   ├── handlers/
│   │   │   ├── connection.handler.ts  # join_room, disconnect
│   │   │   ├── game.handler.ts        # start_game, word_swiped
│   │   │   └── room.handler.ts        # player actions
│   │   ├── events.ts            # Event constants
│   │   └── middleware.ts        # Auth, validation
│   ├── models/
│   │   ├── room.model.ts        # Room interface, types
│   │   ├── player.model.ts      # Player interface
│   │   └── game.model.ts        # Game state types
│   ├── utils/
│   │   ├── codeGenerator.ts     # 6-char room code
│   │   ├── logger.ts            # Winston logger
│   │   └── validator.ts         # Input validation schemas
│   └── data/
│       └── starter-pack.json    # 50 words for MVP
├── tests/
│   ├── unit/                    # Service unit tests
│   ├── integration/             # WebSocket integration tests
│   └── e2e/                     # End-to-end flow tests
├── .env.example                 # Environment variables template
├── .env                         # Local config (gitignored)
├── package.json
├── tsconfig.json
├── docker-compose.yml           # Local Redis setup
└── Dockerfile                   # Production deployment
```

---

## 🚀 Getting Started

### Initial Setup (Week 1, Day 1)

```bash
# 1. Initialize Node.js project
npm init -y

# 2. Install dependencies
npm install express socket.io ioredis cors dotenv
npm install winston joi
npm install --save-dev typescript @types/node @types/express
npm install --save-dev ts-node nodemon jest @types/jest

# 3. Setup TypeScript
npx tsc --init
# Modify tsconfig.json: target: ES2022, module: commonjs, outDir: dist

# 4. Create folder structure
mkdir -p src/{config,controllers,services,websocket/handlers,models,utils,data}
mkdir -p tests/{unit,integration,e2e}

# 5. Setup environment variables
cat > .env << EOF
NODE_ENV=development
PORT=3001
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
EOF

# 6. Add scripts to package.json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

### Verification Checklist:
- [ ] `npm run dev` starts server on port 3001
- [ ] `/health` endpoint returns `{ status: 'ok' }`
- [ ] Redis connection succeeds (ping/pong)
- [ ] TypeScript compiles without errors
- [ ] Hot reload works with nodemon

---

## 🔧 Core Implementation Guide

### 1. Server Initialization (`src/server.ts`)

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config/env';
import { redisClient } from './config/redis';
import { logger } from './utils/logger';
import { setupWebSocketHandlers } from './websocket/handlers';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// REST API Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    redis: redisClient.status === 'ready' ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

app.post('/api/rooms', async (req, res) => {
  // Room creation endpoint (see controllers/room.controller.ts)
});

// WebSocket Setup
const io = new Server(httpServer, {
  cors: { origin: config.corsOrigin },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB max message size
});

setupWebSocketHandlers(io);

// Start server
httpServer.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  httpServer.close(() => {
    redisClient.quit();
    process.exit(0);
  });
});
```

**Key Points:**
- Health check for monitoring
- Proper CORS setup for frontend
- WebSocket configuration with reconnection support
- Graceful shutdown handling

---

### 2. Redis Configuration (`src/config/redis.ts`)

```typescript
import Redis from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

export const redisClient = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
});

redisClient.on('ready', () => {
  logger.info('Redis ready to accept commands');
});

// Helper functions
export const redisHelpers = {
  async setWithTTL(key: string, value: any, ttlSeconds: number) {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  },
  
  async get(key: string) {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },
  
  async delete(key: string) {
    await redisClient.del(key);
  },
};
```

**Redis Keys Schema:**
```
room:{roomId}              → Room state (TTL: 24h)
room:{roomId}:players      → Set of player IDs
room:{roomId}:used_words   → Set of used word IDs
socket:{socketId}          → Player ID mapping (TTL: 5min)
analytics:daily:{date}     → Daily metrics
```

---

### 3. Room Service (`src/services/room.service.ts`)

```typescript
import { redisHelpers } from '../config/redis';
import { generateRoomCode } from '../utils/codeGenerator';
import { Room, RoomState } from '../models/room.model';

export class RoomService {
  private readonly ROOM_TTL = 24 * 60 * 60; // 24 hours
  
  async createRoom(hostId: string): Promise<Room> {
    // Generate unique 6-character code
    let roomId: string;
    let attempts = 0;
    
    do {
      roomId = generateRoomCode();
      const exists = await this.roomExists(roomId);
      if (!exists) break;
      attempts++;
    } while (attempts < 10);
    
    if (attempts >= 10) {
      throw new Error('Failed to generate unique room code');
    }
    
    const room: Room = {
      roomId,
      hostId,
      state: RoomState.LOBBY,
      players: [],
      scores: { teamA: 0, teamB: 0 },
      currentRound: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await redisHelpers.setWithTTL(
      `room:${roomId}`,
      room,
      this.ROOM_TTL
    );
    
    return room;
  }
  
  async getRoom(roomId: string): Promise<Room | null> {
    return await redisHelpers.get(`room:${roomId}`);
  }
  
  async updateRoom(roomId: string, updates: Partial<Room>): Promise<void> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    
    const updatedRoom = {
      ...room,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await redisHelpers.setWithTTL(
      `room:${roomId}`,
      updatedRoom,
      this.ROOM_TTL
    );
  }
  
  async addPlayer(roomId: string, player: Player): Promise<void> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    
    if (room.players.length >= 10) {
      throw new Error('Room is full (max 10 players)');
    }
    
    // Auto-balance teams
    const teamACounts = room.players.filter(p => p.team === 'A').length;
    const teamBCounts = room.players.filter(p => p.team === 'B').length;
    player.team = teamACounts <= teamBCounts ? 'A' : 'B';
    
    room.players.push(player);
    await this.updateRoom(roomId, { players: room.players });
  }
  
  async removePlayer(roomId: string, playerId: string): Promise<void> {
    const room = await this.getRoom(roomId);
    if (!room) return;
    
    room.players = room.players.filter(p => p.id !== playerId);
    
    if (room.players.length === 0) {
      // Delete room if empty
      await redisHelpers.delete(`room:${roomId}`);
    } else {
      // If host left, assign new host
      if (room.hostId === playerId) {
        room.hostId = room.players[0].id;
      }
      await this.updateRoom(roomId, { 
        players: room.players,
        hostId: room.hostId 
      });
    }
  }
  
  private async roomExists(roomId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    return room !== null;
  }
}
```

**Important:**
- Room codes must be unique (retry logic)
- TTL of 24 hours auto-cleanup
- Auto-balance teams on join
- Handle host transfer when host leaves

---

### 4. WebSocket Connection Handler (`src/websocket/handlers/connection.handler.ts`)

```typescript
import { Server, Socket } from 'socket.io';
import { RoomService } from '../../services/room.service';
import { PlayerService } from '../../services/player.service';
import { logger } from '../../utils/logger';

export function setupConnectionHandlers(io: Server) {
  const roomService = new RoomService();
  const playerService = new PlayerService();
  
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Join room
    socket.on('join_room', async (data: { roomId: string; playerName: string }) => {
      try {
        const { roomId, playerName } = data;
        
        // Validate room exists
        const room = await roomService.getRoom(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        // Create player
        const player = await playerService.createPlayer(
          socket.id,
          playerName,
          roomId
        );
        
        // Add to room
        await roomService.addPlayer(roomId, player);
        
        // Join Socket.io room
        socket.join(roomId);
        
        // Store player info in socket
        socket.data.playerId = player.id;
        socket.data.roomId = roomId;
        
        // Notify player
        socket.emit('room_joined', {
          roomId,
          playerId: player.id,
          room: await roomService.getRoom(roomId),
        });
        
        // Broadcast to others
        socket.to(roomId).emit('player_joined', {
          player,
          room: await roomService.getRoom(roomId),
        });
        
        logger.info(`Player ${player.name} joined room ${roomId}`);
      } catch (error) {
        logger.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });
    
    // Disconnect
    socket.on('disconnect', async () => {
      const { playerId, roomId } = socket.data;
      
      if (!playerId || !roomId) return;
      
      logger.info(`Client disconnected: ${socket.id}`);
      
      // Store player state for reconnection (5 min TTL)
      await playerService.storeDisconnectedPlayer(playerId, roomId);
      
      // Notify others
      socket.to(roomId).emit('player_disconnected', { playerId });
      
      // Remove player after timeout (5 minutes)
      setTimeout(async () => {
        const reconnected = await playerService.isPlayerReconnected(playerId);
        if (!reconnected) {
          await roomService.removePlayer(roomId, playerId);
          io.to(roomId).emit('player_left', { playerId });
        }
      }, 5 * 60 * 1000);
    });
  });
}
```

**Critical Features:**
- Room validation before joining
- Auto-assign teams on join
- Store player state for reconnection (5 min)
- Broadcast player join/leave to all in room
- Handle disconnection gracefully

---

### 5. Game State Machine (`src/services/game.service.ts`)

```typescript
import { Server } from 'socket.io';
import { RoomService } from './room.service';
import { WordService } from './word.service';
import { RoomState } from '../models/room.model';

export class GameService {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(
    private io: Server,
    private roomService: RoomService,
    private wordService: WordService
  ) {}
  
  async startGame(roomId: string, hostId: string): Promise<void> {
    const room = await this.roomService.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    
    // Validate
    if (room.hostId !== hostId) {
      throw new Error('Only host can start game');
    }
    if (room.players.length < 4) {
      throw new Error('Minimum 4 players required');
    }
    if (room.state !== RoomState.LOBBY) {
      throw new Error('Game already started');
    }
    
    // Update state
    await this.roomService.updateRoom(roomId, {
      state: RoomState.PLAYING,
      currentRound: 1,
      scores: { teamA: 0, teamB: 0 },
    });
    
    // Broadcast game started
    this.io.to(roomId).emit('game_started', {
      room: await this.roomService.getRoom(roomId),
    });
    
    // Start first round
    await this.startRound(roomId);
  }
  
  async startRound(roomId: string): Promise<void> {
    const room = await this.roomService.getRoom(roomId);
    if (!room) return;
    
    // Determine explainer (alternate between teams)
    const currentTeam = room.currentRound % 2 === 1 ? 'A' : 'B';
    const teamPlayers = room.players.filter(p => p.team === currentTeam);
    const explainerIndex = Math.floor((room.currentRound - 1) / 2) % teamPlayers.length;
    const explainer = teamPlayers[explainerIndex];
    
    // Get first word
    const word = await this.wordService.getNextWord(roomId);
    
    // Broadcast round started
    this.io.to(roomId).emit('round_started', {
      roundNumber: room.currentRound,
      explainerId: explainer.id,
      explainerName: explainer.name,
      team: currentTeam,
      timer: 60,
    });
    
    // Send word only to explainer
    this.io.to(explainer.socketId).emit('next_word', { word });
    
    // Start timer
    this.startTimer(roomId, 60);
  }
  
  private startTimer(roomId: string, seconds: number): void {
    let timeLeft = seconds;
    
    const timer = setInterval(async () => {
      timeLeft--;
      
      // Broadcast tick
      this.io.to(roomId).emit('timer_tick', { timeLeft });
      
      if (timeLeft <= 0) {
        clearInterval(timer);
        this.timers.delete(roomId);
        await this.endRound(roomId);
      }
    }, 1000);
    
    this.timers.set(roomId, timer);
  }
  
  async endRound(roomId: string): Promise<void> {
    const room = await this.roomService.getRoom(roomId);
    if (!room) return;
    
    // Get round stats
    const stats = await this.wordService.getRoundStats(roomId);
    
    // Broadcast round ended
    this.io.to(roomId).emit('round_ended', {
      stats,
      scores: room.scores,
    });
    
    // Check game end condition
    if (room.scores.teamA >= 50 || room.scores.teamB >= 50 || room.currentRound >= 12) {
      await this.endGame(roomId);
    } else {
      // Prepare next round
      await this.roomService.updateRoom(roomId, {
        currentRound: room.currentRound + 1,
      });
      
      // Auto-start next round after 5 seconds
      setTimeout(() => this.startRound(roomId), 5000);
    }
  }
  
  async endGame(roomId: string): Promise<void> {
    const room = await this.roomService.getRoom(roomId);
    if (!room) return;
    
    // Determine winner
    const winner = room.scores.teamA > room.scores.teamB ? 'A' : 'B';
    
    // Update state
    await this.roomService.updateRoom(roomId, {
      state: RoomState.GAME_ENDED,
    });
    
    // Broadcast game ended
    this.io.to(roomId).emit('game_ended', {
      winner,
      scores: room.scores,
    });
  }
  
  async handleWordSwiped(
    roomId: string, 
    playerId: string, 
    direction: 'up' | 'down'
  ): Promise<void> {
    const room = await this.roomService.getRoom(roomId);
    if (!room) return;
    
    // Validate swipe from active explainer only
    // (validation logic here)
    
    if (direction === 'up') {
      // Correct answer: +1 point
      const team = room.currentRound % 2 === 1 ? 'teamA' : 'teamB';
      room.scores[team]++;
      await this.roomService.updateRoom(roomId, { scores: room.scores });
      
      // Track word
      await this.wordService.markWordGuessed(roomId);
    } else {
      // Skipped
      await this.wordService.markWordSkipped(roomId);
    }
    
    // Broadcast score update
    this.io.to(roomId).emit('score_updated', {
      scores: room.scores,
      action: direction === 'up' ? 'guessed' : 'skipped',
    });
    
    // Send next word
    const word = await this.wordService.getNextWord(roomId);
    // Send only to explainer (get explainer socket from room)
    const explainer = room.players.find(p => /* is current explainer */);
    this.io.to(explainer.socketId).emit('next_word', { word });
  }
}
```

**State Machine Rules:**
- LOBBY → PLAYING: Requires ≥4 players, host action
- PLAYING → ROUND_END: Timer expires OR host force-ends
- ROUND_END → PLAYING: Auto-advance after 5s
- PLAYING → GAME_ENDED: Score ≥50 OR 12 rounds completed
- Team alternation: Round 1,3,5... → Team A, Round 2,4,6... → Team B

---

## 🧪 Testing Strategy

### Unit Tests (`tests/unit/room.service.test.ts`)

```typescript
import { RoomService } from '../../src/services/room.service';
import { redisHelpers } from '../../src/config/redis';

jest.mock('../../src/config/redis');

describe('RoomService', () => {
  let roomService: RoomService;
  
  beforeEach(() => {
    roomService = new RoomService();
    jest.clearAllMocks();
  });
  
  describe('createRoom', () => {
    it('should create room with unique code', async () => {
      (redisHelpers.get as jest.Mock).mockResolvedValue(null);
      (redisHelpers.setWithTTL as jest.Mock).mockResolvedValue(undefined);
      
      const room = await roomService.createRoom('host123');
      
      expect(room.roomId).toHaveLength(6);
      expect(room.hostId).toBe('host123');
      expect(room.state).toBe('LOBBY');
      expect(redisHelpers.setWithTTL).toHaveBeenCalledWith(
        `room:${room.roomId}`,
        expect.any(Object),
        24 * 60 * 60
      );
    });
    
    it('should retry if code collision occurs', async () => {
      (redisHelpers.get as jest.Mock)
        .mockResolvedValueOnce({ roomId: 'ABC123' }) // First code exists
        .mockResolvedValueOnce(null); // Second code available
      
      const room = await roomService.createRoom('host123');
      
      expect(redisHelpers.get).toHaveBeenCalledTimes(2);
      expect(room.roomId).toBeDefined();
    });
  });
  
  describe('addPlayer', () => {
    it('should auto-balance teams', async () => {
      const mockRoom = {
        roomId: 'ABC123',
        players: [
          { id: 'p1', team: 'A' },
          { id: 'p2', team: 'A' },
        ],
      };
      
      (redisHelpers.get as jest.Mock).mockResolvedValue(mockRoom);
      
      const player = { id: 'p3', name: 'Alice', socketId: 's3' };
      await roomService.addPlayer('ABC123', player);
      
      expect(player.team).toBe('B'); // Should assign to smaller team
    });
    
    it('should reject if room is full', async () => {
      const mockRoom = {
        roomId: 'ABC123',
        players: new Array(10).fill({ id: 'p' }),
      };
      
      (redisHelpers.get as jest.Mock).mockResolvedValue(mockRoom);
      
      await expect(
        roomService.addPlayer('ABC123', { id: 'p11', name: 'Bob' })
      ).rejects.toThrow('Room is full');
    });
  });
});
```

### Integration Tests (`tests/integration/websocket.test.ts`)

```typescript
import { io as ioClient, Socket } from 'socket.io-client';
import { setupTestServer } from '../helpers/testServer';

describe('WebSocket Integration', () => {
  let serverUrl: string;
  let client1: Socket;
  let client2: Socket;
  
  beforeAll(async () => {
    serverUrl = await setupTestServer();
  });
  
  beforeEach(() => {
    client1 = ioClient(serverUrl);
    client2 = ioClient(serverUrl);
  });
  
  afterEach(() => {
    client1.close();
    client2.close();
  });
  
  it('should allow players to join room', (done) => {
    const roomId = 'TEST123';
    
    client1.emit('join_room', { roomId, playerName: 'Alice' });
    
    client1.on('room_joined', (data) => {
      expect(data.roomId).toBe(roomId);
      expect(data.playerId).toBeDefined();
      done();
    });
  });
  
  it('should broadcast player join to other players', (done) => {
    const roomId = 'TEST123';
    
    client1.emit('join_room', { roomId, playerName: 'Alice' });
    
    client1.on('room_joined', () => {
      client2.emit('join_room', { roomId, playerName: 'Bob' });
    });
    
    client1.on('player_joined', (data) => {
      expect(data.player.name).toBe('Bob');
      done();
    });
  });
});
```

**Testing Requirements:**
- [ ] Unit test coverage >85%
- [ ] Integration tests for all WebSocket events
- [ ] Load testing: 100 concurrent rooms
- [ ] Race condition testing with concurrent requests
- [ ] Reconnection testing

---

## 🔒 Security Checklist

```typescript
// Rate limiting (express-rate-limit)
import rateLimit from 'express-rate-limit';

const roomCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: 'Too many room creation requests',
});

app.post('/api/rooms', roomCreationLimiter, createRoomHandler);

// Input validation (Joi)
import Joi from 'joi';

const joinRoomSchema = Joi.object({
  roomId: Joi.string().length(6).pattern(/^[A-Z0-9]+$/).required(),
  playerName: Joi.string().min(2).max(20).required(),
});

// WebSocket connection limit
const connectionLimiter = new Map<string, number>();

io.use((socket, next) => {
  const ip = socket.handshake.address;
  const connections = connectionLimiter.get(ip) || 0;
  
  if (connections >= 20) {
    return next(new Error('Connection limit exceeded'));
  }
  
  connectionLimiter.set(ip, connections + 1);
  
  socket.on('disconnect', () => {
    connectionLimiter.set(ip, connectionLimiter.get(ip)! - 1);
  });
  
  next();
});
```

**Security Checklist:**
- [ ] Rate limiting on all endpoints (10 req/min for room creation)
- [ ] Input validation with Joi/Zod
- [ ] CORS properly configured
- [ ] WebSocket connection limit (20 per IP)
- [ ] Sanitize user inputs (player names, room codes)
- [ ] Host-only actions validated (start game, etc)
- [ ] Prevent word visibility on scoreboard devices
- [ ] Redis keys properly namespaced
- [ ] Error messages don't leak internal details

---

## 📊 Analytics & Monitoring

```typescript
// Analytics Service
export class AnalyticsService {
  async trackEvent(event: string, data: any): Promise<void> {
    const key = `analytics:daily:${new Date().toISOString().split('T')[0]}`;
    
    await redisClient.hincrby(key, event, 1);
    await redisClient.expire(key, 30 * 24 * 60 * 60); // 30 days
    
    logger.info('Analytics event:', { event, data });
  }
}

// Track key events
analyticsService.trackEvent('ROOM_CREATED', { roomId });
analyticsService.trackEvent('GAME_STARTED', { roomId, playerCount });
analyticsService.trackEvent('ROUND_COMPLETED', { 
  roomId, 
  guessedCount, 
  skippedCount,
  duration 
});
analyticsService.trackEvent('GAME_ENDED', { 
  roomId, 
  winner, 
  totalRounds,
  sessionLength 
});
```

**Key Metrics to Track:**
- Rooms created (per day)
- Games started (per day)
- Average players per room
- Average session length
- Word guessed/skipped ratio
- Disconnect rate
- K-factor (players invited per host)

---

## 🚀 Deployment

### Development (Docker Compose: backend + redis)

```yaml
# docker-compose.dev.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    env_file:
      - .env.dev
    ports:
      - "3001:3001"
    volumes:
      - .:/app
      - backend-node-modules:/app/node_modules
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped

volumes:
  redis-data:
  backend-node-modules:
```

### Production (Docker Compose: backend only + external Redis)

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.prod.yml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    env_file:
      - .env.prod
    ports:
      - "3001:3001"
    restart: unless-stopped
```

### Environment Variables

```bash
# .env.dev
NODE_ENV=development
PORT=3001
REDIS_URL=redis://redis:6379
CORS_ORIGIN=http://localhost:5173

# .env.prod
NODE_ENV=production
PORT=3001
REDIS_URL=redis://your-redis-host:6379
CORS_ORIGIN=https://partyflow.ru
```

### Run Commands

```bash
# Development
npm run docker:dev
npm run docker:dev:down

# Production
npm run docker:prod
npm run docker:prod:logs
npm run docker:prod:down
```

---
## 🎯 Acceptance Criteria (Before Marking Task Complete)

### Week 1-2: Foundation
- [ ] Server starts on port 3001
- [ ] `/health` endpoint returns 200 OK
- [ ] Redis connection successful (ping/pong works)
- [ ] POST /api/rooms creates room with unique 6-char code
- [ ] WebSocket connection established successfully
- [ ] `join_room` event adds player to room
- [ ] Players auto-balanced across teams A/B
- [ ] Disconnect handled (player state saved 5 min)
- [ ] Unit tests >85% coverage

### Week 3-4: Core Game Loop
- [ ] `start_game` validates ≥4 players and host permissions
- [ ] Game state transitions correctly (LOBBY → PLAYING → GAME_END)
- [ ] Timer broadcasts TIMER_TICK every second
- [ ] Timer auto-ends round at 0 seconds
- [ ] Words loaded from starter-pack.json
- [ ] Word swiped up → +1 point to correct team
- [ ] Word swiped down → 0 points (skip)
- [ ] Score updates broadcast to all players <100ms
- [ ] Round stats calculated (guessed/skipped counts)
- [ ] Game ends at 50 points OR 12 rounds

### Week 5: Advanced Features
- [ ] Device type detection (controller vs scoreboard)
- [ ] Words sent ONLY to controller (explainer phone)
- [ ] Scoreboard receives timer/score but NO words
- [ ] Reconnection restores player state within 5 min
- [ ] GAME_STATE_SYNC sent on reconnection
- [ ] Pending swipes queued and sent after reconnect

### Week 6: Security & Deploy
- [ ] Rate limiting: 10 req/min for room creation
- [ ] Input validation: roomId (6 chars), playerName (2-20 chars)
- [ ] CORS configured for production domain
- [ ] Analytics events tracked (ROOM_CREATED, GAME_STARTED, etc)
- [ ] Dockerfile builds successfully (<200MB)
- [ ] docker-compose up runs backend + redis locally
- [ ] Production deployment tested on staging

---

## 🆘 Troubleshooting

### Common Issues:

**1. Redis Connection Failed**
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping

# Check REDIS_URL in .env
echo $REDIS_URL
```

**2. WebSocket Not Connecting**
```typescript
// Enable debug logs
const io = new Server(httpServer, {
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'], // Allow fallback
});

// Check CORS in browser console
```

**3. Timer Desync**
```typescript
// Use server-authoritative timer
// Never trust client timestamp
// Broadcast TIMER_TICK from server only
```

**4. Race Conditions**
```typescript
// Use Redis transactions for atomic operations
const multi = redisClient.multi();
multi.get(`room:${roomId}`);
multi.set(`room:${roomId}`, updatedRoom);
await multi.exec();
```

---

## 📚 Reference Documents

- **PRD:** `/mnt/project/ALIAS___Product_Requirements_Document_PRD.pdf`
- **WebSocket Architecture:** `/mnt/project/partyflow_websocket_architecture.md`
- **Agent Tasks:** 
  - `/mnt/project/agent-task-01-websocket-server.md`
  - `/mnt/project/agent-task-02-state-machine.md`
  - `/mnt/project/agent-task-03-reconnection.md`

---

## ✅ Daily Checklist

Before ending your work session:

- [ ] All code committed and pushed to Git
- [ ] Tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Server runs without errors (`npm run dev`)
- [ ] Updated task status in Asana
- [ ] Documented any blockers or questions
- [ ] Logged key decisions in commit messages

---

## 🤝 Working with Frontend Agent

**API Contract:**
- REST API: POST /api/rooms returns `{ roomId: string }`
- WebSocket Events: See events.ts for full list
- Data formats: All timestamps in ISO 8601
- Error format: `{ error: string, code?: string }`

**Coordination:**
- Backend completes API → Frontend integrates
- Backend emits events → Frontend listens
- Mock data during parallel development
- Integration testing at end of each week

---

**You got this! Build something amazing. 🚀**

---

**Last Updated:** February 12, 2026  
**Maintainer:** Solo Developer + AI Agents  
**Questions?** Check PRD or consult project documentation.
