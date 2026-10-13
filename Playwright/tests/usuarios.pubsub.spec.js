const { test, expect } = require('@playwright/test');
const { createUsuario, getUsuarios, getUsuarioById, updateUsuario, patchUsuario, deleteUsuario } = require('./helpers/apiHelper');
const { gerarUsuarioValido } = require('./fixtures/usuarioFixture');
const { clearEvents, waitForEvent, disconnect } = require('./helpers/pubsubHelper');

/**
 * Testes de Pub/Sub Redis — cada endpoint deve publicar um evento
 * no canal 'usuarios:eventos' após operações bem-sucedidas.
 *
 * Eventos esperados:
 *   POST   → usuario.created
 *   GET    → usuario.listed
 *   GET/:id → usuario.fetched
 *   PUT    → usuario.updated
 *   PATCH  → usuario.patched
 *   DELETE → usuario.deleted
 */

test.afterAll(async () => {
    await disconnect();
});

test.describe('Pub/Sub Redis — validação de eventos por endpoint', () => {

    test('POST should publish usuario.created event', async ({ request }) => {
        const payload = gerarUsuarioValido();

        await clearEvents();
        const response = await createUsuario(request, payload);

        expect(response.status()).toBe(201);
        const body = await response.json();
        const id = body._id;

        const event = await waitForEvent('usuario.created', 5000);
        expect(event.type).toBe('usuario.created');
        expect(event.method).toBe('POST');
        expect(event.id).toBe(id);

        // Limpeza
        await deleteUsuario(request, id);
    });

    test('GET /usuarios should publish usuario.listed event', async ({ request }) => {
        await clearEvents();
        const response = await getUsuarios(request);

        expect(response.status()).toBe(200);

        const event = await waitForEvent('usuario.listed', 5000);
        expect(event.type).toBe('usuario.listed');
        expect(event.method).toBe('GET');
    });

    test('GET /usuarios/:id should publish usuario.fetched event', async ({ request }) => {
        const payload = gerarUsuarioValido();
        const createResp = await createUsuario(request, payload);
        const created = await createResp.json();

        await clearEvents();
        const response = await getUsuarioById(request, created._id);

        expect(response.status()).toBe(200);

        const event = await waitForEvent('usuario.fetched', 5000);
        expect(event.type).toBe('usuario.fetched');
        expect(event.method).toBe('GET');
        expect(event.id).toBe(created._id);

        // Limpeza
        await deleteUsuario(request, created._id);
    });

    test('PUT should publish usuario.updated event', async ({ request }) => {
        const payload = gerarUsuarioValido();
        const createResp = await createUsuario(request, payload);
        const created = await createResp.json();

        await clearEvents();
        const updatePayload = gerarUsuarioValido({ nome: 'Updated PubSub' });
        const response = await updateUsuario(request, created._id, updatePayload);

        expect(response.status()).toBe(200);

        const event = await waitForEvent('usuario.updated', 5000);
        expect(event.type).toBe('usuario.updated');
        expect(event.method).toBe('PUT');
        expect(event.id).toBe(created._id);

        // Limpeza
        await deleteUsuario(request, created._id);
    });

    test('PATCH should publish usuario.patched event', async ({ request }) => {
        const payload = gerarUsuarioValido();
        const createResp = await createUsuario(request, payload);
        const created = await createResp.json();

        await clearEvents();
        const response = await patchUsuario(request, created._id, { nome: 'Patched PubSub' });

        expect(response.status()).toBe(200);

        const event = await waitForEvent('usuario.patched', 5000);
        expect(event.type).toBe('usuario.patched');
        expect(event.method).toBe('PATCH');
        expect(event.id).toBe(created._id);

        // Limpeza
        await deleteUsuario(request, created._id);
    });

    test('DELETE should publish usuario.deleted event', async ({ request }) => {
        const payload = gerarUsuarioValido();
        const createResp = await createUsuario(request, payload);
        const created = await createResp.json();

        await clearEvents();
        const response = await deleteUsuario(request, created._id);

        expect(response.status()).toBe(200);

        const event = await waitForEvent('usuario.deleted', 5000);
        expect(event.type).toBe('usuario.deleted');
        expect(event.method).toBe('DELETE');
        expect(event.id).toBe(created._id);
    });
});
