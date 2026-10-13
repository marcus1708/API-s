/// <reference types="cypress" />

/**
 * Suite de testes de Pub/Sub Redis para cada endpoint da API.
 *
 * Cada teste:
 *   1. Limpa eventos capturados (cy.task('clearEvents'))
 *   2. Faz a chamada HTTP à API
 *   3. Verifica se o evento Redis correto foi publicado no canal
 *      usuarios:eventos (cy.task('waitForEvent'))
 *
 * Premissas:
 *   - Redis acessível via REDIS_URL (padrão redis://localhost:6379)
 *   - API rodando em BASE_URL (padrão http://localhost:3333)
 *   - Canal configurável via REDIS_PUBSUB_CHANNEL (padrão usuarios:eventos)
 */

const USERS_ENDPOINT = Cypress.env('usersEndpoint') || '/usuarios';

function uniqueEmail() {
    const stamp = Date.now();
    const rand = Math.floor(Math.random() * 100000);
    return `user_${stamp}_${rand}@test.com`;
}

function buildUser(overrides = {}) {
    return Object.assign(
        {
            nome: `Usuario Teste ${Date.now()}`,
            email: uniqueEmail(),
            endereco: 'Rua de Teste, 123',
            senha: `Pwd@${Date.now()}`
        },
        overrides
    );
}

describe('Pub/Sub Redis — validação de eventos por endpoint', () => {
    after(() => {
        cy.task('closeSubscriber');
    });

    describe('POST /usuarios → usuario.created', () => {
        it('should publish usuario.created event after creating a user', () => {
            const payload = buildUser();
            cy.task('clearEvents');
            cy.request('POST', USERS_ENDPOINT, payload).then((res) => {
                expect(res.status).to.eq(201);
                const id = res.body._id;
                cy.task('waitForEvent', { type: 'usuario.created', timeoutMs: 5000 }).then((event) => {
                    expect(event.type).to.eq('usuario.created');
                    expect(event.method).to.eq('POST');
                    expect(event.id).to.eq(id);
                });
                // Limpeza
                cy.request('DELETE', `${USERS_ENDPOINT}/${id}`);
            });
        });
    });

    describe('GET /usuarios → usuario.listed', () => {
        it('should publish usuario.listed event on cache miss', () => {
            cy.task('clearEvents');
            cy.request('GET', USERS_ENDPOINT).then((res) => {
                expect(res.status).to.eq(200);
                cy.task('waitForEvent', { type: 'usuario.listed', timeoutMs: 5000 }).then((event) => {
                    expect(event.type).to.eq('usuario.listed');
                    expect(event.method).to.eq('GET');
                });
            });
        });
    });

    describe('GET /usuarios/:id → usuario.fetched', () => {
        it('should publish usuario.fetched event on cache miss', () => {
            const payload = buildUser();
            cy.request('POST', USERS_ENDPOINT, payload).then((create) => {
                const id = create.body._id;
                cy.task('clearEvents');
                cy.request('GET', `${USERS_ENDPOINT}/${id}`).then((res) => {
                    expect(res.status).to.eq(200);
                    cy.task('waitForEvent', { type: 'usuario.fetched', timeoutMs: 5000 }).then((event) => {
                        expect(event.type).to.eq('usuario.fetched');
                        expect(event.method).to.eq('GET');
                        expect(event.id).to.eq(id);
                    });
                    // Limpeza
                    cy.request('DELETE', `${USERS_ENDPOINT}/${id}`);
                });
            });
        });
    });

    describe('PUT /usuarios/:id → usuario.updated', () => {
        it('should publish usuario.updated event after PUT', () => {
            const payload = buildUser();
            cy.request('POST', USERS_ENDPOINT, payload).then((create) => {
                const id = create.body._id;
                const update = buildUser({ nome: 'Nome Atualizado PUT PubSub' });
                cy.task('clearEvents');
                cy.request('PUT', `${USERS_ENDPOINT}/${id}`, update).then((res) => {
                    expect(res.status).to.eq(200);
                    cy.task('waitForEvent', { type: 'usuario.updated', timeoutMs: 5000 }).then((event) => {
                        expect(event.type).to.eq('usuario.updated');
                        expect(event.method).to.eq('PUT');
                        expect(event.id).to.eq(id);
                    });
                    // Limpeza
                    cy.request('DELETE', `${USERS_ENDPOINT}/${id}`);
                });
            });
        });
    });

    describe('PATCH /usuarios/:id → usuario.patched', () => {
        it('should publish usuario.patched event after PATCH', () => {
            const payload = buildUser();
            cy.request('POST', USERS_ENDPOINT, payload).then((create) => {
                const id = create.body._id;
                cy.task('clearEvents');
                cy.request('PATCH', `${USERS_ENDPOINT}/${id}`, { nome: 'Nome Patchado PubSub' }).then((res) => {
                    expect(res.status).to.eq(200);
                    cy.task('waitForEvent', { type: 'usuario.patched', timeoutMs: 5000 }).then((event) => {
                        expect(event.type).to.eq('usuario.patched');
                        expect(event.method).to.eq('PATCH');
                        expect(event.id).to.eq(id);
                    });
                    // Limpeza
                    cy.request('DELETE', `${USERS_ENDPOINT}/${id}`);
                });
            });
        });
    });

    describe('DELETE /usuarios/:id → usuario.deleted', () => {
        it('should publish usuario.deleted event after DELETE', () => {
            const payload = buildUser();
            cy.request('POST', USERS_ENDPOINT, payload).then((create) => {
                const id = create.body._id;
                cy.task('clearEvents');
                cy.request('DELETE', `${USERS_ENDPOINT}/${id}`).then((res) => {
                    expect(res.status).to.eq(200);
                    cy.task('waitForEvent', { type: 'usuario.deleted', timeoutMs: 5000 }).then((event) => {
                        expect(event.type).to.eq('usuario.deleted');
                        expect(event.method).to.eq('DELETE');
                        expect(event.id).to.eq(id);
                    });
                });
            });
        });
    });
});
