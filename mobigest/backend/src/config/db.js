const { Sequelize } = require('sequelize');
require('dotenv').config(); // Aseguremos de que se cargue aquí también por si acaso

console.log("--- DEBUG CONEXIÓN ---");
console.log("DB_NAME:", process.env.DB_NAME ? "Cargado" : "NO CARGADO");
console.log("DB_USER:", process.env.DB_USER ? "Cargado" : "NO CARGADO");
console.log("DB_PASSWORD:", process.env.DB_PASSWORD ? "Cargada (longitud: " + process.env.DB_PASSWORD.length + ")" : "NO CARGADA");
console.log("DB_HOST:", process.env.DB_HOST ? "Cargado" : "NO CARGADO");
console.log("----------------------");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

module.exports = sequelize;
