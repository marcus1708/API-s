const { createClient } = require('redis');

const redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => {
    console.error('❌ Erro no Redis:', err.message);
});

const connectRedis = async () => {
    if (!redis.isOpen) {
        await redis.connect();
    }
    console.log('✅ Redis conectado com sucesso!');
};

module.exports = {
    redis,
    connectRedis
};
