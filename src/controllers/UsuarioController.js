const Usuario = require('../models/Usuario');
const { redis, publishUserEvent } = require('../config/redis');

const CACHE_KEY = 'usuarios:todos';
const CACHE_TTL = 60;

module.exports = {

    // =====================================================
    // POST /usuarios
    // =====================================================
    async store(req, res) {
        try {
            const { nome, email } = req.body;

            // Validação de campos obrigatórios
            if (!nome || !email) {
                return res.status(400).json({
                    message: "Nome e Email são obrigatórios"
                });
            }

            const existe = await Usuario.findOne({ email });

            if (existe) {
                return res.status(404).json({
                    message: "Dados já existentes"
                });
            }

            const usuario = await Usuario.create(req.body);

            // Invalida cache da lista
            await redis.del(CACHE_KEY);

            // Publica evento de criação
            await publishUserEvent({
                type: 'usuario.created',
                id: usuario._id,
                method: 'POST',
                path: '/usuarios'
            });

            return res.status(201).json({
                _id: usuario._id,
                message: "Usuario gerado com sucesso"
            });

        } catch (err) {
            console.error('❌ Erro ao criar usuario:', err);

            return res.status(400).json({
                message: "Usuario nao criado"
            });
        }
    },


    // =====================================================
    // GET /usuarios
    // =====================================================
    async index(req, res) {
        try {

            console.log('🔥 GET /usuarios');

            // Verifica cache
            const cache = await redis.get(CACHE_KEY);

            console.log(
                cache
                    ? '🟢 Redis HIT - GET /usuarios'
                    : '🟡 Redis MISS - GET /usuarios'
            );

            // Se existir cache, retorna diretamente
            if (cache) {

                console.log('⚡ Retornando dados do Redis');

                return res.status(200).json(
                    JSON.parse(cache)
                );
            }

            // Caso não exista cache, consulta MongoDB
            const usuarios = await Usuario.find();

            const response = {
                message: "Listagem de todos os usuarios realizada",
                usuarios
            };

            // Salva resultado no Redis
            await redis.setEx(
                CACHE_KEY,
                CACHE_TTL,
                JSON.stringify(response)
            );

            console.log(
                `💾 Cache armazenado no Redis por ${CACHE_TTL}s`
            );

            // Publica evento de listagem
            await publishUserEvent({
                type: 'usuario.listed',
                method: 'GET',
                path: '/usuarios'
            });

            return res.status(200).json(response);

        } catch (err) {

            console.error('❌ Erro ao listar usuarios:', err);

            return res.status(400).json({
                message: "Erro ao listar usuarios"
            });
        }
    },


    // =====================================================
    // GET /usuarios/:id
    // =====================================================
async show(req, res) {
        try {
            const { id } = req.params;

            const cacheKey = `usuario:${id}`;
            const cacheTTL = 300;

            console.log(`🔥 GET /usuarios/${id}`);

            // 1. Consulta o Redis
            const cache = await redis.get(cacheKey);

            if (cache) {
                console.log(`🟢 Redis HIT - GET /usuarios/${id}`);

                return res.status(200).json(JSON.parse(cache));
            }

            console.log(`🟡 Redis MISS - GET /usuarios/${id}`);

            // 2. Consulta o MongoDB se não houver cache
            const usuario = await Usuario.findById(id);

            if (!usuario) {
                return res.status(404).json({
                    message: "Usuario nao encontrado"
                });
            }

            const response = {
                message: "Usuario encontrado",
                usuario
            };

            // 3. Armazena o resultado no Redis por 300 segundos
            await redis.setEx(
                cacheKey,
                cacheTTL,
                JSON.stringify(response)
            );

            console.log(
                `💾 Cache ${cacheKey} armazenado por ${cacheTTL}s`
            );

            // Publica evento de busca por id
            await publishUserEvent({
                type: 'usuario.fetched',
                id: id,
                method: 'GET',
                path: `/usuarios/${id}`
            });

            return res.status(200).json(response);

        } catch (err) {
            console.error('❌ Erro ao buscar usuario:', err);

            return res.status(400).json({
                message: "Usuario nao encontrado"
            });
        }
    },

    // =====================================================
    // PUT /usuarios/:id
    // =====================================================
    async update(req, res) {
        try {

            const usuario = await Usuario.findByIdAndUpdate(
                req.params.id,
                req.body,
                { returnDocument: 'after' }
            );

            if (!usuario) {
                return res.status(400).json({
                    message: "Usuario nao atualizado"
                });
            }

            // Invalida cache da lista
            await redis.del(CACHE_KEY);
            await redis.del(`usuario:${req.params.id}`);

            // Publica evento de atualização completa
            await publishUserEvent({
                type: 'usuario.updated',
                id: req.params.id,
                method: 'PUT',
                path: `/usuarios/${req.params.id}`
            });

            return res.status(200).json({
                message: "Dados do usuario atualizados"
            });

        } catch (err) {

            console.error('❌ Erro ao atualizar usuario:', err);

            return res.status(400).json({
                message: "Usuario nao atualizado"
            });
        }
    },


    // =====================================================
    // PATCH /usuarios/:id
    // =====================================================
    async patch(req, res) {
        try {

            const usuario = await Usuario.findByIdAndUpdate(
                req.params.id,
                { $set: req.body },
                { returnDocument: 'after' }
            );

            if (!usuario) {
                return res.status(400).json({
                    message: "Usuario nao atualizado"
                });
            }

            // Invalida cache da lista
            await redis.del(CACHE_KEY);
            await redis.del(`usuario:${req.params.id}`);

            // Publica evento de atualização parcial
            await publishUserEvent({
                type: 'usuario.patched',
                id: req.params.id,
                method: 'PATCH',
                path: `/usuarios/${req.params.id}`
            });

            return res.status(200).json({
                message: "Dados do usuario atualizados"
            });

        } catch (err) {

            console.error('❌ Erro ao atualizar usuario:', err);

            return res.status(400).json({
                message: "Usuario nao atualizado"
            });
        }
    },


    // =====================================================
    // DELETE /usuarios/:id
    // =====================================================
    async destroy(req, res) {
        try {

            const usuario = await Usuario.findByIdAndDelete(
                req.params.id
            );

            if (!usuario) {
                return res.status(400).json({
                    message: "Usuario nao deletado"
                });
            }

            // Invalida cache da lista
            await redis.del(CACHE_KEY);
            await redis.del(`usuario:${req.params.id}`);

            // Publica evento de exclusão
            await publishUserEvent({
                type: 'usuario.deleted',
                id: req.params.id,
                method: 'DELETE',
                path: `/usuarios/${req.params.id}`
            });

            return res.status(200).json({
                message: "Usuario excluído"
            });

        } catch (err) {

            console.error('❌ Erro ao excluir usuario:', err);

            return res.status(400).json({
                message: "Usuario nao deletado"
            });
        }
    }
};