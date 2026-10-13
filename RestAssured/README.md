# RestAssured — `/usuarios`

Projeto Maven Java com testes JUnit 5 e Rest Assured para uma API compatível com o contrato de `/usuarios` (por exemplo, ServeRest). O projeto contém apenas arquivos-fonte e manifesto; **nenhuma dependência foi baixada e nenhum teste foi executado nesta entrega**.

## Pré-requisitos

- Java 17 ou superior.
- Maven instalado para executar localmente.
- API disponível em `BASE_URL` (padrão: `http://localhost:3000`).

A propriedade de sistema tem precedência sobre a variável de ambiente:

```powershell
$env:BASE_URL = "http://localhost:3000"
mvn test
# ou
mvn -Dbase.url=http://localhost:3000 test
```

## Cobertura

`UsuariosApiTest` cobre cenários positivos e negativos de:

- `POST /usuarios`
- `GET /usuarios` (coleção)
- `GET /usuarios/{id}`
- `PUT /usuarios/{id}`
- `PATCH /usuarios/{id}`
- `DELETE /usuarios/{id}`

Os testes criam e removem usuários com e-mails aleatórios. Os códigos aceitos nos casos negativos refletem APIs que usam `400` ou `422` para payload inválido e `400` ou `404` para identificador inválido.

## Integrações opcionais

- **Redis:** `RedisBehaviorTest` é pulado com mensagem explícita quando `REDIS_URL` não está configurada. Também aceita `REDIS_HOST` e `REDIS_PORT` (padrão `6379`). Quando configurado, o teste falha se não conseguir executar `PING` e um round-trip observável `SETEX`/`GET`/`DEL`.
- **DataDog:** `DataDogAgentTest` é pulado com mensagem explícita quando `DD_AGENT_URL` está ausente. Quando configurado, consulta `DD_AGENT_URL/info` e exige resposta HTTP 2xx com corpo JSON. Se a URL já terminar em `/info`, ela não é duplicada.

Esses testes não alteram a API; Redis usa uma chave aleatória com TTL e DataDog apenas faz uma requisição GET.
