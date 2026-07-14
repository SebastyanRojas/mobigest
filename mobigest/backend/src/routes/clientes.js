const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { Cliente, Dispositivo, OrdenServicio } = require('../models');
const { autenticar, permitirRoles } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

const clienteSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required(),
  telefono: Joi.string().min(7).max(20).required(),
  email: Joi.string().email().allow('', null),
  direccion: Joi.string().allow('', null),
});

const perfilSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required(),
  telefono: Joi.string().min(7).max(20).required(),
  direccion: Joi.string().allow('', null),
});

// GET /api/v1/clientes/me — perfil del cliente autenticado (portal)
router.get('/me', permitirRoles('cliente'), async (req, res, next) => {
  try {
    if (!req.usuario.clienteId) return res.status(404).json({ error: 'Tu cuenta no está asociada a un cliente.' });
    const cliente = await Cliente.findByPk(req.usuario.clienteId, {
      include: [{ model: Dispositivo, as: 'dispositivos' }],
    });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
    res.json(cliente);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/clientes/me — el cliente actualiza sus propios datos de contacto
router.put('/me', permitirRoles('cliente'), async (req, res, next) => {
  try {
    if (!req.usuario.clienteId) return res.status(404).json({ error: 'Tu cuenta no está asociada a un cliente.' });
    const { error, value } = perfilSchema.validate(req.body);
    if (error) throw error;
    const cliente = await Cliente.findByPk(req.usuario.clienteId);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
    await cliente.update(value);
    res.json(cliente);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/clientes?q=texto — sólo personal del taller
router.get('/', permitirRoles('admin', 'tecnico'), async (req, res, next) => {
  try {
    const { q } = req.query;
    const where = q
      ? {
          [Op.or]: [
            { nombre: { [Op.iLike]: `%${q}%` } },
            { telefono: { [Op.iLike]: `%${q}%` } },
            { email: { [Op.iLike]: `%${q}%` } },
          ],
        }
      : {};
    const clientes = await Cliente.findAll({ where, order: [['nombre', 'ASC']] });
    res.json(clientes);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', permitirRoles('admin', 'tecnico'), async (req, res, next) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id, {
      include: [{ model: Dispositivo, as: 'dispositivos' }],
    });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
    res.json(cliente);
  } catch (err) {
    next(err);
  }
});

router.post('/', permitirRoles('admin', 'tecnico'), async (req, res, next) => {
  try {
    const { error, value } = clienteSchema.validate(req.body);
    if (error) throw error;
    const cliente = await Cliente.create(value);
    res.status(201).json(cliente);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', permitirRoles('admin', 'tecnico'), async (req, res, next) => {
  try {
    const { error, value } = clienteSchema.validate(req.body);
    if (error) throw error;
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
    await cliente.update(value);
    res.json(cliente);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', permitirRoles('admin'), async (req, res, next) => {
  try {
    const tieneOrdenes = await OrdenServicio.count({ where: { clienteId: req.params.id } });
    if (tieneOrdenes > 0) {
      return res.status(409).json({ error: 'No se puede eliminar: el cliente tiene órdenes de servicio asociadas.' });
    }
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
    await cliente.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
