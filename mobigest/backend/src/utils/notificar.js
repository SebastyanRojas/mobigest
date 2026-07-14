const { Notificacion, Usuario } = require('../models');

/**
 * Crea una notificación en la app para un usuario específico.
 * También es el punto de extensión para enviar email/SMS/push reales:
 * si en el futuro se agrega un proveedor (ej. nodemailer, Twilio),
 * basta con llamar a esa integración aquí mismo.
 */
async function notificar({
  usuarioId, ordenId = null, tipo = 'general', titulo, mensaje,
}) {
  if (!usuarioId) return null;
  const notif = await Notificacion.create({
    usuarioId, ordenId, tipo, titulo, mensaje,
  });

  // Punto de extensión: envío de email/SMS.
  // const usuario = await Usuario.findByPk(usuarioId);
  // if (usuario?.email) await enviarEmail(usuario.email, titulo, mensaje);

  return notif;
}

/** Notifica a todos los administradores (ej. cuando un cliente crea una solicitud). */
async function notificarAdmins({ ordenId = null, tipo = 'general', titulo, mensaje }) {
  const admins = await Usuario.findAll({ where: { rol: 'admin', activo: true } });
  await Promise.all(
    admins.map((a) => notificar({
      usuarioId: a.id, ordenId, tipo, titulo, mensaje,
    }))
  );
}

module.exports = { notificar, notificarAdmins };
