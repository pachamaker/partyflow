"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = void 0;
const redis_1 = require("../config/redis");
const healthCheck = async (_req, res) => {
    const redisOk = await (0, redis_1.pingRedis)();
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
exports.healthCheck = healthCheck;
