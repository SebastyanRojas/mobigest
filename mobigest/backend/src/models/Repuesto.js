const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Repuesto = sequelize.define('Repuesto', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  codigo: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
  },
  precioUnitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'precio_unitario',
  },
  stockActual: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'stock_actual',
  },
  stockMinimo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
    field: 'stock_minimo',
  },
  proveedor: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'repuestos',
});

module.exports = Repuesto;
