const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { Dispositivo, Cliente, OrdenServicio } = require('../models');
const { autenticar, permitirRoles } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

const dispositivoSchema = Joi.object({
  imei: Joi.string().min(14).max(15).required(),
  marca: Joi.string().min(2).max(50).required(),
  modelo: Joi.string().min(1).max(100).required(),
  color: Joi.string().allow('', null),
  observaciones: Joi.string().allow('', null),
  clienteId: Joi.string().uuid().required(),
});

const dispositivoClienteSchema = Joi.object({
  imei: Joi.string().min(14).max(15).required(),
  marca: Joi.string().min(2).max(50).required(),
  modelo: Joi.string().min(1).max(100).required(),
  color: Joi.string().allow('', null),
  observaciones: Joi.string().allow('', null),
});

function luhnValido(imei) {
  const digitos = imei.replace(/\D/g, '');
  if (digitos.length < 14) return false;
  let suma = 0;
  for (let i = 0; i < digitos.length; i++) {
    let d = parseInt(digitos[digitos.length - 1 - i], 10);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
  }
  return suma % 10 === 0;
}

router.get('/', async (req, res, next) => {
  try {
    const { q, clienteId } = req.query;
    const where = {};

    if (req.usuario.rol === 'cliente') {
      if (!req.usuario.clienteId) return res.json([]);
      where.clienteId = req.usuario.clienteId; // un cliente sólo ve sus propios equipos
    } else if (clienteId) {
      where.clienteId = clienteId;
    }

    if (q) {
      where[Op.or] = [
        { imei: { [Op.iLike]: `%${q}%` } },
        { marca: { [Op.iLike]: `%${q}%` } },
        { modelo: { [Op.iLike]: `%${q}%` } },
      ];
    }
    const dispositivos = await Dispositivo.findAll({
      where,
      include: [{ model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'telefono'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(dispositivos);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/historial', async (req, res, next) => {
  try {
    const dispositivo = await Dispositivo.findByPk(req.params.id);
    if (!dispositivo) return res.status(404).json({ error: 'Dispositivo no encontrado.' });
    if (req.usuario.rol === 'cliente' && dispositivo.clienteId !== req.usuario.clienteId) {
      return res.status(403).json({ error: 'No tienes acceso a este dispositivo.' });
    }
    const ordenes = await OrdenServicio.findAll({
      where: { dispositivoId: req.params.id },
      order: [['createdAt', 'DESC']],
    });
    res.json({ dispositivo, ordenes });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    let value;
    if (req.usuario.rol === 'cliente') {
      if (!req.usuario.clienteId) return res.status(400).json({ error: 'Tu cuenta no está asociada a un cliente.' });
      const { error, value: v } = dispositivoClienteSchema.validate(req.body);
      if (error) throw error;
      value = { ...v, clienteId: req.usuario.clienteId };
    } else {
      const { error, value: v } = dispositivoSchema.validate(req.body);
      if (error) throw error;
      value = v;
    }
    if (!luhnValido(value.imei)) {
      return res.status(400).json({ error: 'El IMEI ingresado no es válido (falla la verificación Luhn).' });
    }
    const dispositivo = await Dispositivo.create(value);
    res.status(201).json(dispositivo);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', permitirRoles('admin', 'tecnico'), async (req, res, next) => {
  try {
    const { error, value } = dispositivoSchema.validate(req.body);
    if (error) throw error;
    const dispositivo = await Dispositivo.findByPk(req.params.id);
    if (!dispositivo) return res.status(404).json({ error: 'Dispositivo no encontrado.' });
    await dispositivo.update(value);
    res.json(dispositivo);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', permitirRoles('admin', 'tecnico'), async (req, res, next) => {
  try {
    const tieneOrdenes = await OrdenServicio.count({ where: { dispositivoId: req.params.id } });
    if (tieneOrdenes > 0) {
      return res.status(409).json({ error: 'No se puede eliminar: el dispositivo tiene órdenes de servicio asociadas.' });
    }
    const dispositivo = await Dispositivo.findByPk(req.params.id);
    if (!dispositivo) return res.status(404).json({ error: 'Dispositivo no encontrado.' });
    await dispositivo.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
