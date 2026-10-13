/**
 * Helper DataDog: envia métrica ao DD_AGENT_URL quando configurado.
 * Quando DD_AGENT_URL não está definido, isDatadogEnabled() retorna false
 * e os testes chamam test.skip() explicitamente.
 */

function isDatadogEnabled() {
  return typeof process.env.DD_AGENT_URL === 'string'
    && process.env.DD_AGENT_URL.length > 0;
}

function getDdAgentUrl() {
  return process.env.DD_AGENT_URL || '';
}

/**
 * Envia uma métrica (gauge) ao endpoint do DataDog Agent.
 * Retorna { ok, status, url } ou lança erro de conexão.
 */
async function enviarMetrica(nome, valor) {
  const url = getDdAgentUrl();
  if (!url) {
    return { ok: false, reason: 'DD_AGENT_URL nao configurado', url: null };
  }

  const payload = JSON.stringify({
    metric: nome,
    points: [[Date.now() / 1000, valor]],
    type: 'gauge',
  });

  const response = await fetch(`${url}/v1/metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });

  return {
    ok: response.ok,
    status: response.status,
    url: `${url}/v1/metrics`,
  };
}

module.exports = {
  isDatadogEnabled,
  getDdAgentUrl,
  enviarMetrica,
};
