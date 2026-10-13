const { test, expect } = require('@playwright/test');
const { createUsuario, deleteUsuario } = require('./helpers/apiHelper');
const { gerarUsuarioValido } = require('./fixtures/usuarioFixture');

test.describe('DELETE /usuarios/:id', () => {

  test('should delete a user and return 200', async ({ request }) => {
    // Arrange
    const payload = gerarUsuarioValido();
    const createResp = await createUsuario(request, payload);
    const created = await createResp.json();

    // Act
    const response = await deleteUsuario(request, created._id);

    // Assert
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Usuario excluído');
  });

  test('should return 400 when id does not exist', async ({ request }) => {
    const idInexistente = '65a000000000000000000000';

    const response = await deleteUsuario(request, idInexistente);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Usuario nao deletado');
  });

  test('should return 400 when id is invalid', async ({ request }) => {
    const response = await deleteUsuario(request, 'id-invalido');

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Usuario nao deletado');
  });
});
