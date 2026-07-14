const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Mensaje = sequelize.define('Mensaje', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  ordenId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'orden_id',
  },
  autorId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'autor_id',
  },
  autorRol: {
    type: DataTypes.ENUM('admin', 'tecnico', 'cliente'),
    allowNull: false,
    field: 'autor_rol',
  },
  contenido: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'mensajes',
});

module.exports = Mensaje;
