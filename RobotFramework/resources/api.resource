*** Settings ***
Library    RequestsLibrary
Library    OperatingSystem
Library    Collections
Library    String
Library    DateTime
Library    ../libraries/RedisPubSub.py

*** Variables ***
${DEFAULT_BASE_URL}    http://localhost:3333
${USERS_PATH}          /usuarios
${INVALID_ID}          000000000000000000000000

*** Keywords ***
Get Base URL
    ${base_url}=    Get Environment Variable    BASE_URL    ${DEFAULT_BASE_URL}
    ${normalized}=    Evaluate    $base_url.rstrip('/')
    RETURN    ${normalized}

Get Boolean Environment Variable
    [Arguments]    ${name}    ${default}=false
    ${value}=    Get Environment Variable    ${name}    ${default}
    ${normalized}=    Convert To Lower Case    ${value}
    RETURN    ${normalized}

Create API Session
    ${base_url}=    Get Base URL
    Create Session    api    ${base_url}    headers={"Content-Type": "application/json"}

Generate Unique User
    ${stamp}=    Get Current Date    result_format=%Y%m%d%H%M%S%f
    ${suffix}=    Evaluate    str(__import__('uuid').uuid4())[:8]
    ${name}=    Set Variable    Robot User ${stamp}
    ${email}=    Set Variable    robot.${stamp}.${suffix}@example.test
    &{user}=    Create Dictionary    nome=${name}    email=${email}
    RETURN    ${user}

Create User
    [Arguments]    ${user}
    ${response}=    POST On Session    api    ${USERS_PATH}    json=${user}    expected_status=any
    Should Be Equal As Integers    ${response.status_code}    201
    ${body}=    Evaluate    $response.json()
    Dictionary Should Contain Key    ${body}    _id
    RETURN    ${body}[_id]

Assert Status
    [Arguments]    ${response}    ${status}
    Should Be Equal As Integers    ${response.status_code}    ${status}

Get User By ID
    [Arguments]    ${user_id}
    ${response}=    GET On Session    api    ${USERS_PATH}/${user_id}    expected_status=any
    RETURN    ${response}

Delete User If Created
    [Arguments]    ${user_id}
    IF    '${user_id}' != ''
        DELETE On Session    api    ${USERS_PATH}/${user_id}    expected_status=any
    END

Validate Datadog Configuration
    ${check}=    Get Boolean Environment Variable    CHECK_DATADOG
    ${agent_url}=    Get Environment Variable    DD_AGENT_URL
    IF    '${check}' == 'true'
        Should Not Be Empty    ${agent_url}    CHECK_DATADOG=true exige DD_AGENT_URL configurado.
        ${normalized_agent_url}=    Evaluate    $agent_url.rstrip('/')
        ${response}=    GET On Session    api    ${normalized_agent_url}/info    expected_status=any
        Assert Status    ${response}    200
    ELSE
        Skip    DataDog não validado: defina CHECK_DATADOG=true e DD_AGENT_URL para habilitar a verificação.
    END

Connect PubSub Subscriber
    Connect Subscriber

Clear PubSub Events
    Clear Events

Wait For PubSub Event
    [Arguments]    ${event_type}    ${timeout_ms}=5000
    ${event}=    Wait For Event    ${event_type}    ${timeout_ms}
    RETURN    ${event}

Disconnect PubSub Subscriber
    Disconnect Subscriber
