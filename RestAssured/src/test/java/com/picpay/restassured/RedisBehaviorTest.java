package com.picpay.restassured;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import redis.clients.jedis.Jedis;

import java.time.Duration;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RedisBehaviorTest {
    @Test
    void shouldRoundTripAValueThroughRedis() {
        String redisUrl = TestConfig.redisUrl();
        Assumptions.assumeTrue(!redisUrl.isBlank(), "Redis skipped: configure REDIS_URL (or REDIS_HOST/REDIS_PORT).");
        String key = "restassured:test:" + UUID.randomUUID();
        try (Jedis redis = new Jedis(TestConfig.uri(redisUrl))) {
            assertEquals("PONG", redis.ping());
            assertEquals("OK", redis.setex(key, Duration.ofSeconds(30).toSeconds(), "observable-value"));
            assertEquals("observable-value", redis.get(key));
            assertTrue(redis.del(key) >= 0);
        }
    }
}
