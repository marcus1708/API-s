const { test, expect } = require('@playwright/test');
const {
  createUsuario,
  getUsuarios,
  getUsuarioById,
} = require('./helpers/apiHelper');
const { gerarUsuarioValido } = require('./fixtures/usuarioFixture');

/**
 * Valida o comportamento de cache Redis ao repetir GET.
 * A API usa Redis como cache: o primeiro GET popula o cache (MISS)
 * e o segundo GET retorna do cache (HIT). O teste verifica que a
 * resposta é consistente entre as duas chamadas, sem alterar a API.
 */
test.describe('Cache Redis - GET repetido', () => {

  test('should return consistent list on repeated GET /usuarios', async ({ request }) => {
    // Arrange: cria um usuário para garantir que há dados
    const payload = gerarUsuarioValido();
    await createUsuario(request, payload);

    // Act: primeira chamada (popula cache - MISS)
    const resp1 = await getUsuarios(request);
    const body1 = await resp1.json();

    // Act: segunda chamada (retorna do cache - HIT)
    const resp2 = await getUsuarios(request);
    const body2 = await resp2.json();

    // Assert: ambas retornam 200 e mesma estrutura
    expect(resp1.status()).toBe(200);
    expect(resp2.status()).toBe(200);
    expect(body1.message).toBe(body2.message);
    expect(Array.isArray(body1.usuarios)).toBe(true);
    expect(Array.isArray(body2.usuarios)).toBe(true);
    expect(body1.usuarios.length).toBe(body2.usuarios.length);
  });

  test('should return consistent user on repeated GET /usuarios/:id', async ({ request }) => {
    // Arrange
    const payload = gerarUsuarioValido();
    const createResp = await createUsuario(request, payload);
    const created = await createResp.json();

    // Act: primeira chamada (MISS)
    const resp1 = await getUsuarioById(request, created._id);
    const body1 = await resp1.json();

    // Act: segunda chamada (HIT)
    const resp2 = await getUsuarioById(request, created._id);
    const body2 = await resp2.json();

    // Assert
    expect(resp1.status()).toBe(200);
    expect(resp2.status()).toBe(200);
    expect(body1.message).toBe(body2.message);
    expect(body1.usuario._id).toBe(body2.usuario._id);
    expect(body1.usuario.nome).toBe(body2.usuario.nome);
    expect(body1.usuario.email).toBe(body2.usuario.email);
  });
});
