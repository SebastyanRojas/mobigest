const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Dispositivo = sequelize.define('Dispositivo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  imei: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
  },
  marca: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  modelo: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  color: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  clienteId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'cliente_id',
  },
}, {
  tableName: 'dispositivos',
});

module.exports = Dispositivo;
