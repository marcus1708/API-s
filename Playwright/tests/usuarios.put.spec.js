const { test, expect } = require('@playwright/test');
const { createUsuario, updateUsuario } = require('./helpers/apiHelper');
const { gerarUsuarioValido } = require('./fixtures/usuarioFixture');

test.describe('PUT /usuarios/:id', () => {

  test('should update a user and return 200', async ({ request }) => {
    // Arrange
    const payload = gerarUsuarioValido();
    const createResp = await createUsuario(request, payload);
    const created = await createResp.json();

    // Act: atualiza com dados novos
    const novosDados = gerarUsuarioValido();
    const response = await updateUsuario(request, created._id, novosDados);

    // Assert
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Dados do usuario atualizados');
  });

  test('should return 400 when id does not exist', async ({ request }) => {
    const idInexistente = '65a000000000000000000000';

    const response = await updateUsuario(request, idInexistente, gerarUsuarioValido());

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Usuario nao atualizado');
  });

  test('should return 400 when id is invalid', async ({ request }) => {
    const response = await updateUsuario(request, 'id-invalido', gerarUsuarioValido());

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Usuario nao atualizado');
  });
});
