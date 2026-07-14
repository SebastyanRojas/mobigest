const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ESTADOS = ['recibido', 'en_diagnostico', 'en_reparacion', 'listo', 'entregado', 'no_reparable'];

const OrdenServicio = sequelize.define('OrdenServicio', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  codigo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  clienteId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'cliente_id',
  },
  dispositivoId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'dispositivo_id',
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'usuario_id',
  },
  estado: {
    type: DataTypes.ENUM(...ESTADOS),
    allowNull: false,
    defaultValue: 'recibido',
  },
  fallaReportada: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'falla_reportada',
  },
  diagnostico: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  checklist: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  metodoDesbloqueo: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'metodo_desbloqueo',
  },
  fotos: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  tieneGarantia: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'tiene_garantia',
  },
  garantiaHasta: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'garantia_hasta',
  },
  presupuestoManoObra: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'presupuesto_mano_obra',
  },
  anticipo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  fechaCompromiso: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'fecha_compromiso',
  },
  fechaEntrega: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_entrega',
  },
  firmaAceptacion: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'firma_aceptacion',
  },
  firmaEntrega: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'firma_entrega',
  },
  presupuestoEstado: {
    type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado', 'no_aplica'),
    allowNull: false,
    defaultValue: 'no_aplica',
    field: 'presupuesto_estado',
  },
  fechaEstimadaEntrega: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'fecha_estimada_entrega',
  },
  calificacion: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
  },
  calificacionComentario: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'calificacion_comentario',
  },
  origen: {
    type: DataTypes.ENUM('mostrador', 'cliente'),
    allowNull: false,
    defaultValue: 'mostrador',
  },
}, {
  tableName: 'ordenes_servicio',
});

OrdenServicio.ESTADOS = ESTADOS;

module.exports = OrdenServicio;
