const { test, expect } = require('@playwright/test');
const { createUsuario, getUsuarioById } = require('./helpers/apiHelper');
const { gerarUsuarioValido } = require('./fixtures/usuarioFixture');

test.describe('GET /usuarios/:id', () => {

  test('should return 200 and the user when id exists', async ({ request }) => {
    // Arrange: cria um usuário para garantir que existe
    const payload = gerarUsuarioValido();
    const createResp = await createUsuario(request, payload);
    const created = await createResp.json();

    // Act
    const response = await getUsuarioById(request, created._id);

    // Assert
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Usuario encontrado');
    expect(body).toHaveProperty('usuario');
    expect(body.usuario).toHaveProperty('_id', created._id);
  });

  test('should return 404 when id does not exist', async ({ request }) => {
    const idInexistente = '65a000000000000000000000';

    const response = await getUsuarioById(request, idInexistente);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe('Usuario nao encontrado');
  });

  test('should return 400 when id is invalid', async ({ request }) => {
    const response = await getUsuarioById(request, 'id-invalido');

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Usuario nao encontrado');
  });
});
