require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  sequelize, Usuario, Cliente, Dispositivo, Repuesto, OrdenServicio, RepuestoUsado, Notificacion, Mensaje,
} = require('../models');

async function seed() {
  await sequelize.sync({ force: true });
  console.log('Tablas recreadas.');

  const passwordHash = await bcrypt.hash('mobigest2026', 10);
  const admin = await Usuario.create({
    nombre: 'Camila Rojas',
    email: 'admin@mobigest.cl',
    passwordHash,
    rol: 'admin',
  });
  const tecnico = await Usuario.create({
    nombre: 'Matías Soto',
    email: 'tecnico@mobigest.cl',
    passwordHash,
    rol: 'tecnico',
  });
  console.log('Usuarios creados: admin@mobigest.cl / tecnico@mobigest.cl (clave: mobigest2026)');

  const clientes = await Cliente.bulkCreate([
    { nombre: 'Javiera Muñoz', telefono: '+56912345678', email: 'javiera.munoz@gmail.com', direccion: 'Av. Providencia 1234, Santiago' },
    { nombre: 'Roberto Pérez', telefono: '+56923456789', email: 'roberto.perez@gmail.com', direccion: 'Calle Los Aromos 567, Ñuñoa' },
    { nombre: 'Fernanda Castro', telefono: '+56934567890', email: 'fcastro@hotmail.com', direccion: 'Pasaje Las Rosas 89, Maipú' },
    { nombre: 'Diego Fuentes', telefono: '+56945678901', email: null, direccion: 'Av. Vicuña Mackenna 2200, San Joaquín' },
  ]);
  console.log(`${clientes.length} clientes creados.`);

  // Cuenta de portal para el primer cliente, de modo que la demo muestre
  // notificaciones, chat y aprobación de presupuesto de punta a punta.
  const clienteUsuario = await Usuario.create({
    nombre: clientes[0].nombre,
    email: clientes[0].email,
    passwordHash,
    rol: 'cliente',
    clienteId: clientes[0].id,
  });
  console.log('Cuenta de cliente creada: javiera.munoz@gmail.com (clave: mobigest2026)');

  const dispositivos = await Dispositivo.bulkCreate([
    { imei: '490154203237518', marca: 'Samsung', modelo: 'Galaxy S22', color: 'Negro', observaciones: 'Pantalla con grietas en esquina superior', clienteId: clientes[0].id },
    { imei: '356938035643809', marca: 'Apple', modelo: 'iPhone 13', color: 'Azul', observaciones: 'No carga, posible falla en pin de carga', clienteId: clientes[1].id },
    { imei: '353627876435910', marca: 'Xiaomi', modelo: 'Redmi Note 12', color: 'Gris', observaciones: 'Batería se agota muy rápido', clienteId: clientes[2].id },
    { imei: '012345678912345', marca: 'Apple', modelo: 'iPhone 11', color: 'Blanco', observaciones: 'Cayó al agua, no enciende', clienteId: clientes[3].id },
    { imei: '865406035673432', marca: 'Motorola', modelo: 'Moto G73', color: 'Verde', observaciones: 'Botón de encendido no responde', clienteId: clientes[0].id },
  ]);
  console.log(`${dispositivos.length} dispositivos creados.`);

  const repuestos = await Repuesto.bulkCreate([
    { nombre: 'Pantalla Galaxy S22 OLED', codigo: 'PNT-S22-001', precioUnitario: 85000, stockActual: 6, stockMinimo: 2, proveedor: 'ImportCell SpA' },
    { nombre: 'Pin de carga iPhone 13', codigo: 'PIN-IP13-002', precioUnitario: 18000, stockActual: 1, stockMinimo: 3, proveedor: 'MovilParts Chile' },
    { nombre: 'Batería Redmi Note 12', codigo: 'BAT-RN12-003', precioUnitario: 22000, stockActual: 8, stockMinimo: 2, proveedor: 'ImportCell SpA' },
    { nombre: 'Kit limpieza por daño líquido', codigo: 'KIT-AGUA-004', precioUnitario: 12000, stockActual: 15, stockMinimo: 4, proveedor: 'MovilParts Chile' },
    { nombre: 'Flex de botón de encendido', codigo: 'FLX-PWR-005', precioUnitario: 9000, stockActual: 1, stockMinimo: 2, proveedor: 'TechSupply Ltda' },
    { nombre: 'Mica templada universal', codigo: 'MICA-UNI-006', precioUnitario: 3000, stockActual: 40, stockMinimo: 10, proveedor: 'TechSupply Ltda' },
  ]);
  console.log(`${repuestos.length} repuestos creados.`);

  const hoy = new Date();
  const haceDias = (n) => new Date(hoy.getTime() - n * 24 * 60 * 60 * 1000);

  const orden1 = await OrdenServicio.create({
    codigo: 'OS-2026-00001',
    clienteId: clientes[0].id,
    dispositivoId: dispositivos[0].id,
    usuarioId: tecnico.id,
    estado: 'entregado',
    fallaReportada: 'Pantalla rota tras caída, cliente solicita reemplazo completo.',
    diagnostico: 'Se confirma quiebre del panel OLED. Resto del equipo funciona correctamente. Se procede a reemplazo de pantalla.',
    checklist: { pantalla: 'dañada', bateria: 'ok', placa: 'ok', camaras: 'ok', botones: 'ok' },
    metodoDesbloqueo: 'PIN: 0000 (entregado por el cliente)',
    tieneGarantia: true,
    garantiaHasta: haceDias(-60),
    presupuestoManoObra: 15000,
    anticipo: 30000,
    fechaCompromiso: haceDias(7),
    presupuestoEstado: 'aprobado',
    createdAt: haceDias(9),
  });
  await RepuestoUsado.create({ ordenId: orden1.id, repuestoId: repuestos[0].id, cantidad: 1, precioAplicado: repuestos[0].precioUnitario });
  await orden1.update({
    fechaEntrega: haceDias(6),
    calificacion: 5,
    calificacionComentario: 'Excelente atención, quedó como nuevo y a tiempo. ¡Gracias!',
  });

  const orden2 = await OrdenServicio.create({
    codigo: 'OS-2026-00002',
    clienteId: clientes[1].id,
    dispositivoId: dispositivos[1].id,
    usuarioId: tecnico.id,
    estado: 'en_reparacion',
    fallaReportada: 'El equipo no carga la batería, ya probó con otro cargador.',
    diagnostico: 'Pin de carga con pines doblados y oxidación leve. Se requiere reemplazo del conector.',
    checklist: { pantalla: 'ok', bateria: 'ok', placa: 'revisar', camaras: 'ok', botones: 'ok' },
    metodoDesbloqueo: 'Face ID (no requiere PIN)',
    tieneGarantia: false,
    presupuestoManoObra: 12000,
    anticipo: 10000,
    fechaCompromiso: haceDias(-1),
    presupuestoEstado: 'pendiente',
    createdAt: haceDias(3),
  });
  await RepuestoUsado.create({ ordenId: orden2.id, repuestoId: repuestos[1].id, cantidad: 1, precioAplicado: repuestos[1].precioUnitario });

  const orden3 = await OrdenServicio.create({
    codigo: 'OS-2026-00003',
    clienteId: clientes[2].id,
    dispositivoId: dispositivos[2].id,
    usuarioId: tecnico.id,
    estado: 'en_diagnostico',
    fallaReportada: 'Batería se descarga en menos de 3 horas de uso normal.',
    checklist: { pantalla: 'ok', bateria: 'revisar', placa: 'ok', camaras: 'ok', botones: 'ok' },
    tieneGarantia: false,
    presupuestoManoObra: 0,
    anticipo: 0,
    fechaCompromiso: haceDias(-2),
    createdAt: haceDias(1),
  });

  const orden4 = await OrdenServicio.create({
    codigo: 'OS-2026-00004',
    clienteId: clientes[3].id,
    dispositivoId: dispositivos[3].id,
    usuarioId: tecnico.id,
    estado: 'recibido',
    fallaReportada: 'Equipo cayó en agua de mar, no enciende desde entonces.',
    tieneGarantia: false,
    presupuestoManoObra: 0,
    anticipo: 5000,
    fechaCompromiso: haceDias(-5),
    createdAt: new Date(),
  });

  const orden5 = await OrdenServicio.create({
    codigo: 'OS-2026-00005',
    clienteId: clientes[0].id,
    dispositivoId: dispositivos[4].id,
    usuarioId: tecnico.id,
    estado: 'listo',
    fallaReportada: 'Botón de encendido no responde al presionarlo.',
    diagnostico: 'Flex del botón de encendido dañado por uso. Se reemplazó el componente y se realizaron pruebas de funcionamiento.',
    checklist: { pantalla: 'ok', bateria: 'ok', placa: 'ok', camaras: 'ok', botones: 'reparado' },
    tieneGarantia: true,
    garantiaHasta: haceDias(-90),
    presupuestoManoObra: 10000,
    anticipo: 8000,
    fechaCompromiso: haceDias(-1),
    createdAt: haceDias(4),
  });
  await RepuestoUsado.create({ ordenId: orden5.id, repuestoId: repuestos[4].id, cantidad: 1, precioAplicado: repuestos[4].precioUnitario });

  // Orden 6: solicitud creada por el propio cliente desde el portal, aún sin técnico asignado.
  const orden6 = await OrdenServicio.create({
    codigo: 'OS-2026-00006',
    clienteId: clientes[0].id,
    dispositivoId: dispositivos[0].id,
    usuarioId: null,
    estado: 'recibido',
    fallaReportada: 'El altavoz suena distorsionado al máximo volumen.',
    origen: 'cliente',
    presupuestoEstado: 'no_aplica',
    createdAt: new Date(),
  });

  console.log('6 órdenes de servicio de ejemplo creadas.');

  // Notificaciones de ejemplo
  await Notificacion.bulkCreate([
    {
      usuarioId: admin.id,
      ordenId: orden6.id,
      tipo: 'nueva_solicitud',
      titulo: 'Nueva solicitud de servicio',
      mensaje: `Un cliente solicitó servicio: orden ${orden6.codigo}. Requiere asignación de técnico.`,
      leida: false,
    },
    {
      usuarioId: clienteUsuario.id,
      ordenId: orden1.id,
      tipo: 'cambio_estado',
      titulo: `Tu orden ${orden1.codigo} cambió de estado`,
      mensaje: 'Ahora está: "Entregado".',
      leida: true,
    },
    {
      usuarioId: clienteUsuario.id,
      ordenId: orden5.id,
      tipo: 'cambio_estado',
      titulo: `Tu orden ${orden5.codigo} cambió de estado`,
      mensaje: 'Ahora está: "Listo para retiro". Pasa a buscar tu equipo cuando gustes.',
      leida: false,
    },
  ]);

  // Mensajes de ejemplo (chat cliente-técnico)
  await Mensaje.bulkCreate([
    {
      ordenId: orden2.id,
      autorId: tecnico.id,
      autorRol: 'tecnico',
      contenido: 'Hola Roberto, confirmamos que el pin de carga llegó dañado por oxidación. Ya pedimos el repuesto.',
    },
    {
      ordenId: orden5.id,
      autorId: tecnico.id,
      autorRol: 'tecnico',
      contenido: 'Hola Javiera, tu equipo ya está listo. Puedes pasar a retirarlo cuando gustes.',
    },
  ]);

  console.log('\n=== DATOS DE ACCESO PARA LA DEMO ===');
  console.log('Administrador:  admin@mobigest.cl          / mobigest2026');
  console.log('Técnico:        tecnico@mobigest.cl        / mobigest2026');
  console.log('Cliente:        javiera.munoz@gmail.com    / mobigest2026');

  await sequelize.close();
}

seed().catch((err) => {
  console.error('Error al ejecutar el seed:', err);
  process.exit(1);
});
