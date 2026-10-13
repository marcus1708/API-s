# Testes Playwright API - /usuarios

Projeto de testes de API com Playwright para as seis operações do endpoint `/usuarios` da API-s.

## Pré-requisitos

- **Node.js** 18 ou superior
- **API-s** rodando e acessível (padrão: `http://localhost:3333`)
  - A API depende de **MongoDB** e **Redis** para funcionar corretamente
  - Inicie a API com `npm run dev` no diretório raiz (`API-s`)
- **Redis** rodando (padrão: `redis://localhost:6379`) — necessário para os testes de cache

## Instalação

```bash
cd Playwright
npm install
```

## Configuração

### BASE_URL (obrigatório)

A URL da API é configurável via variável de ambiente `BASE_URL`:

```bash
# Windows PowerShell
$env:BASE_URL = "http://localhost:3333"; npx playwright test

# Linux/Mac
BASE_URL=http://localhost:3000 npx playwright test
```

Padrão: `http://localhost:3333`

### DD_AGENT_URL (opcional — DataDog)

Quando `DD_AGENT_URL` está configurado, os testes enviam uma métrica ao endpoint do DataDog Agent. Quando não configurado, os testes de DataDog são **explicitamente skipped** com motivo visível no relatório.

```bash
# Windows PowerShell
$env:DD_AGENT_URL = "http://localhost:8126"; npx playwright test

# Linux/Mac
DD_AGENT_URL=http://localhost:8126 npx playwright test
```

## Execução

```bash
# Executar todos os testes
npx playwright test

# Listar todos os testes sem executar
npx playwright test --list

# Executar um arquivo específico
npx playwright test tests/usuarios.post.spec.js

# Executar com reporter HTML
npx playwright test --reporter=html
```

## Estrutura

```
Playwright/
├── package.json                    # Dependências em versões exatas
├── playwright.config.js             # Config com BASE_URL configurável
├── README.md
└── tests/
    ├── fixtures/
    │   └── usuarioFixture.js       # Factory de dados únicos (nome/email)
    ├── helpers/
    │   ├── apiHelper.js             # Funções reutilizáveis para /usuarios
    │   └── datadogHelper.js         # DataDog: envio de métricas opcional
    ├── usuarios.post.spec.js        # POST - positivo (201) + negativo (400, 404)
    ├── usuarios.get-collection.spec.js  # GET /usuarios - positivo + contrato
    ├── usuarios.get-by-id.spec.js   # GET /usuarios/:id - positivo (200) + negativo (404, 400)
    ├── usuarios.put.spec.js         # PUT - positivo (200) + negativo (400)
    ├── usuarios.patch.spec.js       # PATCH - positivo (200) + negativo (400)
    ├── usuarios.delete.spec.js      # DELETE - positivo (200) + negativo (400)
    ├── usuarios.cache.spec.js       # Cache Redis: GET repetido com resposta consistente
    └── datadog.spec.js              # DataDog: métrica quando DD_AGENT_URL, skip explícito caso contrário
```

## Cobertura de Testes

| Operação | Arquivo | Positivo | Negativo |
|---|---|---|---|
| POST /usuarios | usuarios.post.spec.js | 201 - criação com sucesso | 400 - campos obrigatórios ausentes; 404 - email duplicado |
| GET /usuarios | usuarios.get-collection.spec.js | 200 - lista retornada | 200 - validação de contrato da estrutura |
| GET /usuarios/:id | usuarios.get-by-id.spec.js | 200 - usuário encontrado | 404 - id inexistente; 400 - id inválido |
| PUT /usuarios/:id | usuarios.put.spec.js | 200 - atualização completa | 400 - id inexistente; 400 - id inválido |
| PATCH /usuarios/:id | usuarios.patch.spec.js | 200 - atualização parcial | 400 - id inexistente; 400 - id inválido |
| DELETE /usuarios/:id | usuarios.delete.spec.js | 200 - exclusão | 400 - id inexistente; 400 - id inválido |
| Cache Redis | usuarios.cache.spec.js | GET repetido com resposta consistente | - |
| DataDog | datadog.spec.js | Métrica enviada ao DD_AGENT_URL | Skip explícito quando não configurado |

## Notas

- Os testes não alteram a API existente — todos os arquivos ficam no diretório `Playwright/`.
- A fixture gera nomes e emails únicos com timestamp para evitar conflitos em execuções repetidas.
- O teste de cache valida que a resposta do segundo GET é consistente com o primeiro (comportamento HIT do Redis).
- O teste de DataDog é condicional: `test.skip()` quando `DD_AGENT_URL` não está definido.
