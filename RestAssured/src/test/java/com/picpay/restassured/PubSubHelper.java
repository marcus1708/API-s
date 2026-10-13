package com.picpay.restassured;

import org.json.JSONObject;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPubSub;

import java.util.ArrayList;
import java.util.List;

/**
 * Helper para validar Pub/Sub Redis nos testes do RestAssured.
 *
 * Cria um subscriber dedicado que assina o canal 'usuarios:eventos',
 * captura eventos publicados pela API e expõe métodos para verificar
 * se um evento específico foi recebido dentro de um timeout.
 */
public class PubSubHelper {

    private final String redisUrl;
    private final String channel;
    private Jedis subscriberJedis;
    private Thread listenerThread;
    private final List<JSONObject> receivedEvents = new ArrayList<>();
    private volatile boolean running = false;

    public PubSubHelper(String redisUrl, String channel) {
        this.redisUrl = redisUrl;
        this.channel = channel;
    }

    public void connect() {
        if (running) return;
        subscriberJedis = new Jedis(TestConfig.uri(redisUrl));
        running = true;

        JedisPubSub pubSub = new JedisPubSub() {
            @Override
            public void onMessage(String channel, String message) {
                try {
                    JSONObject event = new JSONObject(message);
                    synchronized (receivedEvents) {
                        receivedEvents.add(event);
                    }
                } catch (Exception e) {
                    // ignora mensagem inválida
                }
            }
        };

        listenerThread = new Thread(() -> {
            try {
                subscriberJedis.subscribe(pubSub, channel);
            } catch (Exception e) {
                if (running) {
                    System.err.println("❌ Erro no subscriber: " + e.getMessage());
                }
            }
        });
        listenerThread.setDaemon(true);
        listenerThread.start();
    }

    public void clearEvents() {
        synchronized (receivedEvents) {
            receivedEvents.clear();
        }
    }

    public JSONObject waitForEvent(String type, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            synchronized (receivedEvents) {
                for (JSONObject event : receivedEvents) {
                    if (type.equals(event.optString("type"))) {
                        return event;
                    }
                }
            }
            Thread.sleep(100);
        }
        synchronized (receivedEvents) {
            throw new AssertionError(
                "Evento '" + type + "' não recebido em " + timeoutMs + "ms. " +
                "Eventos capturados: " + receivedEvents
            );
        }
    }

    public void disconnect() {
        running = false;
        if (subscriberJedis != null) {
            subscriberJedis.close();
        }
        if (listenerThread != null) {
            listenerThread.interrupt();
        }
    }
}
