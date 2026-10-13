require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');

const PORT = process.env.PORT || 3333;

const startServer = async () => {
    try {
        await connectDB();
        await connectRedis();

        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Erro ao iniciar servidor:', err.message);
        process.exit(1);
    }
};

startServer();
