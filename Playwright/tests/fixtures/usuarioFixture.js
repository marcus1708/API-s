/**
 * Fixture: factory de dados para /usuarios.
 * Gera nome e email únicos a cada chamada para evitar conflito
 * de "Dados já existentes" (404) em execuções repetidas.
 */

function gerarSufixoUnico() {
  return `${Date.now()}.${Math.floor(Math.random() * 100000)}`;
}

function gerarEmailUnico() {
  return `teste.${gerarSufixoUnico()}@exemplo.com`;
}

function gerarNomeUnico() {
  return `Usuario Teste ${gerarSufixoUnico()}`;
}

function gerarUsuarioValido(overrides = {}) {
  return {
    nome: gerarNomeUnico(),
    email: gerarEmailUnico(),
    endereco: 'Rua de Teste, 123',
    senha: `Pwd@${Date.now()}`,
    ...overrides,
  };
}

module.exports = {
  gerarEmailUnico,
  gerarNomeUnico,
  gerarUsuarioValido,
};
