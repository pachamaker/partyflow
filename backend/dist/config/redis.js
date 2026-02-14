"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingRedis = exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
exports.redisClient = new ioredis_1.default(env_1.config.redisUrl, {
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
    retryStrategy: (attempt) => {
        if (attempt > 20) {
            return null;
        }
        return Math.min(attempt * 100, 2000);
    }
});
exports.redisClient.on('connect', () => {
    console.log('[redis] connecting');
});
exports.redisClient.on('ready', () => {
    console.log('[redis] ready');
});
exports.redisClient.on('error', (error) => {
    console.error('[redis] error', error.message);
});
const pingRedis = async () => {
    try {
        const result = await exports.redisClient.ping();
        return result === 'PONG';
    }
    catch {
        return false;
    }
};
exports.pingRedis = pingRedis;
