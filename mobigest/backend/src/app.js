const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const manejarErrores = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const dispositivosRoutes = require('./routes/dispositivos');
const repuestosRoutes = require('./routes/repuestos');
const ordenesRoutes = require('./routes/ordenes');
const mensajesRoutes = require('./routes/mensajes');
const kpisRoutes = require('./routes/kpis');
const pdfRoutes = require('./routes/pdf');
const notificacionesRoutes = require('./routes/notificaciones');
const usuariosRoutes = require('./routes/usuarios');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ✅ AQUÍ ESTÁ EL CAMBIO: Límite ampliado a 50mb para recibir las fotos en Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', servicio: 'mobigest-api', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clientes', clientesRoutes);
app.use('/api/v1/dispositivos', dispositivosRoutes);
app.use('/api/v1/repuestos', repuestosRoutes);
app.use('/api/v1/ordenes', ordenesRoutes);
app.use('/api/v1/mensajes', mensajesRoutes);
app.use('/api/v1/kpis', kpisRoutes);
app.use('/api/v1', pdfRoutes);
app.use('/api/v1/notificaciones', notificacionesRoutes);
app.use('/api/v1/usuarios', usuariosRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use(manejarErrores);

module.exports = app;