import Redis from 'ioredis';
import { config } from './env';

export const redisClient = new Redis(config.redisUrl, {
  enableReadyCheck: true,
  maxRetriesPerRequest: null,
  retryStrategy: (attempt: number) => {
    if (attempt > 20) {
      return null;
    }

    return Math.min(attempt * 100, 2000);
  }
});

redisClient.on('connect', () => {
  console.log('[redis] connecting');
});

redisClient.on('ready', () => {
  console.log('[redis] ready');
});

redisClient.on('error', (error: Error) => {
  console.error('[redis] error', error.message);
});

export const pingRedis = async (): Promise<boolean> => {
  try {
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
};
