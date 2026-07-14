function manejarErrores(err, req, res, next) {
  console.error(err);

  if (err.name === 'SequelizeUniqueConstraintError') {
    const campo = err.errors?.[0]?.path || 'campo';
    return res.status(409).json({ error: `Ya existe un registro con ese ${campo}.` });
  }

  if (err.name === 'SequelizeValidationError') {
    const mensaje = err.errors?.[0]?.message || 'Datos inválidos.';
    return res.status(400).json({ error: mensaje });
  }

  if (err.isJoi) {
    return res.status(400).json({ error: err.details[0].message });
  }

  return res.status(err.status || 500).json({
    error: err.message || 'Ocurrió un error inesperado en el servidor.',
  });
}

module.exports = manejarErrores;
