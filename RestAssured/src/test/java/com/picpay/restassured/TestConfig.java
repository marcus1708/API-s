package com.picpay.restassured;

import java.net.URI;

final class TestConfig {
    private TestConfig() {}

    static String baseUrl() {
        return value("base.url", "BASE_URL", "http://localhost:3000")
                .replaceAll("/+$", "");
    }

    static String redisUrl() {
        String configured = value("redis.url", "REDIS_URL", "");
        if (!configured.isBlank()) return configured;
        String host = value("redis.host", "REDIS_HOST", "");
        if (host.isBlank()) return "";
        return "redis://" + host + ":" + value("redis.port", "REDIS_PORT", "6379");
    }

    static String datadogAgentUrl() {
        return value("dd.agent.url", "DD_AGENT_URL", "").replaceAll("/+$", "");
    }

    static URI uri(String url) {
        return URI.create(url);
    }

    private static String value(String property, String environment, String fallback) {
        String systemValue = System.getProperty(property);
        if (systemValue != null && !systemValue.isBlank()) return systemValue;
        String environmentValue = System.getenv(environment);
        return environmentValue == null || environmentValue.isBlank() ? fallback : environmentValue;
    }
}
