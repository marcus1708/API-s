# Suíte de Testes Behave — API /usuarios

Suíte de testes BDD em Python (Behave) para a API REST de gerenciamento de usuários
(Node.js + Express + MongoDB + Redis + DataDog dd-trace).

## Pré-requisitos

- **Python 3.8+**
- **API rodando** — `npm run dev` na raiz do projeto (porta padrão 3333)
- **MongoDB** acessível (configurado em `.env` → `MONGO_URL`)
- **Redis** acessível (configurado em `.env` → `REDIS_URL`)

## Instalação

```bash
cd Behave
pip install -r requirements.txt
```

## Variáveis de ambiente

| Variável       | Padrão                     | Descrição                                              |
|----------------|----------------------------|--------------------------------------------------------|
| `BASE_URL`     | `http://localhost:3333`    | URL base da API sob teste                               |
| `REDIS_URL`    | `redis://localhost:6379`   | URL do Redis (deve ser o mesmo que a API usa)          |
| `DD_AGENT_URL` | _(vazio)_                  | URL do DataDog Agent (ex: `http://localhost:8126`). Se ausente, cenários de DataDog são pulados com skip explícito. |

Exemplo:

```bash
# Linux/macOS
export BASE_URL=http://localhost:3333
export REDIS_URL=redis://localhost:6379
export DD_AGENT_URL=http://localhost:8126

# Windows (PowerShell)
$env:BASE_URL="http://localhost:3333"
$env:REDIS_URL="redis://localhost:6379"
$env:DD_AGENT_URL="http://localhost:8126"
```

## Como rodar

```bash
# Todos os cenários
behave

# Apenas POST
behave --tags=@post

# Apenas cenários positivos
behave --tags=@positivo

# Apenas cenários negativos
behave --tags=@negativo

# Apenas cache Redis
behave --tags=@cache

# Pular DataDog (padrão se DD_AGENT_URL não definido)
behave --tags=~@datadog

# Output em JUnit
behave --junit --junit-directory=reports
```

## Estrutura

```
Behave/
├── requirements.txt          # Dependências pinadas
├── README.md                 # Este arquivo
└── features/
    ├── users.feature         # 17 cenários Gherkin (6 operações + cache + DataDog)
    └── steps/
        └── steps.py          # Implementação dos steps
```

## Cenários cobertos

| Operação        | Positivo | Negativo | Cache | Total |
|-----------------|----------|----------|-------|-------|
| POST /usuarios  | 1        | 3        | —     | 4     |
| GET /usuarios   | 1        | —        | 2     | 3     |
| GET /usuarios/:id | 1      | 1        | 1     | 3     |
| PUT /usuarios/:id | 1      | 1        | 1     | 3     |
| PATCH /usuarios/:id | 1    | 1        | —     | 2     |
| DELETE /usuarios/:id | 1   | 1        | —     | 2     |
| DataDog         | —        | —        | —     | 1     |
| **Total**       | **6**    | **7**    | **4** | **18** |

### Detalhamento por operação

**POST /usuarios**
- Positivo: criar com todos os campos → 201
- Negativo: sem nome → 400 "Nome e Email são obrigatórios"
- Negativo: sem email → 400 "Nome e Email são obrigatórios"
- Negativo: email duplicado → 404 "Dados já existentes"

> Nota: a API retorna **404** (não 409) para email duplicado — comportamento
> confirmado em `UsuarioController.js:26-28`.

**GET /usuarios**
- Positivo: listar todos → 200 com `usuarios`
- Cache: primeiro GET popula `usuarios:todos` (MISS); segundo GET serve do cache (HIT)
- Cache: POST invalida `usuarios:todos`; GET subsequente busca dados atualizados

**GET /usuarios/:id**
- Positivo: buscar existente → 200 "Usuario encontrado"
- Negativo: ID inexistente → 404 "Usuario nao encontrado"
- Cache: primeiro GET popula `usuario:{id}` (TTL 300s)

**PUT /usuarios/:id**
- Positivo: atualizar todos os campos → 200 "Dados do usuario atualizados"
- Negativo: ID inexistente → 400 "Usuario nao atualizado"
- Cache: invalida `usuario:{id}` após atualização

**PATCH /usuarios/:id**
- Positivo: atualização parcial → 200 "Dados do usuario atualizados"
- Negativo: ID inexistente → 400 "Usuario nao atualizado"

**DELETE /usuarios/:id**
- Positivo: excluir existente → 200 "Usuario excluído"; invalida cache `usuarios:todos`
- Negativo: ID inexistente → 400 "Usuario nao deletado"

**DataDog (opcional)**
- Verifica que o Agent responde em `{DD_AGENT_URL}/info` com status 200
- Skip explícito quando `DD_AGENT_URL` não está definida

## Dados únicos

Cada cenário gera emails únicos usando o placeholder `{uuid}`, substituído
por um UUID curto (8 chars) gerado uma vez por cenário. Isso evita conflitos
entre execuções e garante isolamento entre cenários.

O placeholder `ultimo_criado` nos paths é substituído pelo `_id` do último
usuário criado dentro do cenário (via POST ou step de setup).

## Comportamento de cache testado

A API usa Redis como cache com dois padrões:

| Chave              | TTL  | Operação que popula      | Operação que invalida         |
|--------------------|------|--------------------------|-------------------------------|
| `usuarios:todos`   | 60s  | GET /usuarios            | POST, PUT, PATCH, DELETE      |
| `usuario:{id}`     | 300s | GET /usuarios/:id        | PUT, PATCH, DELETE            |

A suíte verifica:
1. **MISS → populate**: primeiro GET não encontra cache, consulta Mongo, armazena no Redis
2. **HIT**: segundo GET encontra cache e retorna diretamente
3. **Invalidação**: POST/PUT/PATCH/DELETE removem as chaves de cache correspondentes
4. **Não-stale**: após invalidação, GET retorna dados atualizados do Mongo

A inspeção do Redis é feita diretamente via cliente `redis` Python (mesma URL da API),
garantindo verificação determinística do estado do cache.
