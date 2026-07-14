const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const {
  sequelize, OrdenServicio, Cliente, Dispositivo, Usuario, Repuesto, RepuestoUsado,
} = require('../models');
const { autenticar, permitirRoles } = require('../middleware/auth');
const { calcularTotales, generarCodigoOrden } = require('../utils/ordenHelpers');
const { notificar, notificarAdmins } = require('../utils/notificar');

// 👇 IMPORTAMOS LA FUNCIÓN DEL CORREO 👇
const { enviarAlertaStock, enviarEncuestaSatisfaccion } = require('../utils/mailer');

const router = express.Router();

// --- 1. RUTA PÚBLICA (Sin autenticación) ---
// La movemos arriba, antes de router.use(autenticar)
router.put('/:id/calificar-publico', async (req, res, next) => {
  try {
    const orden = await OrdenServicio.findByPk(req.params.id);
    
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });
    if (orden.estado !== 'entregado') {
      return res.status(400).json({ error: 'Solo se pueden calificar órdenes entregadas.' });
    }
    if (orden.calificacion) {
      return res.status(400).json({ error: 'Esta orden ya fue calificada anteriormente.' });
    }

    // Actualizamos la orden con la nota y el comentario
    await orden.update({ 
      calificacion: req.body.calificacion, 
      calificacionComentario: req.body.comentario 
    });
    
    res.json({ success: true, message: '¡Gracias por tu calificación!' });
  } catch (err) {
    next(err);
  }
});

// --- 2. EL RESTO DE RUTAS PROTEGIDAS ---
router.use(autenticar);

const ESTADOS = OrdenServicio.ESTADOS;
const ESTADO_LABEL = {
  recibido: 'Recibido',
  en_diagnostico: 'En diagnóstico',
  en_reparacion: 'En proceso',
  listo: 'Listo para retiro',
  entregado: 'Entregado',
  no_reparable: 'No reparable',
};

// Esquema usado por el mostrador
const crearSchemaStaff = Joi.object({
  clienteId: Joi.string().uuid().required(),
  dispositivoId: Joi.string().uuid().required(),
  fallaReportada: Joi.string().min(3).required(),
  diagnostico: Joi.string().allow('', null),
  checklist: Joi.object().unknown(true).default({}),
  metodoDesbloqueo: Joi.string().allow('', null),
  tieneGarantia: Joi.boolean().default(false),
  garantiaHasta: Joi.date().allow(null),
  presupuestoManoObra: Joi.number().min(0).default(0),
  anticipo: Joi.number().min(0).default(0),
  fechaCompromiso: Joi.date().allow(null),
  repuestos: Joi.array().items(Joi.object({
    repuestoId: Joi.string().uuid().required(),
    cantidad: Joi.number().integer().min(1).required(),
  })).default([]),
});

// Esquema usado por el cliente
const crearSchemaCliente = Joi.object({
  dispositivoId: Joi.string().uuid().required(),
  fallaReportada: Joi.string().min(3).required(),
  fechaCompromiso: Joi.date().allow(null),
});

const actualizarSchema = Joi.object({
  fallaReportada: Joi.string().min(3),
  diagnostico: Joi.string().allow('', null),
  checklist: Joi.object().unknown(true),
  metodoDesbloqueo: Joi.string().allow('', null),
  tieneGarantia: Joi.boolean(),
  garantiaHasta: Joi.date().allow(null),
  presupuestoManoObra: Joi.number().min(0),
  anticipo: Joi.number().min(0),
  fechaCompromiso: Joi.date().allow(null),
  fechaEstimadaEntrega: Joi.date().allow(null),
  estado: Joi.string().valid(...ESTADOS),
  repuestos: Joi.array().items(Joi.object({
    repuestoId: Joi.string().uuid().required(),
    cantidad: Joi.number().integer().min(1).required(),
  })),
}).min(1);

const presupuestoSchema = Joi.object({
  aprobado: Joi.boolean().required(),
  comentario: Joi.string().allow('', null),
});

const calificacionSchema = Joi.object({
  calificacion: Joi.number().integer().min(1).max(5).required(),
  comentario: Joi.string().allow('', null),
});

const asignarSchema = Joi.object({
  usuarioId: Joi.string().uuid().allow(null).required(),
});

const includeCompleto = [
  { model: Cliente, as: 'cliente' },
  { model: Dispositivo, as: 'dispositivo' },
  { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre', 'email'] },
  { model: RepuestoUsado, as: 'repuestosUsados', include: [{ model: Repuesto, as: 'repuesto' }] },
];

function esDueño(req, orden) {
  return req.usuario.rol === 'cliente' && orden.clienteId === req.usuario.clienteId;
}

function puedeVer(req, orden) {
  if (req.usuario.rol === 'admin') return true;
  if (req.usuario.rol === 'tecnico') return orden.usuarioId === req.usuario.id || orden.usuarioId === null;
  return esDueño(req, orden);
}

router.get('/', async (req, res, next) => {
  try {
    const { estado, q } = req.query;
    const where = {};
    if (estado) where.estado = estado;
    if (q) where.codigo = { [Op.iLike]: `%${q}%` };

    if (req.usuario.rol === 'cliente') {
      if (!req.usuario.clienteId) return res.json([]);
      where.clienteId = req.usuario.clienteId;
    }

    const ordenes = await OrdenServicio.findAll({
      where,
      include: includeCompleto,
      order: [['createdAt', 'DESC']],
    });

    const conTotales = ordenes.map((o) => {
      const json = o.toJSON();
      json.totales = calcularTotales(json, json.repuestosUsados);
      return json;
    });
    res.json(conTotales);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const orden = await OrdenServicio.findByPk(req.params.id, { include: includeCompleto });
    if (!orden) return res.status(404).json({ error: 'Orden de servicio no encontrada.' });
    if (!puedeVer(req, orden)) return res.status(403).json({ error: 'No tienes acceso a esta orden.' });
    const json = orden.toJSON();
    json.totales = calcularTotales(json, json.repuestosUsados);
    res.json(json);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const esCliente = req.usuario.rol === 'cliente';

    if (esCliente) {
      const { error, value } = crearSchemaCliente.validate(req.body);
      if (error) throw error;
      if (!req.usuario.clienteId) {
        throw Object.assign(new Error('Tu cuenta no está asociada a un cliente.'), { status: 400 });
      }
      const dispositivo = await Dispositivo.findByPk(value.dispositivoId, { transaction: t });
      if (!dispositivo || dispositivo.clienteId !== req.usuario.clienteId) {
        throw Object.assign(new Error('El dispositivo indicado no te pertenece.'), { status: 403 });
      }

      const codigo = await generarCodigoOrden(OrdenServicio);
      const orden = await OrdenServicio.create({
        codigo,
        clienteId: req.usuario.clienteId,
        dispositivoId: value.dispositivoId,
        usuarioId: null,
        fallaReportada: value.fallaReportada,
        fechaCompromiso: value.fechaCompromiso,
        origen: 'cliente',
        presupuestoEstado: 'no_aplica',
      }, { transaction: t });

      await t.commit();

      await notificarAdmins({
        ordenId: orden.id,
        tipo: 'nueva_solicitud',
        titulo: 'Nueva solicitud de servicio',
        mensaje: `Un cliente solicitó servicio: orden ${orden.codigo}. Requiere asignación de técnico.`,
      });

      const completa = await OrdenServicio.findByPk(orden.id, { include: includeCompleto });
      const json = completa.toJSON();
      json.totales = calcularTotales(json, json.repuestosUsados);
      return res.status(201).json(json);
    }

    const { error, value } = crearSchemaStaff.validate(req.body);
    if (error) throw error;

    const codigo = await generarCodigoOrden(OrdenServicio);

    const orden = await OrdenServicio.create({
      codigo,
      clienteId: value.clienteId,
      dispositivoId: value.dispositivoId,
      usuarioId: req.usuario.rol === 'tecnico' ? req.usuario.id : null,
      fallaReportada: value.fallaReportada,
      diagnostico: value.diagnostico,
      checklist: value.checklist,
      metodoDesbloqueo: value.metodoDesbloqueo,
      tieneGarantia: value.tieneGarantia,
      garantiaHasta: value.garantiaHasta,
      presupuestoManoObra: value.presupuestoManoObra,
      anticipo: value.anticipo,
      fechaCompromiso: value.fechaCompromiso,
      origen: 'mostrador',
      presupuestoEstado: value.presupuestoManoObra > 0 ? 'pendiente' : 'no_aplica',
    }, { transaction: t });

    for (const item of value.repuestos) {
      const repuesto = await Repuesto.findByPk(item.repuestoId, { transaction: t });
      if (!repuesto) throw Object.assign(new Error('Repuesto no encontrado.'), { status: 400 });
      if (repuesto.stockActual < item.cantidad) {
        throw Object.assign(
          new Error(`Stock insuficiente de "${repuesto.nombre}" (disponible: ${repuesto.stockActual}).`),
          { status: 409 }
        );
      }

      // ALERTA DE STOCK
      const nuevoStock = repuesto.stockActual - item.cantidad;
      if (nuevoStock <= 2) {
        enviarAlertaStock({ nombre: repuesto.nombre, stockActual: nuevoStock }).catch(e => console.error("Error envío correo", e));
      }

      await RepuestoUsado.create({
        ordenId: orden.id,
        repuestoId: item.repuestoId,
        cantidad: item.cantidad,
        precioAplicado: repuesto.precioUnitario,
      }, { transaction: t });
      await repuesto.decrement('stockActual', { by: item.cantidad, transaction: t });
    }

    await t.commit();
    const completa = await OrdenServicio.findByPk(orden.id, { include: includeCompleto });
    const json = completa.toJSON();
    json.totales = calcularTotales(json, json.repuestosUsados);
    res.status(201).json(json);
  } catch (err) {
    await t.rollback();
    next(err);
  }
});

// ✅ RUTA PRINCIPAL DE ACTUALIZACIÓN
router.put('/:id', permitirRoles('admin', 'tecnico'), async (req, res, next) => {
  console.log("--- DEBUG RUTA PUT ---");
  console.log("ID recibido:", req.params.id);
  
  const t = await sequelize.transaction();
  try {
    const orden = await OrdenServicio.findByPk(req.params.id, { transaction: t });
    
    if (!orden) {
      console.log("❌ ORDEN NO ENCONTRADA EN LA BD");
      await t.rollback();
      return res.status(404).json({ error: 'Orden de servicio no encontrada.' });
    }
    
    console.log("✅ ORDEN ENCONTRADA:", orden.id);
    
    if (req.usuario.rol === 'tecnico' && orden.usuarioId && orden.usuarioId !== req.usuario.id) {
      await t.rollback();
      return res.status(403).json({ error: 'Esta orden está asignada a otro técnico.' });
    }

    const { error, value } = actualizarSchema.validate(req.body);
    if (error) throw error;

    const estadoAnterior = orden.estado;
    const presupuestoAnterior = Number(orden.presupuestoManoObra);

    if (value.estado === 'entregado' && orden.estado !== 'entregado') {
      value.fechaEntrega = new Date();
    }
    
    if (value.presupuestoManoObra !== undefined && Number(value.presupuestoManoObra) !== presupuestoAnterior) {
      value.presupuestoEstado = Number(value.presupuestoManoObra) > 0 ? 'pendiente' : 'no_aplica';
    }

    if (value.repuestos) {
      const usadosActuales = await RepuestoUsado.findAll({ where: { ordenId: orden.id }, transaction: t });
      for (const u of usadosActuales) {
        await Repuesto.increment('stockActual', { by: u.cantidad, where: { id: u.repuestoId }, transaction: t });
      }
      await RepuestoUsado.destroy({ where: { ordenId: orden.id }, transaction: t });

      for (const item of value.repuestos) {
        const repuesto = await Repuesto.findByPk(item.repuestoId, { transaction: t });
        if (!repuesto) throw Object.assign(new Error('Repuesto no encontrado.'), { status: 400 });
        
        if (repuesto.stockActual < item.cantidad) {
          throw Object.assign(
            new Error(`Stock insuficiente de "${repuesto.nombre}" (disponible: ${repuesto.stockActual}).`),
            { status: 409 }
          );
        }

        const nuevoStock = repuesto.stockActual - item.cantidad;
        if (nuevoStock <= 2) {
          enviarAlertaStock({ nombre: repuesto.nombre, stockActual: nuevoStock }).catch(e => console.error("Error envío correo", e));
        }

        await RepuestoUsado.create({
          ordenId: orden.id,
          repuestoId: item.repuestoId,
          cantidad: item.cantidad,
          precioAplicado: repuesto.precioUnitario,
        }, { transaction: t });
        await repuesto.decrement('stockActual', { by: item.cantidad, transaction: t });
      }
      delete value.repuestos;
    }

    await orden.update(value, { transaction: t });
    await t.commit();

    // NOTIFICACIONES Y CORREO
    if (value.estado && value.estado !== estadoAnterior) {
      const clienteUsuario = await Usuario.findOne({ where: { clienteId: orden.clienteId } });
      const clienteData = await Cliente.findByPk(orden.clienteId); 
      
      if (clienteUsuario) {
        await notificar({
          usuarioId: clienteUsuario.id,
          ordenId: orden.id,
          tipo: 'cambio_estado',
          titulo: `Tu orden ${orden.codigo} cambió de estado`,
          mensaje: `Ahora está: "${ESTADO_LABEL[value.estado] || value.estado}".`,
        });
      }

      // 👇 EL DISPARADOR DEL CORREO REFORZADO 👇
    // 👇 EL DISPARADOR DEL CORREO REFORZADO 👇
      if (value.estado === 'entregado') {
        const emailFinal = clienteData?.email || 'sebastyan.rojas@gmail.com'; 
        
        // Verificamos si existe el usuario para decirle al mailer si tiene cuenta
        const tieneCuenta = clienteUsuario ? true : false;
        
        console.log(`\n[MAILER DEBUG] ¡La orden ${orden.id} pasó a Entregado!`);
        console.log(`[MAILER DEBUG] Intentando enviar encuesta a: ${emailFinal} (Tiene cuenta: ${tieneCuenta})`);
        
        // ¡Le pasamos el tercer parámetro (tieneCuenta)!
        enviarEncuestaSatisfaccion(emailFinal, orden, tieneCuenta)
          .then(() => console.log('✅ [MAILER DEBUG] Correo enviado con éxito a Gmail'))
          .catch(err => console.error('❌ [MAILER DEBUG] Falló el envío:', err));
      }
    }

    const completa = await OrdenServicio.findByPk(orden.id, { include: includeCompleto });
    const json = completa.toJSON();
    json.totales = calcularTotales(json, json.repuestosUsados);
    res.json(json);
  } catch (err) {
    await t.rollback();
    next(err);
  }
});

// PUT /api/v1/ordenes/:id/presupuesto
router.put('/:id/presupuesto', permitirRoles('cliente'), async (req, res, next) => {
  try {
    const { error, value } = presupuestoSchema.validate(req.body);
    if (error) throw error;

    const orden = await OrdenServicio.findByPk(req.params.id);
    if (!orden) return res.status(404).json({ error: 'Orden de servicio no encontrada.' });
    if (!esDueño(req, orden)) return res.status(403).json({ error: 'No tienes acceso a esta orden.' });
    if (orden.presupuestoEstado === 'no_aplica') {
      return res.status(400).json({ error: 'Esta orden aún no tiene un presupuesto para aprobar.' });
    }

    await orden.update({ presupuestoEstado: value.aprobado ? 'aprobado' : 'rechazado' });

    if (orden.usuarioId) {
      await notificar({
        usuarioId: orden.usuarioId,
        ordenId: orden.id,
        tipo: 'presupuesto',
        titulo: `Presupuesto ${value.aprobado ? 'aprobado' : 'rechazado'} — ${orden.codigo}`,
        mensaje: value.comentario || (value.aprobado ? 'El cliente aprobó el presupuesto.' : 'El cliente rechazó el presupuesto.'),
      });
    } else {
      await notificarAdmins({
        ordenId: orden.id,
        tipo: 'presupuesto',
        titulo: `Presupuesto ${value.aprobado ? 'aprobado' : 'rechazado'} — ${orden.codigo}`,
        mensaje: value.comentario || (value.aprobado ? 'El cliente aprobó el presupuesto.' : 'El cliente rechazó el presupuesto.'),
      });
    }

    const completa = await OrdenServicio.findByPk(orden.id, { include: includeCompleto });
    const json = completa.toJSON();
    json.totales = calcularTotales(json, json.repuestosUsados);
    res.json(json);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/ordenes/:id/asignar
router.put('/:id/asignar', permitirRoles('admin', 'tecnico'), async (req, res, next) => {
  try {
    const orden = await OrdenServicio.findByPk(req.params.id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });

    // REGLA: Un técnico solo puede intervenir si se la está auto-asignando
    if (req.usuario.rol === 'tecnico') {
      // 1. No puede asignársela a un técnico distinto a él mismo
      if (req.body.usuarioId && req.body.usuarioId !== req.usuario.id) {
        return res.status(403).json({ error: 'Solo puedes asignarte la orden a ti mismo.' });
      }
      // 2. No puede robarle la orden a otro técnico que ya la tenga
      if (orden.usuarioId && orden.usuarioId !== req.usuario.id) {
        return res.status(403).json({ error: 'Esta orden ya está asignada a otro técnico.' });
      }
    }

    // Si pasa las reglas, actualizamos el técnico
    await orden.update({ usuarioId: req.body.usuarioId || null });
    
    res.json({ success: true, message: 'Asignación actualizada correctamente.', orden });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/ordenes/:id
router.delete('/:id', permitirRoles('admin'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const orden = await OrdenServicio.findByPk(req.params.id, { transaction: t });
    if (!orden) {
      await t.rollback();
      return res.status(404).json({ error: 'Orden de servicio no encontrada.' });
    }
    const usados = await RepuestoUsado.findAll({ where: { ordenId: orden.id }, transaction: t });
    for (const u of usados) {
      await Repuesto.increment('stockActual', { by: u.cantidad, where: { id: u.repuestoId }, transaction: t });
    }
    await RepuestoUsado.destroy({ where: { ordenId: orden.id }, transaction: t });
    await orden.destroy({ transaction: t });
    await t.commit();
    res.status(204).send();
  } catch (err) {
    await t.rollback();
    next(err);
  }
});

module.exports = router;