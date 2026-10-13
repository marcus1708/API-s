const { Router } = require('express');
const routes = Router();
const UsuarioController = require('../controllers/UsuarioController');

routes.post('/usuarios', UsuarioController.store);
routes.get('/usuarios', UsuarioController.index);
routes.get('/usuarios/:id', UsuarioController.show);
routes.put('/usuarios/:id', UsuarioController.update);
routes.patch('/usuarios/:id', UsuarioController.patch);
routes.delete('/usuarios/:id', UsuarioController.destroy);

module.exports = routes;
