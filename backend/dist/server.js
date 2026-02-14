"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const health_controller_1 = require("./controllers/health.controller");
const env_1 = require("./config/env");
const redis_1 = require("./config/redis");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: env_1.config.corsOrigin }));
app.use(express_1.default.json());
app.get('/health', health_controller_1.healthCheck);
const httpServer = (0, node_http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: env_1.config.corsOrigin,
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
httpServer.listen(env_1.config.port, () => {
    console.log(`Server listening on http://localhost:${env_1.config.port}`);
});
const shutdown = async () => {
    console.log('Shutting down server...');
    io.close();
    try {
        await redis_1.redisClient.quit();
    }
    catch {
        redis_1.redisClient.disconnect();
    }
    httpServer.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
