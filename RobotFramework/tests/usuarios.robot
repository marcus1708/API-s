*** Settings ***
Documentation    Testes positivos e negativos da API de usuários.
Resource         ../resources/api.resource
Suite Setup      Create API Session
Test Setup       Reset Test User
Test Teardown    Delete User If Created    ${USER_ID}

*** Variables ***
${USER_ID}
${USER_NAME}
${USER_EMAIL}

*** Keywords ***
Reset Test User
    ${user}=    Generate Unique User
    ${id}=    Create User    ${user}
    Set Suite Variable    ${USER_ID}       ${id}
    Set Suite Variable    ${USER_NAME}     ${user}[nome]
    Set Suite Variable    ${USER_EMAIL}    ${user}[email]

*** Test Cases ***
POST creates a unique user
    [Tags]    post    positive
    ${response}=    POST On Session    api    ${USERS_PATH}    json={"nome":"${USER_NAME} Post","email":"post.${USER_EMAIL}"}    expected_status=any
    Assert Status    ${response}    201

POST rejects missing required fields
    [Tags]    post    negative
    ${response}=    POST On Session    api    ${USERS_PATH}    json={"nome":""}    expected_status=any
    Assert Status    ${response}    400

GET collection returns users and exposes stable cached response
    [Tags]    get-collection    cache    positive
    ${first}=    GET On Session    api    ${USERS_PATH}    expected_status=any
    Assert Status    ${first}    200
    ${second}=    GET On Session    api    ${USERS_PATH}    expected_status=any
    Assert Status    ${second}    200
    Should Be Equal    ${first.text}    ${second.text}

GET collection handles a valid empty query safely
    [Tags]    get-collection    negative
    ${response}=    GET On Session    api    ${USERS_PATH}?invalid_filter=    expected_status=any
    Assert Status    ${response}    200

GET by id returns the created user
    [Tags]    get-id    positive
    ${response}=    Get User By ID    ${USER_ID}
    Assert Status    ${response}    200
    ${body}=    Evaluate    $response.json()
    Should Be Equal    ${body}[usuario][email]    ${USER_EMAIL}

GET by id returns not found for unknown id
    [Tags]    get-id    negative
    ${response}=    Get User By ID    ${INVALID_ID}
    Assert Status    ${response}    404

PUT replaces user data
    [Tags]    put    positive
    ${user}=    Generate Unique User
    ${response}=    PUT On Session    api    ${USERS_PATH}/${USER_ID}    json=${user}    expected_status=any
    Assert Status    ${response}    200
    ${after}=    Get User By ID    ${USER_ID}
    ${body}=    Evaluate    $after.json()
    Should Be Equal    ${body}[usuario][email]    ${user}[email]

PUT rejects unknown user
    [Tags]    put    negative
    ${user}=    Generate Unique User
    ${response}=    PUT On Session    api    ${USERS_PATH}/${INVALID_ID}    json=${user}    expected_status=any
    Assert Status    ${response}    400

PATCH updates partially and invalidates observable cache
    [Tags]    patch    cache    positive
    ${new_name}=    Set Variable    Robot Patched ${USER_ID}
    ${response}=    PATCH On Session    api    ${USERS_PATH}/${USER_ID}    json={"nome":"${new_name}"}    expected_status=any
    Assert Status    ${response}    200
    ${after}=    Get User By ID    ${USER_ID}
    ${body}=    Evaluate    $after.json()
    Should Be Equal    ${body}[usuario][nome]    ${new_name}

PATCH rejects unknown user
    [Tags]    patch    negative
    ${response}=    PATCH On Session    api    ${INVALID_ID}    json={"nome":"invalid"}    expected_status=any
    Assert Status    ${response}    400

DELETE removes the created user
    [Tags]    delete    positive
    ${response}=    DELETE On Session    api    ${USERS_PATH}/${USER_ID}    expected_status=any
    Assert Status    ${response}    200
    ${USER_ID}=    Set Variable
    Set Suite Variable    ${USER_ID}

DELETE returns error for unknown user
    [Tags]    delete    negative
    ${response}=    DELETE On Session    api    ${INVALID_ID}    expected_status=any
    Assert Status    ${response}    400

DataDog check follows explicit opt-in configuration
    [Tags]    datadog    observability
    Validate Datadog Configuration
