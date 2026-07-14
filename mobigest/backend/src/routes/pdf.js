const express = require('express');
const {
  OrdenServicio, Cliente, Dispositivo, Usuario, Repuesto, RepuestoUsado,
} = require('../models');
const { autenticar } = require('../middleware/auth');
const { generarComprobantePDF } = require('../utils/pdfGenerator');

const router = express.Router();
router.use(autenticar);

router.get('/ordenes/:id/comprobante', async (req, res, next) => {
  try {
    const orden = await OrdenServicio.findByPk(req.params.id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Dispositivo, as: 'dispositivo' },
        { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre'] },
        { model: RepuestoUsado, as: 'repuestosUsados', include: [{ model: Repuesto, as: 'repuesto' }] },
      ],
    });
    if (!orden) return res.status(404).json({ error: 'Orden de servicio no encontrada.' });
    if (req.usuario.rol === 'cliente' && orden.clienteId !== req.usuario.clienteId) {
      return res.status(403).json({ error: 'No tienes acceso a esta orden.' });
    }
    generarComprobantePDF(orden.toJSON(), res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
