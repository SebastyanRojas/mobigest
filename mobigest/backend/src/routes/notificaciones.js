const express = require('express');
const { Notificacion } = require('../models');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// GET /api/v1/notificaciones — notificaciones del usuario autenticado
router.get('/', async (req, res, next) => {
  try {
    const notificaciones = await Notificacion.findAll({
      where: { usuarioId: req.usuario.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    const noLeidas = notificaciones.filter((n) => !n.leida).length;
    res.json({ notificaciones, noLeidas });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/notificaciones/:id/leer
router.put('/:id/leer', async (req, res, next) => {
  try {
    const notif = await Notificacion.findOne({ where: { id: req.params.id, usuarioId: req.usuario.id } });
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada.' });
    await notif.update({ leida: true });
    res.json(notif);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/notificaciones/leer-todas
router.put('/leer-todas', async (req, res, next) => {
  try {
    await Notificacion.update({ leida: true }, { where: { usuarioId: req.usuario.id, leida: false } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
