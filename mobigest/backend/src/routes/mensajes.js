const express = require('express');
const Joi = require('joi');
const {
  OrdenServicio, Usuario, Mensaje,
} = require('../models');
const { autenticar } = require('../middleware/auth');
const { notificar, notificarAdmins } = require('../utils/notificar');

const router = express.Router();
router.use(autenticar);

const mensajeSchema = Joi.object({
  contenido: Joi.string().min(1).max(2000).required(),
});

async function verificarAcceso(req, res) {
  const orden = await OrdenServicio.findByPk(req.params.ordenId);
  if (!orden) {
    res.status(404).json({ error: 'Orden de servicio no encontrada.' });
    return null;
  }
  const { rol, id, clienteId } = req.usuario;
  const permitido = rol === 'admin'
    || (rol === 'tecnico' && orden.usuarioId === id)
    || (rol === 'cliente' && orden.clienteId === clienteId);
  if (!permitido) {
    res.status(403).json({ error: 'No tienes acceso a la mensajería de esta orden.' });
    return null;
  }
  return orden;
}

// GET /api/v1/ordenes/:ordenId/mensajes
router.get('/:ordenId/mensajes', async (req, res, next) => {
  try {
    const orden = await verificarAcceso(req, res);
    if (!orden) return;
    const mensajes = await Mensaje.findAll({
      where: { ordenId: orden.id },
      include: [{ model: Usuario, as: 'autor', attributes: ['id', 'nombre', 'rol'] }],
      order: [['createdAt', 'ASC']],
    });
    res.json(mensajes);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/ordenes/:ordenId/mensajes
router.post('/:ordenId/mensajes', async (req, res, next) => {
  try {
    const orden = await verificarAcceso(req, res);
    if (!orden) return;
    const { error, value } = mensajeSchema.validate(req.body);
    if (error) throw error;

    const mensaje = await Mensaje.create({
      ordenId: orden.id,
      autorId: req.usuario.id,
      autorRol: req.usuario.rol,
      contenido: value.contenido,
    });

    // Notificar a la otra parte de la conversación
    if (req.usuario.rol === 'cliente') {
      if (orden.usuarioId) {
        await notificar({
          usuarioId: orden.usuarioId,
          ordenId: orden.id,
          tipo: 'mensaje',
          titulo: `Nuevo mensaje en ${orden.codigo}`,
          mensaje: value.contenido.slice(0, 140),
        });
      } else {
        await notificarAdmins({
          ordenId: orden.id,
          tipo: 'mensaje',
          titulo: `Nuevo mensaje en ${orden.codigo}`,
          mensaje: value.contenido.slice(0, 140),
        });
      }
    } else {
      const clienteUsuario = await Usuario.findOne({ where: { clienteId: orden.clienteId } });
      if (clienteUsuario) {
        await notificar({
          usuarioId: clienteUsuario.id,
          ordenId: orden.id,
          tipo: 'mensaje',
          titulo: `Nuevo mensaje sobre tu orden ${orden.codigo}`,
          mensaje: value.contenido.slice(0, 140),
        });
      }
    }

    const completo = await Mensaje.findByPk(mensaje.id, {
      include: [{ model: Usuario, as: 'autor', attributes: ['id', 'nombre', 'rol'] }],
    });
    res.status(201).json(completo);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
