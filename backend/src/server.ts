import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { healthCheck } from './controllers/health.controller';
import { config } from './config/env';
import { redisClient } from './config/redis';

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/health', healthCheck);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[ws] connected: ${socket.id}`);

  socket.emit('connected', {
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  socket.on('disconnect', (reason) => {
    console.log(`[ws] disconnected: ${socket.id}, reason: ${reason}`);
  });
});

httpServer.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});

const shutdown = async (): Promise<void> => {
  console.log('Shutting down server...');
  io.close();

  try {
    await redisClient.quit();
  } catch {
    redisClient.disconnect();
  }

  httpServer.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
