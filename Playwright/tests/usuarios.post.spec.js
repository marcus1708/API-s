const { test, expect } = require('@playwright/test');
const { createUsuario } = require('./helpers/apiHelper');
const { gerarUsuarioValido } = require('./fixtures/usuarioFixture');

test.describe('POST /usuarios', () => {

  test('should create a user and return 201', async ({ request }) => {
    const payload = gerarUsuarioValido();

    const response = await createUsuario(request, payload);

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('_id');
    expect(body.message).toBe('Usuario gerado com sucesso');
  });

  test('should return 400 when nome and email are missing', async ({ request }) => {
    const response = await createUsuario(request, {});

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Nome e Email são obrigatórios');
  });

  test('should return 400 when only nome is provided', async ({ request }) => {
    const response = await createUsuario(request, { nome: 'Sem Email' });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Nome e Email são obrigatórios');
  });

  test('should return 404 when email already exists', async ({ request }) => {
    const payload = gerarUsuarioValido();
    await createUsuario(request, payload);

    const response = await createUsuario(request, payload);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe('Dados já existentes');
  });
});
