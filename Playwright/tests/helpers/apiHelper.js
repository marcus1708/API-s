/**
 * Helper reutilizável para chamadas à API /usuarios.
 * Usa APIRequestContext do Playwright (baseURL do config).
 */

async function createUsuario(request, payload) {
  return request.post('/usuarios', { data: payload });
}

async function getUsuarios(request) {
  return request.get('/usuarios');
}

async function getUsuarioById(request, id) {
  return request.get(`/usuarios/${id}`);
}

async function updateUsuario(request, id, payload) {
  return request.put(`/usuarios/${id}`, { data: payload });
}

async function patchUsuario(request, id, payload) {
  return request.patch(`/usuarios/${id}`, { data: payload });
}

async function deleteUsuario(request, id) {
  return request.delete(`/usuarios/${id}`);
}

module.exports = {
  createUsuario,
  getUsuarios,
  getUsuarioById,
  updateUsuario,
  patchUsuario,
  deleteUsuario,
};
