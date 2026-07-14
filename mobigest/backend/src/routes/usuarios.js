const express = require('express');
const { Usuario } = require('../models');
const { autenticar, permitirRoles } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);
router.use(permitirRoles('admin', 'tecnico'));

// GET /api/v1/usuarios?rol=tecnico
router.get('/', async (req, res, next) => {
  try {
    const { rol } = req.query;
    const where = { activo: true };
    if (rol) where.rol = rol;
    const usuarios = await Usuario.findAll({
      where,
      attributes: ['id', 'nombre', 'email', 'rol'],
      order: [['nombre', 'ASC']],
    });
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
