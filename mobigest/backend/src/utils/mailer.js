const nodemailer = require('nodemailer');
// const { generarPDFBuffer } = require('./pdfGenerator'); // <-- DESACTIVADO TEMPORALMENTE PARA LA DEMO

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 1. Alerta de Stock
const enviarAlertaStock = async (repuesto) => {
  const mailOptions = {
    from: `"Sistema MobiGest" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `⚠️ ALERTA DE STOCK: ${repuesto.nombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #e11d48;">Alerta de Inventario Crítico</h2>
        <p>El sistema ha detectado un nivel de stock bajo.</p>
        <p><strong>Repuesto:</strong> ${repuesto.nombre}</p>
        <p><strong>Stock Actual:</strong> ${repuesto.stockActual} unidades.</p>
      </div>
    `
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("[MAILER] Error al enviar alerta:", error);
  }
};

// 2. Encuesta (SIN PDF POR AHORA PARA EVITAR ERRORES)
const enviarEncuestaSatisfaccion = async (emailCliente, orden) => {
  try {
    // Definimos los destinatarios: Cliente + Tu correo
    const emailAdmin = 'sebastyanandres@gmail.com';
    const destinatarios = emailCliente ? [emailCliente, emailAdmin] : [emailAdmin];
    
    // Link SIEMPRE público (sin login)
    const urlEncuesta = `http://localhost:5173/calificar/${orden.id}`;

    const mailOptions = {
      from: `"MobiGest Taller" <${process.env.EMAIL_USER}>`,
      to: destinatarios,
      subject: `🎉 Tu equipo está listo - Orden ${orden.codigo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #f8fafc;">
          <h2 style="color: #0f172a; text-align: center;">¡Tu equipo ha sido entregado!</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">Hola, esperamos que estés disfrutando de tu equipo reparado.</p>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">
            Valoramos tu opinión. Por favor, haz clic abajo para calificar nuestro servicio. 
            Es un proceso rápido y no necesitas iniciar sesión.
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${urlEncuesta}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              ⭐ Calificar Servicio
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Gracias por confiar en MobiGest.</p>
        </div>
      `
      // ARCHIVO ADJUNTO DESACTIVADO TEMPORALMENTE
      // attachments: [{
      //   filename: `Comprobante_${orden.codigo}.pdf`,
      //   content: pdfBuffer,
      //   contentType: 'application/pdf'
      // }]
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ [MAILER] ¡ÉXITO! Correo enviado para orden ${orden.codigo} a: ${destinatarios}`);
  } catch (error) {
    console.error('❌ [MAILER] No se pudo enviar el correo:', error);
  }
};

module.exports = { enviarAlertaStock, enviarEncuestaSatisfaccion };