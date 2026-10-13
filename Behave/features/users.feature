@usuarios
Feature: CRUD de Usuários — API /usuarios
  Como um testador de QA
  Eu quero exercitar as seis operações CRUD de /usuarios
  Para validar comportamento correto, cache Redis e tracing DataDog

  Background:
    Given a BASE_URL está configurada
    And o cache do Redis está limpo

  # =================== POST /usuarios ===================

  @post @positivo
  Scenario: POST /usuarios — Criar usuário com todos os campos válidos
    Given que não existe usuário com email "behave-{uuid}@teste.com"
    When eu envio POST para "/usuarios" com os dados:
      | nome          | email                   | endereco      | senha     |
      | Usuário Teste | behave-{uuid}@teste.com | Rua Teste 123 | Senha@123 |
    Then o status code da resposta deve ser 201
    And a resposta deve conter o campo "_id"
    And a resposta deve conter a mensagem "Usuario gerado com sucesso"

  @post @negativo
  Scenario: POST /usuarios — Criar sem nome (campo obrigatório)
    When eu envio POST para "/usuarios" com os dados:
      | nome | email                    | endereco      | senha     |
      |      | semnome-{uuid}@teste.com | Rua Teste 123 | Senha@123 |
    Then o status code da resposta deve ser 400
    And a resposta deve conter a mensagem "Nome e Email são obrigatórios"

  @post @negativo
  Scenario: POST /usuarios — Criar sem email (campo obrigatório)
    When eu envio POST para "/usuarios" com os dados:
      | nome              | email | endereco      | senha     |
      | Usuário Sem Email |       | Rua Teste 123 | Senha@123 |
    Then o status code da resposta deve ser 400
    And a resposta deve conter a mensagem "Nome e Email são obrigatórios"

  @post @negativo
  Scenario: POST /usuarios — Criar com email duplicado
    Given existe um usuário cadastrado com email "dup-{uuid}@teste.com" e nome "Usuário Dup" e endereco "Rua Dup 456" e senha "DupSenha@123"
    When eu envio POST para "/usuarios" com os dados:
      | nome              | email                | endereco   | senha        |
      | Usuário Duplicado | dup-{uuid}@teste.com | Rua Dup 456 | DupSenha@123 |
    Then o status code da resposta deve ser 404
    And a resposta deve conter a mensagem "Dados já existentes"

  # =================== GET /usuarios ===================

  @get @positivo
  Scenario: GET /usuarios — Listar todos os usuários
    Given existe um usuário cadastrado com email "lista-{uuid}@teste.com" e nome "Usuário Lista" e endereco "Rua Lista" e senha "ListaSenha@123"
    When eu envio GET para "/usuarios"
    Then o status code da resposta deve ser 200
    And a resposta deve conter a mensagem "Listagem de todos os usuarios realizada"
    And a resposta deve conter o campo "usuarios"

  @get @cache
  Scenario: GET /usuarios — Cache Redis populado no primeiro GET (MISS) e servido no segundo (HIT)
    When eu envio GET para "/usuarios"
    Then o status code da resposta deve ser 200
    And a chave de cache "usuarios:todos" deve existir no Redis
    When eu envio GET para "/usuarios"
    Then o status code da resposta deve ser 200
    And a chave de cache "usuarios:todos" deve existir no Redis

  @get @cache
  Scenario: GET /usuarios — Cache invalidado após POST (dados não-stale)
    When eu envio GET para "/usuarios"
    Then a chave de cache "usuarios:todos" deve existir no Redis
    When eu envio POST para "/usuarios" com os dados:
      | nome          | email                     | endereco    | senha          |
      | Cache Invalid | cachinv-{uuid}@teste.com  | Rua Cache 1 | CacheSenha@123 |
    Then a chave de cache "usuarios:todos" NÃO deve existir no Redis
    When eu envio GET para "/usuarios"
    Then o status code da resposta deve ser 200
    And a resposta deve conter o campo "usuarios"

  # =================== GET /usuarios/:id ===================

  @get_id @positivo
  Scenario: GET /usuarios/:id — Buscar usuário existente
    Given existe um usuário cadastrado com email "busca-{uuid}@teste.com" e nome "Usuário Busca" e endereco "Rua Busca" e senha "BuscaSenha@123"
    When eu envio GET para "/usuarios/ultimo_criado"
    Then o status code da resposta deve ser 200
    And a resposta deve conter a mensagem "Usuario encontrado"
    And a resposta deve conter o campo "usuario"

  @get_id @negativo
  Scenario: GET /usuarios/:id — Buscar com ID inexistente
    When eu envio GET para "/usuarios/000000000000000000000000"
    Then o status code da resposta deve ser 404
    And a resposta deve conter a mensagem "Usuario nao encontrado"

  @get_id @cache
  Scenario: GET /usuarios/:id — Cache individual populado após primeiro GET
    Given existe um usuário cadastrado com email "idcache-{uuid}@teste.com" e nome "Usuário ID Cache" e endereco "Rua ID Cache" e senha "IDCacheSenha@123"
    When eu envio GET para "/usuarios/ultimo_criado"
    Then a chave de cache "usuario:ultimo_criado" deve existir no Redis

  # =================== PUT /usuarios/:id ===================

  @put @positivo
  Scenario: PUT /usuarios/:id — Atualizar usuário existente (todos os campos)
    Given existe um usuário cadastrado com email "put-{uuid}@teste.com" e nome "Usuário PUT" e endereco "Rua PUT" e senha "PutSenha@123"
    When eu envio PUT para "/usuarios/ultimo_criado" com os dados:
      | nome                   | email              | endereco     | senha            |
      | Usuário PUT Atualizado | put-{uuid}@teste.com | Rua PUT Nova | NovaPutSenha@123 |
    Then o status code da resposta deve ser 200
    And a resposta deve conter a mensagem "Dados do usuario atualizados"

  @put @negativo
  Scenario: PUT /usuarios/:id — Atualizar com ID inexistente
    When eu envio PUT para "/usuarios/000000000000000000000000" com os dados:
      | nome        | email                 | endereco | senha |
      | Inexistente | inexistente@teste.com | Rua X    | 123   |
    Then o status code da resposta deve ser 400
    And a resposta deve conter a mensagem "Usuario nao atualizado"

  @put @cache
  Scenario: PUT /usuarios/:id — Invalida cache individual após atualização
    Given existe um usuário cadastrado com email "putcache-{uuid}@teste.com" e nome "Usuário PUT Cache" e endereco "Rua PUT Cache" e senha "PutCacheSenha@123"
    When eu envio GET para "/usuarios/ultimo_criado"
    Then a chave de cache "usuario:ultimo_criado" deve existir no Redis
    When eu envio PUT para "/usuarios/ultimo_criado" com os dados:
      | nome                      | email                       | endereco          | senha               |
      | Usuário PUT Cache Atualiz | putcache-{uuid}@teste.com   | Rua PUT Cache Nova | NovaPutCache@123    |
    Then a chave de cache "usuario:ultimo_criado" NÃO deve existir no Redis

  # =================== PATCH /usuarios/:id ===================

  @patch @positivo
  Scenario: PATCH /usuarios/:id — Atualização parcial de usuário existente
    Given existe um usuário cadastrado com email "patch-{uuid}@teste.com" e nome "Usuário PATCH" e endereco "Rua PATCH" e senha "PatchSenha@123"
    When eu envio PATCH para "/usuarios/ultimo_criado" com os dados:
      | nome                     |
      | Usuário PATCH Atualizado |
    Then o status code da resposta deve ser 200
    And a resposta deve conter a mensagem "Dados do usuario atualizados"

  @patch @negativo
  Scenario: PATCH /usuarios/:id — Atualização parcial com ID inexistente
    When eu envio PATCH para "/usuarios/000000000000000000000000" com os dados:
      | nome        |
      | Inexistente |
    Then o status code da resposta deve ser 400
    And a resposta deve conter a mensagem "Usuario nao atualizado"

  # =================== DELETE /usuarios/:id ===================

  @delete @positivo
  Scenario: DELETE /usuarios/:id — Excluir usuário existente
    Given existe um usuário cadastrado com email "del-{uuid}@teste.com" e nome "Usuário DELETE" e endereco "Rua DELETE" e senha "DelSenha@123"
    When eu envio DELETE para "/usuarios/ultimo_criado"
    Then o status code da resposta deve ser 200
    And a resposta deve conter a mensagem "Usuario excluído"
    And a chave de cache "usuarios:todos" NÃO deve existir no Redis

  @delete @negativo
  Scenario: DELETE /usuarios/:id — Excluir com ID inexistente
    When eu envio DELETE para "/usuarios/000000000000000000000000"
    Then o status code da resposta deve ser 400
    And a resposta deve conter a mensagem "Usuario nao deletado"

  # =================== DataDog (opcional) ===================

  @datadog
  Scenario: DataDog — Agent acessível e recebendo traces
    Given o endpoint do DataDog Agent está configurado
    When eu verifico a saúde do DataDog Agent
    Then o DataDog Agent deve responder com status saudável

  # =================== Pub/Sub Redis ===================

  @pubsub @post
  Scenario: POST /usuarios — Publica evento usuario.created no canal Redis
    Given o subscriber PubSub está conectado ao canal "usuarios:eventos"
    And que não existe usuário com email "pubsub-{uuid}@teste.com"
    When eu envio POST para "/usuarios" com os dados:
      | nome          | email                    | endereco      | senha     |
      | PubSub Test   | pubsub-{uuid}@teste.com  | Rua PubSub 1  | Senha@123 |
    Then o status code da resposta deve ser 201
    And o evento "usuario.created" deve ser recebido no PubSub

  @pubsub @get
  Scenario: GET /usuarios — Publica evento usuario.listed no canal Redis
    Given o subscriber PubSub está conectado ao canal "usuarios:eventos"
    And os eventos PubSub foram limpos
    When eu envio GET para "/usuarios"
    Then o status code da resposta deve ser 200
    And o evento "usuario.listed" deve ser recebido no PubSub

  @pubsub @get_id
  Scenario: GET /usuarios/:id — Publica evento usuario.fetched no canal Redis
    Given o subscriber PubSub está conectado ao canal "usuarios:eventos"
    And existe um usuário cadastrado com email "fetch-{uuid}@teste.com" e nome "Usuário Fetch" e endereco "Rua Fetch" e senha "FetchSenha@123"
    And os eventos PubSub foram limpos
    When eu envio GET para "/usuarios/ultimo_criado"
    Then o status code da resposta deve ser 200
    And o evento "usuario.fetched" deve ser recebido no PubSub

  @pubsub @put
  Scenario: PUT /usuarios/:id — Publica evento usuario.updated no canal Redis
    Given o subscriber PubSub está conectado ao canal "usuarios:eventos"
    And existe um usuário cadastrado com email "putpub-{uuid}@teste.com" e nome "Usuário PUT PubSub" e endereco "Rua PUT PubSub" e senha "PutPubSenha@123"
    And os eventos PubSub foram limpos
    When eu envio PUT para "/usuarios/ultimo_criado" com os dados:
      | nome              | email                       | endereco          | senha            |
      | PUT PubSub Up     | putpub-{uuid}@teste.com     | Rua PUT PubSub Up | NewPutPub@123    |
    Then o status code da resposta deve ser 200
    And o evento "usuario.updated" deve ser recebido no PubSub

  @pubsub @patch
  Scenario: PATCH /usuarios/:id — Publica evento usuario.patched no canal Redis
    Given o subscriber PubSub está conectado ao canal "usuarios:eventos"
    And existe um usuário cadastrado com email "patchpub-{uuid}@teste.com" e nome "Usuário PATCH PubSub" e endereco "Rua PATCH PubSub" e senha "PatchPubSenha@123"
    And os eventos PubSub foram limpos
    When eu envio PATCH para "/usuarios/ultimo_criado" com os dados:
      | nome                |
      | PATCH PubSub Up     |
    Then o status code da resposta deve ser 200
    And o evento "usuario.patched" deve ser recebido no PubSub

  @pubsub @delete
  Scenario: DELETE /usuarios/:id — Publica evento usuario.deleted no canal Redis
    Given o subscriber PubSub está conectado ao canal "usuarios:eventos"
    And existe um usuário cadastrado com email "delpub-{uuid}@teste.com" e nome "Usuário DEL PubSub" e endereco "Rua DEL PubSub" e senha "DelPubSenha@123"
    And os eventos PubSub foram limpos
    When eu envio DELETE para "/usuarios/ultimo_criado"
    Then o status code da resposta deve ser 200
    And o evento "usuario.deleted" deve ser recebido no PubSub
