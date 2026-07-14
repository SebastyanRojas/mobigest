function calcularTotales(orden, repuestosUsados = []) {
  const totalRepuestos = repuestosUsados.reduce(
    (acc, r) => acc + Number(r.cantidad) * Number(r.precioAplicado),
    0
  );
  const manoObra = Number(orden.presupuestoManoObra || 0);
  const anticipo = Number(orden.anticipo || 0);
  const total = manoObra + totalRepuestos;
  const saldo = total - anticipo;
  return {
    totalRepuestos: Number(totalRepuestos.toFixed(2)),
    manoObra: Number(manoObra.toFixed(2)),
    total: Number(total.toFixed(2)),
    anticipo: Number(anticipo.toFixed(2)),
    saldo: Number(saldo.toFixed(2)),
  };
}

async function generarCodigoOrden(OrdenServicio) {
  const anio = new Date().getFullYear();
  const count = await OrdenServicio.count();
  const numero = String(count + 1).padStart(5, '0');
  return `OS-${anio}-${numero}`;
}

module.exports = { calcularTotales, generarCodigoOrden };
