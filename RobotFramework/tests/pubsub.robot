*** Settings ***
Documentation    Testes de Pub/Sub Redis para cada endpoint da API /usuarios.
Resource         ../resources/api.resource
Suite Setup      Run Keywords    Create API Session    AND    Connect PubSub Subscriber
Suite Teardown   Disconnect PubSub Subscriber
Test Setup       Clear PubSub Events

*** Test Cases ***
POST should publish usuario.created event
    [Tags]    pubsub    post
    ${user}=    Generate Unique User
    ${response}=    POST On Session    api    ${USERS_PATH}    json=${user}    expected_status=any
    Assert Status    ${response}    201
    ${event}=    Wait For PubSub Event    usuario.created
    Should Be Equal    ${event}[type]    usuario.created
    Should Be Equal    ${event}[method]    POST

GET collection should publish usuario.listed event
    [Tags]    pubsub    get
    ${response}=    GET On Session    api    ${USERS_PATH}    expected_status=any
    Assert Status    ${response}    200
    ${event}=    Wait For PubSub Event    usuario.listed
    Should Be Equal    ${event}[type]    usuario.listed
    Should Be Equal    ${event}[method]    GET

GET by id should publish usuario.fetched event
    [Tags]    pubsub    get_id
    ${user}=    Generate Unique User
    ${id}=    Create User    ${user}
    Clear PubSub Events
    ${response}=    Get User By ID    ${id}
    Assert Status    ${response}    200
    ${event}=    Wait For PubSub Event    usuario.fetched
    Should Be Equal    ${event}[type]    usuario.fetched
    Should Be Equal    ${event}[method]    GET
    Should Be Equal    ${event}[id]    ${id}
    Delete User If Created    ${id}

PUT should publish usuario.updated event
    [Tags]    pubsub    put
    ${user}=    Generate Unique User
    ${id}=    Create User    ${user}
    Clear PubSub Events
    ${update}=    Generate Unique User
    ${response}=    PUT On Session    api    ${USERS_PATH}/${id}    json=${update}    expected_status=any
    Assert Status    ${response}    200
    ${event}=    Wait For PubSub Event    usuario.updated
    Should Be Equal    ${event}[type]    usuario.updated
    Should Be Equal    ${event}[method]    PUT
    Should Be Equal    ${event}[id]    ${id}
    Delete User If Created    ${id}

PATCH should publish usuario.patched event
    [Tags]    pubsub    patch
    ${user}=    Generate Unique User
    ${id}=    Create User    ${user}
    Clear PubSub Events
    ${response}=    PATCH On Session    api    ${USERS_PATH}/${id}    json={"nome":"Patched PubSub"}    expected_status=any
    Assert Status    ${response}    200
    ${event}=    Wait For PubSub Event    usuario.patched
    Should Be Equal    ${event}[type]    usuario.patched
    Should Be Equal    ${event}[method]    PATCH
    Should Be Equal    ${event}[id]    ${id}
    Delete User If Created    ${id}

DELETE should publish usuario.deleted event
    [Tags]    pubsub    delete
    ${user}=    Generate Unique User
    ${id}=    Create User    ${user}
    Clear PubSub Events
    ${response}=    DELETE On Session    api    ${USERS_PATH}/${id}    expected_status=any
    Assert Status    ${response}    200
    ${event}=    Wait For PubSub Event    usuario.deleted
    Should Be Equal    ${event}[type]    usuario.deleted
    Should Be Equal    ${event}[method]    DELETE
    Should Be Equal    ${event}[id]    ${id}
