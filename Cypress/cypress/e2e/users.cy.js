/// <reference types="cypress" />

/**
 * Suite de testes de API para CRUD de usuarios.
 *
 * Premissas de contrato (compativel com ServeRest e APIs REST similares):
 *  - POST /usuarios cria um usuario e retorna 201 com { _id, message }
 *  - GET /usuarios retorna 200 com { message, usuarios[] }
 *  - GET /usuarios/:id retorna 200 com { message, usuario }
 *  - PUT /usuarios/:id atualiza (200)
 *  - PATCH /usuarios/:id atualiza parcialmente (200)
 *  - DELETE /usuarios/:id remove (200)
 *
 * Os testes nao dependem de ordem: cada teste cria e limpa seu proprio usuario.
 */

const USERS_ENDPOINT = Cypress.env('usersEndpoint') || '/usuarios';

/** Gera um email unico por execucao para evitar colisao. */
function uniqueEmail() {
  const stamp = Date.now();
  const rand = Math.floor(Math.random() * 100000);
  return `user_${stamp}_${rand}@test.com`;
}

/** Gera payload base de usuario com dados unicos. */
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

/** Cria um usuario via POST e retorna o corpo da resposta. */
function createUser(payload) {
  return cy
    .request('POST', USERS_ENDPOINT, payload)
    .then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body).to.have.property('_id');
      return cy.wrap({ id: res.body._id, ...payload });
    });
}

describe('POST /usuarios', () => {
  it('should create a user with valid unique data', () => {
    const payload = buildUser();
    cy.request('POST', USERS_ENDPOINT, payload).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body).to.have.property('_id');
      expect(res.body).to.have.property('message');
      // Limpeza
      cy.request('DELETE', `${USERS_ENDPOINT}/${res.body._id}`);
    });
  });

  it('should reject duplicate email with 400', () => {
    const payload = buildUser();
    cy.request('POST', USERS_ENDPOINT, payload).then((res) => {
      expect(res.status).to.eq(201);
      const id = res.body._id;
      // Tenta criar novamente com mesmo email
      cy.request({
        method: 'POST',
        url: USERS_ENDPOINT,
        body: payload,
        failOnStatusCode: false
      }).then((dup) => {
        expect(dup.status).to.eq(400);
        // Limpeza
        cy.request('DELETE', `${USERS_ENDPOINT}/${id}`);
      });
    });
  });

  it('should reject request with missing required fields', () => {
    cy.request({
      method: 'POST',
      url: USERS_ENDPOINT,
      body: { nome: 'Sem campos obrigatorios' },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 422]);
    });
  });
});

describe('GET /usuarios', () => {
  it('should return 200 and a list of users', () => {
    cy.request('GET', USERS_ENDPOINT).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('message');
      expect(res.body.usuarios).to.be.an('array');
    });
  });

  it('should find a user created in the same test', () => {
    const payload = buildUser();
    cy.request('POST', USERS_ENDPOINT, payload).then((create) => {
      const id = create.body._id;
      cy.request('GET', USERS_ENDPOINT).then((res) => {
        expect(res.status).to.eq(200);
        const found = res.body.find((u) => u._id === id);
        expect(found).to.not.be.undefined;
        expect(found.email).to.eq(payload.email);
        // Limpeza
        cy.request('DELETE', `${USERS_ENDPOINT}/${id}`);
      });
    });
  });
});

describe('GET /usuarios/:id', () => {
  it('should return 200 and the user by id', () => {
    const payload = buildUser();
    createUser(payload).then((user) => {
      cy.request('GET', `${USERS_ENDPOINT}/${user.id}`).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('_id', user.id);
        expect(res.body.email).to.eq(payload.email);
        // Limpeza
        cy.request('DELETE', `${USERS_ENDPOINT}/${user.id}`);
      });
    });
  });

  it('should return 400 for invalid id format', () => {
    cy.request({
      method: 'GET',
      url: `${USERS_ENDPOINT}/id-invalido-123`,
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 404]);
    });
  });

  it('should return 400/404 for non-existent id', () => {
    // ID com formato valido porem inexistente
    const fakeId = 'a'.repeat(24);
    cy.request({
      method: 'GET',
      url: `${USERS_ENDPOINT}/${fakeId}`,
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 404]);
    });
  });
});

describe('PUT /usuarios/:id', () => {
  it('should update an existing user with 200', () => {
    const payload = buildUser();
    createUser(payload).then((user) => {
      const update = buildUser({ nome: 'Nome Atualizado PUT' });
      cy.request('PUT', `${USERS_ENDPOINT}/${user.id}`, update).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('message');
        // Verifica atualizacao
        cy.request('GET', `${USERS_ENDPOINT}/${user.id}`).then((get) => {
          expect(get.body.nome).to.eq('Nome Atualizado PUT');
          // Limpeza
          cy.request('DELETE', `${USERS_ENDPOINT}/${user.id}`);
        });
      });
    });
  });

  it('should reject PUT with duplicate email from another user', () => {
    const payloadA = buildUser();
    const payloadB = buildUser();
    createUser(payloadA).then((userA) => {
      createUser(payloadB).then((userB) => {
        const update = buildUser({ email: payloadA.email });
        cy.request({
          method: 'PUT',
          url: `${USERS_ENDPOINT}/${userB.id}`,
          body: update,
          failOnStatusCode: false
        }).then((res) => {
          expect(res.status).to.be.oneOf([400, 409]);
          // Limpeza
          cy.request('DELETE', `${USERS_ENDPOINT}/${userA.id}`);
          cy.request('DELETE', `${USERS_ENDPOINT}/${userB.id}`);
        });
      });
    });
  });
});

describe('PATCH /usuarios/:id', () => {
  it('should partially update a user with 200', () => {
    const payload = buildUser();
    createUser(payload).then((user) => {
      cy.request('PATCH', `${USERS_ENDPOINT}/${user.id}`, { nome: 'Nome Patchado' }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('message');
        // Verifica atualizacao parcial
        cy.request('GET', `${USERS_ENDPOINT}/${user.id}`).then((get) => {
          expect(get.body.nome).to.eq('Nome Patchado');
          // Email nao foi alterado
          expect(get.body.email).to.eq(payload.email);
          // Limpeza
          cy.request('DELETE', `${USERS_ENDPOINT}/${user.id}`);
        });
      });
    });
  });

  it('should reject PATCH with invalid payload (missing fields or empty)', () => {
    const payload = buildUser();
    createUser(payload).then((user) => {
      cy.request({
        method: 'PATCH',
        url: `${USERS_ENDPOINT}/${user.id}`,
        body: {},
        failOnStatusCode: false
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 422]);
        // Limpeza
        cy.request('DELETE', `${USERS_ENDPOINT}/${user.id}`);
      });
    });
  });
});

describe('DELETE /usuarios/:id', () => {
  it('should delete an existing user with 200', () => {
    const payload = buildUser();
    createUser(payload).then((user) => {
      cy.request('DELETE', `${USERS_ENDPOINT}/${user.id}`).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('message');
        // Verifica que foi removido
        cy.request({
          method: 'GET',
          url: `${USERS_ENDPOINT}/${user.id}`,
          failOnStatusCode: false
        }).then((get) => {
          expect(get.status).to.be.oneOf([400, 404]);
        });
      });
    });
  });

  it('should return 400/404 when deleting non-existent id', () => {
    const fakeId = 'b'.repeat(24);
    cy.request({
      method: 'DELETE',
      url: `${USERS_ENDPOINT}/${fakeId}`,
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 404]);
    });
  });
});
