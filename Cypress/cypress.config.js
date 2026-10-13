const { defineConfig } = require('cypress');
const { createClient } = require('redis');

// Mapa de eventos recebidos por tipo
const receivedEvents = [];
let redisSubscriber = null;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PUBSUB_CHANNEL = process.env.REDIS_PUBSUB_CHANNEL || 'usuarios:eventos';

async function setupSubscriber() {
    if (redisSubscriber && redisSubscriber.isOpen) return;

    redisSubscriber = createClient({ url: REDIS_URL });
    redisSubscriber.on('error', (err) => {
        console.error('❌ Erro no subscriber de teste:', err.message);
    });
    await redisSubscriber.connect();
    await redisSubscriber.subscribe(REDIS_PUBSUB_CHANNEL, (message) => {
        try {
            const event = JSON.parse(message);
            receivedEvents.push(event);
        } catch (_e) {
            // ignora mensagem inválida
        }
    });
}

async function clearEvents() {
    receivedEvents.length = 0;
    return null;
}

async function waitForEvent({ type, timeoutMs = 5000 }) {
    await setupSubscriber();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const found = receivedEvents.find((e) => e.type === type);
        if (found) return found;
        await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(
        `Evento '${type}' não recebido em ${timeoutMs}ms. ` +
        `Eventos capturados: ${JSON.stringify(receivedEvents)}`
    );
}

async function closeSubscriber() {
    if (redisSubscriber && redisSubscriber.isOpen) {
        await redisSubscriber.quit();
        redisSubscriber = null;
    }
    return null;
}

module.exports = defineConfig({
    e2e: {
        baseUrl: process.env.BASE_URL || 'http://localhost:3333',
        specPattern: 'cypress/e2e/**/*.cy.js',
        supportFile: false,
        env: {
            usersEndpoint: '/usuarios',
            ddAgentUrl: process.env.DD_AGENT_URL || '',
            observabilityTimeout: 5000
        },
        setupNodeEvents(on, config) {
            if (process.env.BASE_URL) {
                config.baseUrl = process.env.BASE_URL;
            }
            if (process.env.DD_AGENT_URL) {
                config.env.ddAgentUrl = process.env.DD_AGENT_URL;
            }

            on('task', {
                clearEvents,
                waitForEvent,
                closeSubscriber,
            });

            return config;
        }
    }
});
