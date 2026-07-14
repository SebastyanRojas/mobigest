const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const { sequelize, Usuario, Cliente } = require('../models');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registroLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de registro. Intenta nuevamente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ 1. AÑADIMOS ROL Y ESPECIALIDAD AL ESQUEMA PERMITIDO
const registroSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  telefono: Joi.string().min(7).max(20).required(),
  direccion: Joi.string().allow('', null).optional(),
  rol: Joi.string().valid('admin', 'tecnico', 'cliente').optional().default('cliente'),
  especialidad: Joi.string().allow('', null).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(4).required(),
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) throw error;

    const usuario = await Usuario.findOne({ where: { email: value.email.toLowerCase() } });
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const passwordOk = await bcrypt.compare(value.password, usuario.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const token = jwt.sign(
      {
        id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, email: usuario.email, clienteId: usuario.clienteId,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, clienteId: usuario.clienteId,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ✅ 2. MODIFICAMOS EL REGISTRO PARA QUE ACEPTE PERSONAL
router.post('/registro', registroLimiter, async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = registroSchema.validate(req.body);
    if (error) throw error;

    const existente = await Usuario.findOne({ where: { email: value.email.toLowerCase() }, transaction: t });
    if (existente) {
      await t.rollback();
      return res.status(409).json({ error: 'Ya existe una cuenta registrada con ese correo.' });
    }

    const passwordHash = await bcrypt.hash(value.password, 10);
    const rolFinal = value.rol || 'cliente';
    
    let clienteId = null;

    // Solo creamos un registro en la tabla "Cliente" si es un cliente normal
    if (rolFinal === 'cliente') {
      const cliente = await Cliente.create({
        nombre: value.nombre,
        telefono: value.telefono,
        email: value.email.toLowerCase(),
        direccion: value.direccion || null,
      }, { transaction: t });
      clienteId = cliente.id;
    }

    // Creamos el Usuario (Puede ser admin, tecnico o cliente)
    const usuario = await Usuario.create({
      nombre: value.nombre,
      email: value.email.toLowerCase(),
      passwordHash,
      rol: rolFinal,
      clienteId: clienteId, // Será null para el personal, lo cual es correcto
      telefono: value.telefono,
      especialidad: value.especialidad || null
    }, { transaction: t });

    await t.commit();

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, email: usuario.email, clienteId: clienteId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.status(201).json({
      token,
      usuario: {
        id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, clienteId: clienteId,
      },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
});

router.get('/me', autenticar, async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: ['id', 'nombre', 'email', 'rol', 'activo', 'clienteId', 'especialidad', 'telefono'],
      include: [{ model: Cliente, as: 'cliente' }],
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(usuario);
  } catch (err) {
    next(err);
  }
});

module.exports = router;