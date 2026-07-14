const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RepuestoUsado = sequelize.define('RepuestoUsado', {
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
  repuestoId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'repuesto_id',
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  precioAplicado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'precio_aplicado',
  },
}, {
  tableName: 'repuestos_usados',
});

module.exports = RepuestoUsado;
