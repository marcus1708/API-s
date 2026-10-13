package com.picpay.restassured;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

class UsuariosApiTest {
    private String createdId;
    private String email;

    @BeforeEach
    void configure() {
        RestAssured.baseURI = TestConfig.baseUrl();
        email = "qa." + UUID.randomUUID() + "@example.com";
    }

    @AfterEach
    void cleanup() {
        if (createdId != null) {
            given().delete("/usuarios/{id}", createdId).then().statusCode(anyOf(is(200), is(204)));
        }
    }

    @Test
    void shouldCreateUserWithPost() {
        createdId = given().contentType(ContentType.JSON).body(userBody())
                .when().post("/usuarios").then().statusCode(201)
                .body("message", not(isEmptyOrNullString()))
                .body("_id", not(isEmptyOrNullString())).extract().path("_id");
    }

    @Test
    void shouldRejectPostWithoutRequiredFields() {
        given().contentType(ContentType.JSON).body("{\"email\":\"invalid\"}")
                .when().post("/usuarios").then().statusCode(anyOf(is(400), is(422)))
                .body("message", not(isEmptyOrNullString()));
    }

    @Test
    void shouldListUsersWithGetCollection() {
        given().when().get("/usuarios").then().statusCode(200)
                .body("usuarios", notNullValue()).body("usuarios", instanceOf(java.util.List.class));
    }

    @Test
    void shouldRejectGetUserWithMalformedId() {
        given().when().get("/usuarios/{id}", "id-inexistente")
                .then().statusCode(anyOf(is(400), is(404)));
    }

    @Test
    void shouldGetCreatedUserById() {
        createUser();
        given().when().get("/usuarios/{id}", createdId).then().statusCode(200)
                .body("_id", equalTo(createdId)).body("email", equalTo(email));
    }

    @Test
    void shouldPutCreatedUser() {
        createUser();
        String updatedEmail = "updated." + UUID.randomUUID() + "@example.com";
        given().contentType(ContentType.JSON).body("{\"nome\":\"Updated\",\"email\":\"" + updatedEmail + "\",\"password\":\"NewPassword123\",\"administrador\":\"false\"}")
                .when().put("/usuarios/{id}", createdId).then().statusCode(200)
                .body("message", not(isEmptyOrNullString()));
        email = updatedEmail;
        given().when().get("/usuarios/{id}", createdId).then().statusCode(200).body("email", equalTo(updatedEmail));
    }

    @Test
    void shouldRejectPutWithInvalidPayload() {
        createUser();
        given().contentType(ContentType.JSON).body("{\"email\":\"not-an-email\"}")
                .when().put("/usuarios/{id}", createdId).then().statusCode(anyOf(is(400), is(422)));
    }

    @Test
    void shouldPatchCreatedUser() {
        createUser();
        given().contentType(ContentType.JSON).body("{\"nome\":\"Patched\"}")
                .when().patch("/usuarios/{id}", createdId).then().statusCode(200)
                .body("message", not(isEmptyOrNullString()));
        given().when().get("/usuarios/{id}", createdId).then().statusCode(200).body("nome", equalTo("Patched"));
    }

    @Test
    void shouldRejectPatchWithEmptyPayload() {
        createUser();
        given().contentType(ContentType.JSON).body("{}")
                .when().patch("/usuarios/{id}", createdId).then().statusCode(anyOf(is(400), is(422)));
    }

    @Test
    void shouldDeleteCreatedUser() {
        createUser();
        given().when().delete("/usuarios/{id}", createdId).then().statusCode(anyOf(is(200), is(204)));
        given().when().get("/usuarios/{id}", createdId).then().statusCode(404);
        createdId = null;
    }

    @Test
    void shouldRejectDeleteWithMalformedId() {
        given().when().delete("/usuarios/{id}", "id-inexistente").then().statusCode(anyOf(is(400), is(404)));
    }

    private void createUser() {
        createdId = given().contentType(ContentType.JSON).body(userBody()).when().post("/usuarios")
                .then().statusCode(201).extract().path("_id");
    }

    private String userBody() {
        return "{\"nome\":\"QA User\",\"email\":\"" + email + "\",\"password\":\"Password123\",\"administrador\":\"false\"}";
    }
}
