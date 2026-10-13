const { createClient } = require('redis');

const redisOptions = {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
};

const redis = createClient(redisOptions);
const redisSubscriber = redis.duplicate();
const REDIS_PUBSUB_CHANNEL = process.env.REDIS_PUBSUB_CHANNEL || 'usuarios:eventos';

redis.on('error', (err) => {
    console.error('❌ Erro no Redis:', err.message);
});

redisSubscriber.on('error', (err) => {
    console.error('❌ Erro no subscriber Redis:', err.message);
});

const handleRedisMessage = (message, channel) => {
    try {
        const event = JSON.parse(message);
        console.log(`📨 Evento Redis recebido em ${channel}: ${event.type}`);
    } catch (err) {
        console.error('❌ Mensagem inválida recebida do Redis:', err.message);
    }
};

const connectRedis = async () => {
    if (!redis.isOpen) {
        await redis.connect();
    }

    if (!redisSubscriber.isOpen) {
        await redisSubscriber.connect();
    }

    await redisSubscriber.subscribe(REDIS_PUBSUB_CHANNEL, handleRedisMessage);
    console.log(`✅ Redis conectado com Pub/Sub no canal ${REDIS_PUBSUB_CHANNEL}!`);
};

const publishUserEvent = async ({ type, id = null, method, path }) => {
    const event = {
        type,
        resource: 'usuario',
        id: id ? String(id) : null,
        method,
        path,
        occurredAt: new Date().toISOString()
    };

    await redis.publish(REDIS_PUBSUB_CHANNEL, JSON.stringify(event));
};

const disconnectRedis = async () => {
    if (redisSubscriber.isOpen) {
        await redisSubscriber.quit();
    }

    if (redis.isOpen) {
        await redis.quit();
    }
};

module.exports = {
    redis,
    connectRedis,
    disconnectRedis,
    publishUserEvent,
    REDIS_PUBSUB_CHANNEL
};
