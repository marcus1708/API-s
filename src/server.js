require('dotenv').config();

require('dd-trace').init();

const app = require('./app');
const connectDB = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');

const PORT = process.env.PORT || 3333;

const startServer = async () => {
    try {
        await connectDB();
        await connectRedis();

        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('❌ Erro ao iniciar servidor:', err);
        process.exit(1);
    }
};

const shutdown = async () => {
    console.log('🔄 Encerrando conexões...');
    try {
        await disconnectRedis();
    } catch (err) {
        console.error('❌ Erro ao desconectar Redis:', err.message);
    }
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();