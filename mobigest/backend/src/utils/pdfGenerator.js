const PDFDocument = require('pdfkit');
const { calcularTotales } = require('./ordenHelpers');

const ESTADO_LABEL = {
  recibido: 'Equipo Recibido',
  en_diagnostico: 'En Diagnóstico',
  espera_aprobacion: 'Esperando Aprobación',
  en_reparacion: 'En Reparación',
  qa: 'Control de Calidad',
  listo: 'Listo para Retiro',
  entregado: 'Entregado al Cliente',
  no_reparable: 'Pérdida / No Reparable',
};

function formatoCLP(valor) {
  return '$ ' + Number(valor || 0).toLocaleString('es-CL');
}

function generarComprobantePDF(orden, res) {
  // Ajuste de márgenes para un diseño más limpio
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  
  const totales = calcularTotales(orden, orden.repuestosUsados || []);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="ORDEN_${orden.codigo}.pdf"`);
  doc.pipe(res);

  // ==========================================
  // HEADER CORPORATIVO
  // ==========================================
  doc.rect(0, 0, 595, 100).fill('#0F172A'); // Fondo Header Dark Mode
  
  doc.fillColor('#FFFFFF').fontSize(26).font('Helvetica-Bold').text('MobiGest', 40, 30);
  doc.fillColor('#94A3B8').fontSize(10).font('Helvetica').text('Plataforma de Gestión Técnica Premium', 40, 60);
  
  doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text(`FICHA TÉCNICA`, 0, 35, { align: 'right', margins: { right: 40 }});
  doc.fillColor('#38BDF8').fontSize(12).text(orden.codigo, 0, 58, { align: 'right', margins: { right: 40 }});
  
  // ==========================================
  // METADATOS Y ESTADO DE LA ORDEN
  // ==========================================
  let y = 120;
  
  // Bloque Izquierdo (Fechas)
  doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('FECHA Y HORA DE INGRESO', 40, y);
  doc.fillColor('#0F172A').fontSize(10).font('Helvetica').text(`${new Date(orden.createdAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })} hrs`, 40, y + 12);
  
  // Bloque Central (Técnico)
  doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('TÉCNICO ASIGNADO', 230, y);
  doc.fillColor('#0F172A').fontSize(10).font('Helvetica').text(`${orden.tecnico?.nombre || 'No asignado (En Recepción)'}`, 230, y + 12);
  
  // Bloque Derecho (Estado Actual)
  doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('ESTADO OPERATIVO', 400, y);
  doc.fillColor('#10B981').fontSize(10).font('Helvetica-Bold').text(ESTADO_LABEL[orden.estado] || orden.estado.toUpperCase(), 400, y + 12);
  
  y += 45;
  doc.moveTo(40, y).lineTo(555, y).strokeColor('#E2E8F0').lineWidth(1).stroke();
  y += 20;

  // ==========================================
  // DATOS DEL CLIENTE Y DISPOSITIVO (A dos columnas)
  // ==========================================
  // Columna Cliente
  doc.rect(40, y, 245, 80).fill('#F8FAFC');
  doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('DATOS DEL PROPIETARIO', 55, y + 15);
  doc.fillColor('#334155').fontSize(10).font('Helvetica').text(`Nombre: ${orden.cliente?.nombre || 'No registrado'}`, 55, y + 35);
  doc.text(`Teléfono: ${orden.cliente?.telefono || 'No registrado'}`, 55, y + 50);
  doc.text(`Email: ${orden.cliente?.email || 'No registrado'}`, 55, y + 65);

  // Columna Dispositivo
  doc.rect(310, y, 245, 80).fill('#F8FAFC');
  doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('ESPECIFICACIONES DEL EQUIPO', 325, y + 15);
  doc.fillColor('#334155').fontSize(10).font('Helvetica').text(`Marca/Modelo: ${orden.dispositivo?.marca || ''} ${orden.dispositivo?.modelo || ''}`, 325, y + 35);
  doc.font('Helvetica-Bold').text(`IMEI: ${orden.dispositivo?.imei || 'Sin registro'}`, 325, y + 50);
  doc.font('Helvetica').text(`Color: ${orden.dispositivo?.color || 'No especificado'}`, 325, y + 65);

  y += 105;

  // ==========================================
  // REPORTE CLÍNICO (FALLA Y DIAGNÓSTICO)
  // ==========================================
  doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('REPORTE TÉCNICO', 40, y);
  y += 18;
  
  doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('Motivo de Ingreso (Reportado por cliente):', 40, y);
  y += 12;
  doc.fillColor('#334155').fontSize(10).font('Helvetica').text(orden.fallaReportada || 'Sin descripción inicial.', 40, y, { width: 515, align: 'justify' });
  y = doc.y + 15;

  if (orden.diagnostico) {
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('Procedimiento / Bitácora Técnica (Taller):', 40, y);
    y += 12;
    doc.fillColor('#334155').fontSize(10).font('Helvetica').text(orden.diagnostico, 40, y, { width: 515, align: 'justify' });
    y = doc.y + 20;
  }

  doc.moveTo(40, y).lineTo(555, y).strokeColor('#E2E8F0').stroke();
  y += 20;

  // ==========================================
  // TABLA DE COMPONENTES INSTALADOS
  // ==========================================
  doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('COMPONENTES Y PIEZAS ACOTADAS', 40, y);
  y += 15;

  const usados = orden.repuestosUsados || [];
  
  // Cabecera Tabla
  doc.rect(40, y, 515, 22).fill('#1E293B');
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
  doc.text('Detalle del Componente', 50, y + 6);
  doc.text('Cantidad', 320, y + 6, { align: 'center', width: 60 });
  doc.text('V. Unitario', 390, y + 6, { align: 'center', width: 70 });
  doc.text('Subtotal', 470, y + 6, { align: 'right', width: 75 });
  y += 22;

  // Cuerpo Tabla
  doc.font('Helvetica').fontSize(10);
  if (usados.length === 0) {
    doc.fillColor('#64748B').text('No se asociaron repuestos físicos a esta orden de trabajo.', 50, y + 10);
    y += 35;
  } else {
    usados.forEach((u, i) => {
      const bg = i % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
      doc.rect(40, y, 515, 20).fill(bg);
      doc.fillColor('#334155');
      doc.text(u.repuesto?.nombre || 'Componente Desconocido', 50, y + 5, { width: 260, height: 14, ellipsis: true });
      doc.text(String(u.cantidad), 320, y + 5, { align: 'center', width: 60 });
      doc.text(formatoCLP(u.precioAplicado), 390, y + 5, { align: 'center', width: 70 });
      doc.text(formatoCLP(u.cantidad * u.precioAplicado), 470, y + 5, { align: 'right', width: 75 });
      y += 20;
    });
    y += 10;
  }

  // ==========================================
  // MATEMÁTICA Y TOTALES
  // ==========================================
  // Dibujamos un bloque oscuro para los totales
  doc.rect(340, y, 215, 110).fill('#F1F5F9');
  
  const tx = 355;
  let ty = y + 15;

  doc.font('Helvetica').fontSize(10).fillColor('#475569');
  doc.text('Valor del Trabajo:', tx, ty);
  doc.font('Helvetica-Bold').fillColor('#0F172A').text(formatoCLP(totales.manoObra), tx + 100, ty, { align: 'right', width: 85 });
  ty += 18;
  
  doc.font('Helvetica').fillColor('#475569');
  doc.text('Costo Piezas:', tx, ty);
  doc.font('Helvetica-Bold').fillColor('#0F172A').text(formatoCLP(totales.totalRepuestos), tx + 100, ty, { align: 'right', width: 85 });
  ty += 18;
  
  doc.moveTo(355, ty).lineTo(540, ty).strokeColor('#CBD5E1').stroke();
  ty += 8;

  doc.font('Helvetica-Bold').fillColor('#10B981'); // Verde
  doc.text('Abono Previo:', tx, ty);
  doc.text('- ' + formatoCLP(totales.anticipo), tx + 100, ty, { align: 'right', width: 85 });
  ty += 22;

  // SALDO PENDIENTE (Destacado)
  doc.rect(340, ty, 215, 30).fill('#EF4444'); // Fondo Rojo Vivo
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF');
  doc.text('FALTA POR PAGAR', tx, ty + 10);
  doc.fontSize(14).text(formatoCLP(totales.saldo), tx + 80, ty + 8, { align: 'right', width: 105 });

  // ==========================================
  // MÓDULO DE GARANTÍA
  // ==========================================
  // Lo dibujamos a la izquierda del cuadro de totales
  if (orden.tieneGarantia) {
    doc.rect(40, y, 280, 110).fill('#F0FDF4'); // Fondo verde muy claro
    doc.rect(40, y, 4, 110).fill('#22C55E'); // Borde lateral verde
    
    doc.fillColor('#166534').fontSize(10).font('Helvetica-Bold').text('CERTIFICADO DE GARANTÍA', 55, y + 15);
    doc.fontSize(9).font('Helvetica').text(`Cobertura válida hasta: ${orden.garantiaHasta ? new Date(orden.garantiaHasta).toLocaleDateString('es-CL') : 'Fecha no especificada'}`, 55, y + 30);
    
    if (orden.condicionesGarantia) {
      doc.fillColor('#15803D').fontSize(8).font('Helvetica-Bold').text('Términos y Condiciones:', 55, y + 45);
      doc.fillColor('#166534').fontSize(8).font('Helvetica').text(orden.condicionesGarantia, 55, y + 55, { width: 250, align: 'justify' });
    }
  }

  // ==========================================
  // FIRMAS Y FOOTER
  // ==========================================
  y = 700; // Posición fija para firmas
  
  doc.moveTo(60, y).lineTo(250, y).strokeColor('#94A3B8').stroke();
  doc.fontSize(9).fillColor('#475569').font('Helvetica').text('Firma del Propietario', 60, y + 8, { width: 190, align: 'center' });
  doc.fontSize(7).text('(Aceptación de estado y presupuesto)', 60, y + 20, { width: 190, align: 'center' });

  doc.moveTo(340, y).lineTo(530, y).strokeColor('#94A3B8').stroke();
  doc.fontSize(9).fillColor('#475569').font('Helvetica').text('Firma del Técnico Responsable', 340, y + 8, { width: 190, align: 'center' });
  doc.fontSize(7).text(orden.tecnico?.nombre || 'Personal Autorizado', 340, y + 20, { width: 190, align: 'center' });

  // Pie de página
  doc.rect(0, 800, 595, 42).fill('#F8FAFC');
  doc.fontSize(8).fillColor('#94A3B8').font('Helvetica').text(
    'MobiGest Pro Edition — Documento legal generado automáticamente por el sistema. El cliente debe presentar este documento para retirar su equipo.',
    40, 815, { width: 515, align: 'center' }
  );

  doc.end();
}

module.exports = { generarComprobantePDF };