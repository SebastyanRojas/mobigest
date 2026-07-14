const sequelize = require('../config/db');
const Usuario = require('./Usuario');
const Cliente = require('./Cliente');
const Dispositivo = require('./Dispositivo');
const Repuesto = require('./Repuesto');
const OrdenServicio = require('./OrdenServicio');
const RepuestoUsado = require('./RepuestoUsado');
const Notificacion = require('./Notificacion');
const Mensaje = require('./Mensaje');

// Cliente 1—1 Usuario (cuenta de acceso del cliente al portal)
Cliente.hasOne(Usuario, { foreignKey: 'clienteId', as: 'usuario' });
Usuario.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });

// Cliente 1—N Dispositivo
Cliente.hasMany(Dispositivo, { foreignKey: 'clienteId', as: 'dispositivos' });
Dispositivo.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });

// Cliente 1—N OrdenServicio
Cliente.hasMany(OrdenServicio, { foreignKey: 'clienteId', as: 'ordenes' });
OrdenServicio.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });

// Dispositivo 1—N OrdenServicio
Dispositivo.hasMany(OrdenServicio, { foreignKey: 'dispositivoId', as: 'ordenes' });
OrdenServicio.belongsTo(Dispositivo, { foreignKey: 'dispositivoId', as: 'dispositivo' });

// Usuario (tecnico) 1—N OrdenServicio
Usuario.hasMany(OrdenServicio, { foreignKey: 'usuarioId', as: 'ordenes' });
OrdenServicio.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'tecnico' });

// OrdenServicio N—M Repuesto a traves de RepuestoUsado
OrdenServicio.hasMany(RepuestoUsado, { foreignKey: 'ordenId', as: 'repuestosUsados' });
RepuestoUsado.belongsTo(OrdenServicio, { foreignKey: 'ordenId', as: 'orden' });

Repuesto.hasMany(RepuestoUsado, { foreignKey: 'repuestoId', as: 'usos' });
RepuestoUsado.belongsTo(Repuesto, { foreignKey: 'repuestoId', as: 'repuesto' });

// OrdenServicio 1—N Mensaje (chat cliente-técnico)
OrdenServicio.hasMany(Mensaje, { foreignKey: 'ordenId', as: 'mensajes' });
Mensaje.belongsTo(OrdenServicio, { foreignKey: 'ordenId', as: 'orden' });
Mensaje.belongsTo(Usuario, { foreignKey: 'autorId', as: 'autor' });

// Usuario 1—N Notificacion
Usuario.hasMany(Notificacion, { foreignKey: 'usuarioId', as: 'notificaciones' });
Notificacion.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
Notificacion.belongsTo(OrdenServicio, { foreignKey: 'ordenId', as: 'orden' });

module.exports = {
  sequelize,
  Usuario,
  Cliente,
  Dispositivo,
  Repuesto,
  OrdenServicio,
  RepuestoUsado,
  Notificacion,
  Mensaje,
};
