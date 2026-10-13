"""
Steps Behave para a suíte de testes da API /usuarios.

Cobertura:
  - POST   /usuarios          (positivo + 3 negativos)
  - GET    /usuarios          (positivo + cache MISS/HIT + invalidação pós-POST)
  - GET    /usuarios/:id      (positivo + negativo + cache individual)
  - PUT    /usuarios/:id      (positivo + negativo + invalidação de cache)
  - PATCH  /usuarios/:id      (positivo + negativo)
  - DELETE /usuarios/:id      (positivo + negativo)
  - DataDog Agent             (opcional, skip explícito sem DD_AGENT_URL)

Placeholders dinâmicos nos .feature:
  {uuid}          — substituído por um UUID curto único por cenário
  ultimo_criado   — substituído pelo _id do último usuário criado no cenário
"""

import os
import time
import json
import uuid as uuid_lib
import threading

import requests
import redis
from behave import given, when, then


# ============================================================
# Helpers
# ============================================================

def _base_url(context):
    """Retorna a BASE_URL configurada (env ou contexto)."""
    return getattr(context, "base_url", None) or os.environ.get(
        "BASE_URL", "http://localhost:3333"
    )


def _redis_client(context):
    """Cria (lazy) e retorna o cliente Redis para inspeção de cache."""
    if not hasattr(context, "_redis_cli") or context._redis_cli is None:
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        context._redis_cli = redis.from_url(redis_url, decode_responses=True)
    return context._redis_cli


def _pubsub_client(context):
    """Cria (lazy) e retorna um cliente Redis PubSub dedicado."""
    if not hasattr(context, "_pubsub_cli") or context._pubsub_cli is None:
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        context._pubsub_cli = redis.from_url(redis_url, decode_responses=True)
        context._pubsub_received = []
        context._pubsub_lock = threading.Lock()
        context._pubsub_connected = False
    return context._pubsub_cli


def _scenario_uuid(context):
    """Gera um UUID curto único por cenário (resetado no Background)."""
    if not getattr(context, "_scenario_uuid", None):
        context._scenario_uuid = uuid_lib.uuid4().hex[:8]
    return context._scenario_uuid


def _resolve(context, text):
    """Substitui placeholders dinâmicos no texto: {uuid} e ultimo_criado."""
    if text is None:
        return None
    text = text.replace("{uuid}", _scenario_uuid(context))
    last_id = getattr(context, "last_created_id", None)
    if last_id:
        text = text.replace("ultimo_criado", last_id)
    return text


def _send(context, method, path, json_body=None):
    """Envia requisição HTTP e armazena a resposta em context.response."""
    url = f"{_base_url(context)}{_resolve(context, path)}"
    context.response = requests.request(method, url, json=json_body, timeout=15)
    return context.response


def _body_from_table(context):
    """Constrói um dict a partir da primeira linha da tabela do step."""
    row = context.table[0]
    return {
        heading: _resolve(context, row[heading])
        for heading in context.table.headings
    }


def _track_created_id(context, response):
    """Se a resposta de POST contiver _id, rastreia-o para cleanup."""
    if response.status_code == 201:
        try:
            uid = response.json().get("_id")
            if uid:
                context.last_created_id = uid
                if not hasattr(context, "created_user_ids"):
                    context.created_user_ids = []
                context.created_user_ids.append(uid)
        except (ValueError, KeyError):
            pass


# ============================================================
# Background — setup de cada cenário
# ============================================================

@given('a BASE_URL está configurada')
def step_base_url(context):
    context.base_url = os.environ.get("BASE_URL", "http://localhost:3333")
    # Reseta estado dinâmico do cenário
    context._scenario_uuid = None
    context.last_created_id = None
    context.created_user_ids = []
    # Verifica conectividade com a API
    try:
        requests.get(f"{context.base_url}/usuarios", timeout=10)
    except requests.exceptions.ConnectionError:
        raise AssertionError(
            f"API não acessível em {context.base_url}. "
            "Inicie a API com 'npm run dev' e certifique-se de que "
            "MongoDB e Redis estão rodando."
        )


@given('o cache do Redis está limpo')
def step_clean_cache(context):
    r = _redis_client(context)
    r.delete("usuarios:todos")
    for key in r.scan_iter("usuario:*"):
        r.delete(key)


# ============================================================
# POST /usuarios
# ============================================================

@given('que não existe usuário com email "{email}"')
def step_ensure_no_user(context, email):
    email = _resolve(context, email)
    # Lista usuários e remove se o email já existir
    r = requests.get(f"{_base_url(context)}/usuarios", timeout=15)
    if r.status_code == 200:
        body = r.json()
        for u in body.get("usuarios", []):
            if u.get("email") == email:
                uid = u.get("_id") or u.get("id")
                if uid:
                    requests.delete(
                        f"{_base_url(context)}/usuarios/{uid}", timeout=15
                    )
                break
    # Limpa cache após potencial deleção
    _redis_client(context).delete("usuarios:todos")


@given(
    'existe um usuário cadastrado com email "{email}" '
    'e nome "{nome}" e endereco "{endereco}" e senha "{senha}"'
)
def step_create_user_setup(context, email, nome, endereco, senha):
    body = {
        "nome": _resolve(context, nome),
        "email": _resolve(context, email),
        "endereco": _resolve(context, endereco),
        "senha": _resolve(context, senha),
    }
    r = requests.post(f"{_base_url(context)}/usuarios", json=body, timeout=15)
    assert r.status_code == 201, (
        f"Falha ao criar usuário de setup: {r.status_code} — {r.text}"
    )
    _track_created_id(context, r)


@when('eu envio POST para "{path}" com os dados')
def step_post(context, path):
    body = _body_from_table(context)
    r = _send(context, "POST", path, json_body=body)
    _track_created_id(context, r)


# ============================================================
# GET
# ============================================================

@when('eu envio GET para "{path}"')
def step_get(context, path):
    _send(context, "GET", path)


# ============================================================
# PUT
# ============================================================

@when('eu envio PUT para "{path}" com os dados')
def step_put(context, path):
    body = _body_from_table(context)
    _send(context, "PUT", path, json_body=body)


# ============================================================
# PATCH
# ============================================================

@when('eu envio PATCH para "{path}" com os dados')
def step_patch(context, path):
    body = _body_from_table(context)
    _send(context, "PATCH", path, json_body=body)


# ============================================================
# DELETE
# ============================================================

@when('eu envio DELETE para "{path}"')
def step_delete(context, path):
    _send(context, "DELETE", path)


# ============================================================
# Assertions — status code
# ============================================================

@then('o status code da resposta deve ser {expected_code:d}')
def step_assert_status(context, expected_code):
    actual = context.response.status_code
    assert actual == expected_code, (
        f"Status esperado {expected_code}, recebido {actual} "
        f"— body: {context.response.text}"
    )


# ============================================================
# Assertions — mensagem e campo na resposta JSON
# ============================================================

@then('a resposta deve conter a mensagem "{message}"')
def step_assert_message(context, message):
    body = context.response.json()
    actual = body.get("message")
    assert actual == message, (
        f"Mensagem esperada '{message}', recebida '{actual}' — body: {body}"
    )


@then('a resposta deve conter o campo "{field}"')
def step_assert_field(context, field):
    body = context.response.json()
    assert field in body, f"Campo '{field}' ausente na resposta — body: {body}"


# ============================================================
# Assertions — cache Redis
# ============================================================

@then('a chave de cache "{key}" deve existir no Redis')
def step_assert_cache_exists(context, key):
    key = _resolve(context, key)
    exists = _redis_client(context).exists(key)
    assert exists, f"Chave de cache '{key}' deveria existir no Redis"


@then('a chave de cache "{key}" NÃO deve existir no Redis')
def step_assert_cache_not_exists(context, key):
    key = _resolve(context, key)
    exists = _redis_client(context).exists(key)
    assert not exists, (
        f"Chave de cache '{key}' não deveria existir no Redis"
    )


# ============================================================
# DataDog — opcional, skip explícito sem DD_AGENT_URL
# ============================================================

@given('o endpoint do DataDog Agent está configurado')
def step_dd_configured(context):
    dd_url = os.environ.get("DD_AGENT_URL", "").strip()
    if not dd_url:
        context.scenario.skip(
            "DD_AGENT_URL não configurado — testes de DataDog pulados"
        )
        return
    context.dd_agent_url = dd_url.rstrip("/")


@when('eu verifico a saúde do DataDog Agent')
def step_dd_health(context):
    if not hasattr(context, "dd_agent_url"):
        return  # cenário já pulado
    try:
        context.dd_response = requests.get(
            f"{context.dd_agent_url}/info", timeout=5
        )
    except requests.exceptions.RequestException as e:
        context.dd_response = None
        context.dd_error = str(e)


@then('o DataDog Agent deve responder com status saudável')
def step_dd_healthy(context):
    if not hasattr(context, "dd_agent_url"):
        return  # cenário já pulado
    assert hasattr(context, "dd_response") and context.dd_response is not None, (
        f"DataDog Agent não respondeu — erro: {getattr(context, 'dd_error', 'N/A')}"
    )
    r = context.dd_response
    assert r.status_code == 200, (
        f"DataDog Agent indisponível — status {r.status_code}"
    )


# ============================================================
# Pub/Sub Redis — validação de eventos por endpoint
# ============================================================

@given('o subscriber PubSub está conectado ao canal "{channel}"')
def step_pubsub_connect(context, channel):
    cli = _pubsub_client(context)
    if context._pubsub_connected:
        return
    context._pubsub_channel = channel
    pubsub = cli.pubsub()
    pubsub.subscribe(channel)

    def _listen():
        for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    event = json.loads(message["data"])
                    with context._pubsub_lock:
                        context._pubsub_received.append(event)
                except (json.JSONDecodeError, TypeError):
                    pass

    thread = threading.Thread(target=_listen, daemon=True)
    thread.start()
    context._pubsub_connected = True


@given('os eventos PubSub foram limpos')
def step_pubsub_clear(context):
    if hasattr(context, "_pubsub_received"):
        with context._pubsub_lock:
            context._pubsub_received.clear()


@then('o evento "{event_type}" deve ser recebido no PubSub')
def step_pubsub_wait_event(context, event_type):
    timeout_ms = 5000
    deadline = time.time() + (timeout_ms / 1000.0)
    while time.time() < deadline:
        with context._pubsub_lock:
            for event in context._pubsub_received:
                if event.get("type") == event_type:
                    assert event.get("method") is not None, (
                        f"Evento '{event_type}' recebido sem campo 'method'"
                    )
                    return
        time.sleep(0.1)
    with context._pubsub_lock:
        captured = list(context._pubsub_received)
    raise AssertionError(
        f"Evento '{event_type}' não recebido em {timeout_ms}ms. "
        f"Eventos capturados: {captured}"
    )
