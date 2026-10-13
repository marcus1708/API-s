"""
Biblioteca customizada para Robot Framework que valida Pub/Sub Redis.

Cria um subscriber dedicado que assina o canal 'usuarios:eventos',
captura eventos publicados pela API e expõe keywords para:
  - Conectar o subscriber
  - Limpar eventos capturados
  - Aguardar e validar um evento específico
  - Desconectar o subscriber
"""

import json
import os
import time
import threading

import redis


REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
REDIS_PUBSUB_CHANNEL = os.environ.get("REDIS_PUBSUB_CHANNEL", "usuarios:eventos")


class RedisPubSub:
    def __init__(self):
        self._client = None
        self._pubsub = None
        self._events = []
        self._lock = threading.Lock()
        self._connected = False

    def connect_subscriber(self):
        """Conecta um subscriber Redis dedicado e assina o canal."""
        if self._connected:
            return
        self._client = redis.from_url(REDIS_URL, decode_responses=True)
        self._pubsub = self._client.pubsub()
        self._pubsub.subscribe(REDIS_PUBSUB_CHANNEL)
        self._connected = True
        # Thread para consumir mensagens
        self._thread = threading.Thread(target=self._listen, daemon=True)
        self._thread.start()

    def _listen(self):
        for message in self._pubsub.listen():
            if message["type"] == "message":
                try:
                    event = json.loads(message["data"])
                    with self._lock:
                        self._events.append(event)
                except (json.JSONDecodeError, TypeError):
                    pass

    def clear_events(self):
        """Limpa todos os eventos capturados."""
        with self._lock:
            self._events.clear()

    def wait_for_event(self, event_type, timeout_ms=5000):
        """Aguarda e retorna o primeiro evento do tipo especificado."""
        deadline = time.time() + (timeout_ms / 1000.0)
        while time.time() < deadline:
            with self._lock:
                for event in self._events:
                    if event.get("type") == event_type:
                        return event
            time.sleep(0.1)
        with self._lock:
            captured = list(self._events)
        raise AssertionError(
            f"Evento '{event_type}' não recebido em {timeout_ms}ms. "
            f"Eventos capturados: {captured}"
        )

    def disconnect_subscriber(self):
        """Desconecta o subscriber."""
        if self._pubsub:
            self._pubsub.unsubscribe()
            self._pubsub.close()
        if self._client:
            self._client.close()
        self._connected = False
