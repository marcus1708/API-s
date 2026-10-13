/**
 * Helper para validar Pub/Sub Redis nos testes do Playwright.
 *
 * Cria um subscriber dedicado que assina o canal 'usuarios:eventos',
 * captura eventos publicados pela API e expõe métodos para verificar
 * se um evento específico foi recebido dentro de um timeout.
 */

const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PUBSUB_CHANNEL = process.env.REDIS_PUBSUB_CHANNEL || 'usuarios:eventos';

let subscriber = null;
let receivedEvents = [];

async function connect() {
    if (subscriber && subscriber.isOpen) return;

    subscriber = createClient({ url: REDIS_URL });
    subscriber.on('error', (err) => {
        console.error('❌ Erro no subscriber de teste:', err.message);
    });
    await subscriber.connect();
    await subscriber.subscribe(REDIS_PUBSUB_CHANNEL, (message) => {
        try {
            const event = JSON.parse(message);
            receivedEvents.push(event);
        } catch (_e) {
            // ignora mensagem inválida
        }
    });
}

async function clearEvents() {
    receivedEvents = [];
}

async function waitForEvent(type, timeoutMs = 5000) {
    await connect();
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

async function disconnect() {
    if (subscriber && subscriber.isOpen) {
        await subscriber.quit();
        subscriber = null;
    }
}

module.exports = {
    connect,
    clearEvents,
    waitForEvent,
    disconnect,
};
