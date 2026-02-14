import { Request, Response } from 'express';
import { pingRedis } from '../config/redis';

export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
  const redisOk = await pingRedis();

  if (!redisOk) {
    res.status(503).json({
      status: 'degraded',
      redis: 'down'
    });
    return;
  }

  res.status(200).json({
    status: 'ok',
    redis: 'up'
  });
};
