# Cypress API Tests

Projeto Cypress para testes de API focado no CRUD de **usuarios**, com validacao observavel de **Redis** (por comportamento) e check honesto de **DataDog** (sem inventar traces).

## Estrutura

```
Cypress/
├── package.json              # Dependencias com versoes exatas
├── cypress.config.js         # Configuracao (BASE_URL, DD_AGENT_URL, endpoint)
├── README.md                 # Esta documentacao
└── cypress/
    └── e2e/
        ├── users.cy.js           # Testes CRUD positivos e negativos
        └── observability.cy.js   # Redis (observavel) + DataDog (honesto)
```

## Requisitos

- Node.js 18+ (recomendado 20+)
- Cypress 13.15.2 (instalado via npm)

## Instalacao

```bash
cd Cypress
npm install
```

> As dependencias usam versoes exatas (sem `^`, `~`, `*`). A unica dependencia de desenvolvimento e `cypress@13.15.2`.

## Configuracao

### Variaveis de ambiente

| Variavel       | Obrigatorio | Default                  | Descricao                                                        |
|----------------|-------------|--------------------------|------------------------------------------------------------------|
| `BASE_URL`     | Sim         | `http://localhost:3000`  | URL base da API alvo                                             |
| `DD_AGENT_URL` | Nao         | (vazio)                  | URL do agent do DataDog (ex.: `http://localhost:8126`). Se vazio, o check de DataDog e skipped. |
| `usersEndpoint`| Nao         | `/usuarios`              | Endpoint relativo a BASE_URL para o recurso de usuarios          |

### Exemplos de execucao

```bash
# Executar com BASE_URL padrao (localhost:3000)
npm test

# Executar contra uma API remota
BASE_URL=https://minha-api.com npx cypress run

# Abrir o Cypress interativo
npm run open

# Habilitar check de DataDog
DD_AGENT_URL=http://localhost:8126 BASE_URL=http://localhost:3000 npx cypress run
```

## Cobertura de testes

### users.cy.js — CRUD de usuarios

| Endpoint            | Cenario positivo                          | Cenario negativo                              |
|---------------------|-------------------------------------------|-----------------------------------------------|
| `POST /usuarios`    | Criar usuario com dados validos e unicos  | Email duplicado (400), campos obrigatorios ausentes (400/422) |
| `GET /usuarios`     | Retornar lista 200                        | — (GET de colecao nao tem negativo classico)  |
| `GET /usuarios/:id` | Buscar usuario por id (200)               | Id invalido (400/404), id inexistente (400/404) |
| `PUT /usuarios/:id` | Atualizar usuario (200)                   | Email duplicado de outro usuario (400/409)    |
| `PATCH /usuarios/:id` | Atualizacao parcial (200)               | Payload vazio/invalido (400/422)              |
| `DELETE /usuarios/:id` | Remover usuario (200)                   | Id inexistente (400/404)                       |

**Premissas de contrato:**
- Compativel com [ServeRest](https://github.com/ServeRest/ServeRest) e APIs REST similares.
- POST retorna `201` com `{ _id, message }`.
- GET lista retorna `200` com array.
- GET item retorna `200` com o objeto.
- PUT retorna `200`, PATCH retorna `200`, DELETE retorna `200`.
- IDs sao strings. Status alternativos (`400`/`404`/`422`/`409`) sao aceitos nos cenarios negativos para acomodar variacoes entre APIs.

### observability.cy.js — Redis e DataDog

#### Redis — validacao por comportamento observavel

O projeto **nao acessa Redis diretamente**. Em vez disso:

1. Faz dois `GET /usuarios` consecutivos.
2. Compara o conteudo retornado (deve ser identico).
3. Mede e registra o tempo de cada request.
4. Se a API usa cache (ex.: Redis), o segundo GET tende a ser mais rapido.

**Limitacoes explicitas:**
- Resposta mais rapida no segundo GET e **compativel** com cache, mas **nao confirma** que Redis foi acessado.
- Para validacao definitiva, inspecione telemetria do backend (logs Redis, APM, etc.).
- O teste documenta essas limitacoes nos logs para auditoria.

#### DataDog — check honesto

- Se `DD_AGENT_URL` estiver **configurada**: faz um `GET` ao endpoint e verifica que o agent responde (status < 500). Nenhum trace ou metrica e fabricado.
- Se `DD_AGENT_URL` estiver **ausente**: o check e **explicitamente skipped** com `cy.log` documentando o motivo. Nenhuma requisicao e feita, nenhum trace e inventado.

## Dados unicos

Cada teste gera dados unicos via `buildUser()`, que combina `Date.now()` + numero aleatorio para email e nome. Isso evita colisoes entre execucoes e testes.

## Independencia dos testes

Cada teste cria e limpa seu proprio usuario (POST no inicio, DELETE no fim). Nenhum teste depende de ordem ou de estado de outro teste.

## Notas

- A API alvo nao e alterada em nenhum momento — o projeto apenas faz requisicoes HTTP.
- Nenhum segredo e versionado. URLs e credenciais devem ser fornecidas via variaveis de ambiente.
- Para rodar contra ServeRest localmente: `npx serverest@latest` (instalacao separada, nao inclusa neste projeto).
