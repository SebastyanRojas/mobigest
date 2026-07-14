const express = require('express');
const { Op } = require('sequelize');
const {
  OrdenServicio, Cliente, Dispositivo, Usuario, Repuesto,
} = require('../models');
const { autenticar, permitirRoles } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);
router.use(permitirRoles('admin', 'tecnico'));

router.get('/dashboard', async (req, res, next) => {
  try {
    const ordenes = await OrdenServicio.findAll();

    const porEstado = {};
    OrdenServicio.ESTADOS.forEach((e) => { porEstado[e] = 0; });
    ordenes.forEach((o) => { porEstado[o.estado] = (porEstado[o.estado] || 0) + 1; });

    const entregadas = ordenes.filter((o) => o.estado === 'entregado' && o.fechaEntrega);
    let tatPromedioDias = null;
    if (entregadas.length > 0) {
      const sumaDias = entregadas.reduce((acc, o) => {
        const dias = (new Date(o.fechaEntrega) - new Date(o.createdAt)) / (1000 * 60 * 60 * 24);
        return acc + dias;
      }, 0);
      tatPromedioDias = Number((sumaDias / entregadas.length).toFixed(1));
    }

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ordenesMes = ordenes.filter((o) => new Date(o.createdAt) >= inicioMes);
    const ingresosMes = ordenesMes
      .filter((o) => o.estado === 'entregado')
      .reduce((acc, o) => acc + Number(o.presupuestoManoObra || 0), 0);

    const entregadasATiempo = entregadas.filter(
      (o) => o.fechaCompromiso && new Date(o.fechaEntrega) <= new Date(o.fechaCompromiso)
    );
    const tasaEntregaATiempo = entregadas.length
      ? Number(((entregadasATiempo.length / entregadas.length) * 100).toFixed(1))
      : null;

    const repuestos = await Repuesto.findAll();
    const bajoStock = repuestos.filter((r) => r.stockActual <= r.stockMinimo);

    const activas = ordenes.filter((o) => !['entregado', 'no_reparable'].includes(o.estado)).length;
    const sinAsignar = ordenes.filter(
      (o) => !o.usuarioId && !['entregado', 'no_reparable'].includes(o.estado)
    ).length;

    const calificadas = ordenes.filter((o) => o.calificacion != null);
    const satisfaccionPromedio = calificadas.length
      ? Number((calificadas.reduce((acc, o) => acc + o.calificacion, 0) / calificadas.length).toFixed(1))
      : null;

    res.json({
      porEstado,
      totalOrdenes: ordenes.length,
      ordenesActivas: activas,
      ordenesSinAsignar: sinAsignar,
      tatPromedioDias,
      tasaEntregaATiempo,
      ingresosMes: Number(ingresosMes.toFixed(2)),
      ordenesEsteMes: ordenesMes.length,
      repuestosBajoStock: bajoStock.length,
      disponibilidadSistema: 99.5,
      satisfaccionPromedio,
      ordenesCalificadas: calificadas.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/kpis/kanban — tablero de estados: recibido hoy / en proceso / terminado hoy / pendiente-atrasado
router.get('/kanban', async (req, res, next) => {
  try {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    const finHoy = new Date();
    finHoy.setHours(23, 59, 59, 999);
    const ahora = new Date();

    const ordenes = await OrdenServicio.findAll({
      where: { estado: { [Op.ne]: 'no_reparable' } },
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'nombre'] },
        { model: Dispositivo, as: 'dispositivo', attributes: ['id', 'marca', 'modelo'] },
        { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const tarjeta = (o) => ({
      id: o.id,
      codigo: o.codigo,
      cliente: o.cliente?.nombre,
      equipo: o.dispositivo ? `${o.dispositivo.marca} ${o.dispositivo.modelo}` : null,
      tecnico: o.tecnico?.nombre || null,
      estado: o.estado,
      createdAt: o.createdAt,
      fechaCompromiso: o.fechaCompromiso,
      fechaEntrega: o.fechaEntrega,
    });

    const recibidoHoy = ordenes.filter(
      (o) => new Date(o.createdAt) >= inicioHoy && new Date(o.createdAt) <= finHoy
    );
    const enProceso = ordenes.filter((o) => ['en_diagnostico', 'en_reparacion'].includes(o.estado));
    const terminadoHoy = ordenes.filter(
      (o) => o.estado === 'entregado' && o.fechaEntrega
        && new Date(o.fechaEntrega) >= inicioHoy && new Date(o.fechaEntrega) <= finHoy
    );
    const pendienteAtrasado = ordenes.filter(
      (o) => !['entregado'].includes(o.estado)
        && o.fechaCompromiso && new Date(o.fechaCompromiso) < ahora
    );

    res.json({
      recibidoHoy: recibidoHoy.map(tarjeta),
      enProceso: enProceso.map(tarjeta),
      terminadoHoy: terminadoHoy.map(tarjeta),
      pendienteAtrasado: pendienteAtrasado.map(tarjeta),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
