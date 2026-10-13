const { test, expect } = require('@playwright/test');
const { createUsuario, patchUsuario } = require('./helpers/apiHelper');
const { gerarEmailUnico } = require('./fixtures/usuarioFixture');

test.describe('PATCH /usuarios/:id', () => {

  test('should partially update a user and return 200', async ({ request }) => {
    // Arrange
    const payload = {
      nome: `Usuario Patch ${Date.now()}`,
      email: gerarEmailUnico(),
    };
    const createResp = await createUsuario(request, payload);
    const created = await createResp.json();

    // Act: patch apenas do email
    const novoEmail = gerarEmailUnico();
    const response = await patchUsuario(request, created._id, { email: novoEmail });

    // Assert
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Dados do usuario atualizados');
  });

  test('should return 400 when id does not exist', async ({ request }) => {
    const idInexistente = '65a000000000000000000000';

    const response = await patchUsuario(request, idInexistente, { nome: 'Inexistente' });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Usuario nao atualizado');
  });

  test('should return 400 when id is invalid', async ({ request }) => {
    const response = await patchUsuario(request, 'id-invalido', { nome: 'Invalido' });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Usuario nao atualizado');
  });
});
