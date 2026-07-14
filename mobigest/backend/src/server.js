const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 4000;

async function iniciar() {
  try {
    await sequelize.authenticate();
    console.log('✓ Conexión a la base de datos establecida.');

    await sequelize.sync(); // En producción real se recomienda usar migraciones en vez de sync()

    app.listen(PORT, () => {
      console.log(`✓ MobiGest API escuchando en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('✗ No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  }
}

iniciar();
