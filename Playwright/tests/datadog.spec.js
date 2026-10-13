const { test, expect } = require('@playwright/test');
const { isDatadogEnabled, getDdAgentUrl, enviarMetrica } = require('./helpers/datadogHelper');

/**
 * Integração opcional com DataDog.
 *
 * - Quando DD_AGENT_URL está configurado: envia uma métrica (gauge)
 *   ao endpoint do agente e valida a resposta.
 * - Quando DD_AGENT_URL não está configurado: o teste é explicitamente
 *   skipped com motivo visível no relatório.
 */
test.describe('DataDog - integração opcional', () => {

  test('should send metric to DD_AGENT_URL when configured', async () => {
    test.skip(!isDatadogEnabled(), 'DD_AGENT_URL nao configurado - metrica nao enviada');

    const url = getDdAgentUrl();
    const resultado = await enviarMetrica('playwright.test.run', 1);

    expect(resultado.ok).toBe(true);
    expect(resultado.url).toContain(url);
  });

  test('should explicitly skip when DD_AGENT_URL is not configured', async () => {
    test.skip(isDatadogEnabled(), 'DD_AGENT_URL configurado - executando envio real');

    // Quando chegamos aqui, DD_AGENT_URL não foi configurado.
    // O teste passa e documenta o skip explícito.
    expect(isDatadogEnabled()).toBe(false);
  });
});
