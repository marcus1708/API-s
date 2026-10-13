const Usuario = require('../models/Usuario');
const { redis } = require('../config/redis');

const CACHE_KEY_LIST = 'usuarios:todos';
const CACHE_TTL_LIST = 60;
const CACHE_TTL_USER = 300;

const cacheKeyUser = (id) => `usuario:${id}`;

const invalidateUserCache = async (id = null) => {
    const keys = [CACHE_KEY_LIST];
    if (id) keys.push(cacheKeyUser(id));
    await redis.del(keys);
};

module.exports = {
    async store(req, res) {
        try {
            const { nome, email } = req.body;

            if (!nome || !email) {
                return res.status(400).json({ message: 'Nome e Email são obrigatórios' });
            }

            const existe = await Usuario.findOne({ email });
            if (existe) {
                return res.status(404).json({ message: 'Dados já existentes' });
            }

            const usuario = await Usuario.create(req.body);
            await invalidateUserCache();

            return res.status(201).json({
                _id: usuario._id,
                message: 'Usuario gerado com sucesso'
            });
        } catch (err) {
            console.error('❌ Erro ao criar usuario:', err);
            return res.status(400).json({ message: 'Usuario nao criado' });
        }
    },

    async index(req, res) {
        try {
            console.log('🔥 GET /usuarios');

            const cache = await redis.get(CACHE_KEY_LIST);
            if (cache) {
                console.log('🟢 Redis HIT - GET /usuarios');
                return res.status(200).json(JSON.parse(cache));
            }

            console.log('🟡 Redis MISS - GET /usuarios');

            const usuarios = await Usuario.find();
            const response = {
                message: 'Listagem de todos os usuarios realizada',
                usuarios
            };

            await redis.setEx(CACHE_KEY_LIST, CACHE_TTL_LIST, JSON.stringify(response));
            console.log(`💾 Cache ${CACHE_KEY_LIST} armazenado por ${CACHE_TTL_LIST}s`);

            return res.status(200).json(response);
        } catch (err) {
            console.error('❌ Erro ao listar usuarios:', err);
            return res.status(400).json({ message: 'Erro ao listar usuarios' });
        }
    },

    async show(req, res) {
        try {
            const { id } = req.params;
            const key = cacheKeyUser(id);

            console.log(`🔥 GET /usuarios/${id}`);

            const cache = await redis.get(key);
            if (cache) {
                console.log(`🟢 Redis HIT - GET /usuarios/${id}`);
                return res.status(200).json(JSON.parse(cache));
            }

            console.log(`🟡 Redis MISS - GET /usuarios/${id}`);

            const usuario = await Usuario.findById(id);
            if (!usuario) {
                return res.status(404).json({ message: 'Usuario nao encontrado' });
            }

            const response = {
                message: 'Usuario encontrado',
                usuario
            };

            await redis.setEx(key, CACHE_TTL_USER, JSON.stringify(response));
            console.log(`💾 Cache ${key} armazenado por ${CACHE_TTL_USER}s`);

            return res.status(200).json(response);
        } catch (err) {
            console.error('❌ Erro ao buscar usuario:', err);
            return res.status(400).json({ message: 'Usuario nao encontrado' });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;

            const usuario = await Usuario.findByIdAndUpdate(id, req.body, { new: true });
            if (!usuario) {
                return res.status(400).json({ message: 'Usuario nao atualizado' });
            }

            await invalidateUserCache(id);

            return res.status(200).json({ message: 'Dados do usuario atualizados' });
        } catch (err) {
            console.error('❌ Erro ao atualizar usuario:', err);
            return res.status(400).json({ message: 'Usuario nao atualizado' });
        }
    },

    async patch(req, res) {
        try {
            const { id } = req.params;

            const usuario = await Usuario.findByIdAndUpdate(
                id,
                { $set: req.body },
                { new: true }
            );

            if (!usuario) {
                return res.status(400).json({ message: 'Usuario nao atualizado' });
            }

            await invalidateUserCache(id);

            return res.status(200).json({ message: 'Dados do usuario atualizados' });
        } catch (err) {
            console.error('❌ Erro ao atualizar usuario:', err);
            return res.status(400).json({ message: 'Usuario nao atualizado' });
        }
    },

    async destroy(req, res) {
        try {
            const { id } = req.params;

            const usuario = await Usuario.findByIdAndDelete(id);
            if (!usuario) {
                return res.status(400).json({ message: 'Usuario nao deletado' });
            }

            await invalidateUserCache(id);

            return res.status(200).json({ message: 'Usuario excluído' });
        } catch (err) {
            console.error('❌ Erro ao excluir usuario:', err);
            return res.status(400).json({ message: 'Usuario nao deletado' });
        }
    }
};
