const { test, expect } = require('@playwright/test');
const { getUsuarios } = require('./helpers/apiHelper');

test.describe('GET /usuarios (coleção)', () => {

  test('should return 200 and list of usuarios', async ({ request }) => {
    const response = await getUsuarios(request);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('message');
    expect(body.message).toBe('Listagem de todos os usuarios realizada');
    expect(Array.isArray(body.usuarios)).toBe(true);
  });

  test('should return consistent response structure with usuarios array', async ({ request }) => {
    const response = await getUsuarios(request);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('usuarios');
    expect(Array.isArray(body.usuarios)).toBe(true);
    expect(response.headers()['content-type']).toContain('application/json');
  });
});
