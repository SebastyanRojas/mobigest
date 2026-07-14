const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { Repuesto } = require('../models');
const { autenticar, permitirRoles } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

const repuestoSchema = Joi.object({
  nombre: Joi.string().min(2).max(150).required(),
  codigo: Joi.string().allow('', null),
  precioUnitario: Joi.number().positive().required(),
  stockActual: Joi.number().integer().min(0).required(),
  stockMinimo: Joi.number().integer().min(0).default(2),
  proveedor: Joi.string().allow('', null),
});

router.get('/', permitirRoles('admin', 'tecnico'), async (req, res, next) => {
  try {
    const { q, bajoStock } = req.query;
    const where = {};
    if (q) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${q}%` } },
        { codigo: { [Op.iLike]: `%${q}%` } },
      ];
    }
    let repuestos = await Repuesto.findAll({ where, order: [['nombre', 'ASC']] });
    if (bajoStock === 'true') {
      repuestos = repuestos.filter((r) => r.stockActual <= r.stockMinimo);
    }
    res.json(repuestos);
  } catch (err) {
    next(err);
  }
});

router.post('/', permitirRoles('admin'), async (req, res, next) => {
  try {
    const { error, value } = repuestoSchema.validate(req.body);
    if (error) throw error;
    const repuesto = await Repuesto.create(value);
    res.status(201).json(repuesto);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', permitirRoles('admin'), async (req, res, next) => {
  try {
    const { error, value } = repuestoSchema.validate(req.body);
    if (error) throw error;
    const repuesto = await Repuesto.findByPk(req.params.id);
    if (!repuesto) return res.status(404).json({ error: 'Repuesto no encontrado.' });
    await repuesto.update(value);
    res.json(repuesto);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', permitirRoles('admin'), async (req, res, next) => {
  try {
    const repuesto = await Repuesto.findByPk(req.params.id);
    if (!repuesto) return res.status(404).json({ error: 'Repuesto no encontrado.' });
    await repuesto.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
