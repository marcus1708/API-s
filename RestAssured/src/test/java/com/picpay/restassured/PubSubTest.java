package com.picpay.restassured;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.json.JSONObject;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Testes de Pub/Sub Redis — cada endpoint deve publicar um evento
 * no canal 'usuarios:eventos' após operações bem-sucedidas.
 *
 * Eventos esperados:
 *   POST   → usuario.created
 *   GET    → usuario.listed
 *   GET/:id → usuario.fetched
 *   PUT    → usuario.updated
 *   PATCH  → usuario.patched
 *   DELETE → usuario.deleted
 */
class PubSubTest {

    private static PubSubHelper pubsub;
    private String createdId;
    private String email;

    @BeforeAll
    static void initPubSub() {
        String redisUrl = TestConfig.redisUrl();
        if (redisUrl.isBlank()) {
            redisUrl = "redis://localhost:6379";
        }
        String channel = System.getenv().getOrDefault("REDIS_PUBSUB_CHANNEL", "usuarios:eventos");
        pubsub = new PubSubHelper(redisUrl, channel);
        pubsub.connect();
    }

    @AfterAll
    static void closePubSub() {
        if (pubsub != null) {
            pubsub.disconnect();
        }
    }

    @BeforeEach
    void configure() {
        RestAssured.baseURI = TestConfig.baseUrl();
        email = "qa." + UUID.randomUUID() + "@example.com";
        pubsub.clearEvents();
    }

    @AfterEach
    void cleanup() {
        if (createdId != null) {
            try {
                given().delete("/usuarios/{id}", createdId);
            } catch (Exception ignored) {
            }
            createdId = null;
        }
    }

    @Test
    void postShouldPublishUsuarioCreatedEvent() throws InterruptedException {
        createdId = given().contentType(ContentType.JSON).body(userBody())
                .when().post("/usuarios").then().statusCode(201)
                .body("_id", not(isEmptyOrNullString())).extract().path("_id");

        JSONObject event = pubsub.waitForEvent("usuario.created", 5000);
        org.junit.jupiter.api.Assertions.assertEquals("usuario.created", event.getString("type"));
        org.junit.jupiter.api.Assertions.assertEquals("POST", event.getString("method"));
    }

    @Test
    void getCollectionShouldPublishUsuarioListedEvent() throws InterruptedException {
        given().when().get("/usuarios").then().statusCode(200);

        JSONObject event = pubsub.waitForEvent("usuario.listed", 5000);
        org.junit.jupiter.api.Assertions.assertEquals("usuario.listed", event.getString("type"));
        org.junit.jupiter.api.Assertions.assertEquals("GET", event.getString("method"));
    }

    @Test
    void getByIdShouldPublishUsuarioFetchedEvent() throws InterruptedException {
        createUser();
        pubsub.clearEvents();

        given().when().get("/usuarios/{id}", createdId).then().statusCode(200);

        JSONObject event = pubsub.waitForEvent("usuario.fetched", 5000);
        org.junit.jupiter.api.Assertions.assertEquals("usuario.fetched", event.getString("type"));
        org.junit.jupiter.api.Assertions.assertEquals("GET", event.getString("method"));
    }

    @Test
    void putShouldPublishUsuarioUpdatedEvent() throws InterruptedException {
        createUser();
        pubsub.clearEvents();

        String updatedEmail = "updated." + UUID.randomUUID() + "@example.com";
        given().contentType(ContentType.JSON).body(fullBody(updatedEmail))
                .when().put("/usuarios/{id}", createdId).then().statusCode(200);

        JSONObject event = pubsub.waitForEvent("usuario.updated", 5000);
        org.junit.jupiter.api.Assertions.assertEquals("usuario.updated", event.getString("type"));
        org.junit.jupiter.api.Assertions.assertEquals("PUT", event.getString("method"));
    }

    @Test
    void patchShouldPublishUsuarioPatchedEvent() throws InterruptedException {
        createUser();
        pubsub.clearEvents();

        given().contentType(ContentType.JSON).body("{\"nome\":\"Patched PubSub\"}")
                .when().patch("/usuarios/{id}", createdId).then().statusCode(200);

        JSONObject event = pubsub.waitForEvent("usuario.patched", 5000);
        org.junit.jupiter.api.Assertions.assertEquals("usuario.patched", event.getString("type"));
        org.junit.jupiter.api.Assertions.assertEquals("PATCH", event.getString("method"));
    }

    @Test
    void deleteShouldPublishUsuarioDeletedEvent() throws InterruptedException {
        createUser();
        pubsub.clearEvents();

        given().when().delete("/usuarios/{id}", createdId).then().statusCode(anyOf(is(200), is(204)));

        JSONObject event = pubsub.waitForEvent("usuario.deleted", 5000);
        org.junit.jupiter.api.Assertions.assertEquals("usuario.deleted", event.getString("type"));
        org.junit.jupiter.api.Assertions.assertEquals("DELETE", event.getString("method"));

        createdId = null;
    }

    private void createUser() {
        createdId = given().contentType(ContentType.JSON).body(userBody())
                .when().post("/usuarios").then().statusCode(201)
                .extract().path("_id");
    }

    private String userBody() {
        return fullBody(email);
    }

    private String fullBody(String emailAddr) {
        return "{\"nome\":\"QA User\",\"email\":\"" + emailAddr +
                "\",\"endereco\":\"Rua QA\",\"senha\":\"Password123\"}";
    }
}
