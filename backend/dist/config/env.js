"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const toNumber = (value, fallback) => {
    if (!value)
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
exports.config = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: toNumber(process.env.PORT, 3001),
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173'
};
