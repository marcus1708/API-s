package com.picpay.restassured;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertTrue;

class DataDogAgentTest {
    @Test
    void shouldExposeAgentInfoWhenConfigured() throws Exception {
        String configuredUrl = TestConfig.datadogAgentUrl();
        Assumptions.assumeTrue(!configuredUrl.isBlank(), "DataDog skipped: DD_AGENT_URL is absent.");
        String infoUrl = configuredUrl.endsWith("/info") ? configuredUrl : configuredUrl + "/info";
        HttpRequest request = HttpRequest.newBuilder(URI.create(infoUrl)).timeout(Duration.ofSeconds(5)).GET().build();
        HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
        assertTrue(response.statusCode() >= 200 && response.statusCode() < 300,
                "DataDog Agent /info returned HTTP " + response.statusCode());
        assertTrue(response.body().trim().startsWith("{"), "DataDog Agent /info must return JSON");
    }
}
