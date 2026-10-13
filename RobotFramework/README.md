# Testes de API com Robot Framework

Projeto isolado para testar `/usuarios` sem modificar a API. A suíte usa `RequestsLibrary`, gera dados únicos por teste e cobre casos positivos e negativos de POST, GET de coleção, GET por id, PUT, PATCH e DELETE.

## Pré-requisitos

- Python 3.10+;
- API em execução e acessível por `BASE_URL`;
- MongoDB e Redis disponíveis para a API;
- Para a checagem opcional de DataDog, um endpoint local do Agent acessível.

## Instalação

```powershell
cd C:\Users\opah\Pictures\CURSOS\API-s\RobotFramework
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## Execução

```powershell
robot --outputdir results tests
```

A URL padrão é `http://localhost:3333`. Para trocar:

```powershell
$env:BASE_URL = 'http://localhost:3000'
robot --outputdir results tests
```

A suíte cria um usuário novo no setup de cada caso. O e-mail inclui timestamp e UUID; o recurso criado é removido no teardown quando o teste não o removeu antes.

## Cache Redis observável

Não há acesso direto ao Redis nem alteração na API. A validação é comportamental:

- duas chamadas consecutivas de `GET /usuarios` devem produzir o mesmo corpo, evidenciando resposta estável de cache;
- após `PATCH`, um `GET /usuarios/{id}` deve retornar o nome novo, evidenciando invalidação/atualização do cache do recurso;
- a API continua sendo a única fronteira observada pelo teste.

Essa abordagem não afirma qual nó (Redis ou banco) respondeu; ela verifica apenas o contrato observável e a invalidação esperada.

## DataDog

Por padrão, o teste é marcado como `SKIP` com mensagem documentada e não exige DataDog. Para habilitar:

```powershell
$env:CHECK_DATADOG = 'true'
$env:DD_AGENT_URL = 'http://localhost:8126'
robot --outputdir results tests
```

Com `CHECK_DATADOG=true`, `DD_AGENT_URL` é obrigatório: se estiver ausente, o teste falha explicitamente; se estiver presente, a suíte consulta `<DD_AGENT_URL>/info` e exige HTTP 200. Nenhum dado é enviado a serviço externo pelo projeto.

## Verificações

O parse/dry-run pode ser feito sem chamar a API:

```powershell
robot --dryrun tests
```

A execução real exige a API, banco e Redis ativos. Resultados são gravados em `results/`, que é um diretório local de saída e não faz parte dos arquivos do projeto solicitados.
