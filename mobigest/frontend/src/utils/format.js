export function formatoCLP(valor) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(valor || 0);
}

export function formatoFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatoFechaHora(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const ESTADO_CONFIG = {
  recibido: { label: 'Recibido', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  en_diagnostico: { label: 'En diagnóstico', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  en_reparacion: { label: 'En reparación', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  listo: { label: 'Listo para entrega', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  entregado: { label: 'Entregado', color: 'bg-green-100 text-green-800', dot: 'bg-green-600' },
  no_reparable: { label: 'No reparable', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

export const ESTADOS_ORDEN = ['recibido', 'en_diagnostico', 'en_reparacion', 'listo', 'entregado', 'no_reparable'];

// Pipeline visible para el cliente (sin el estado "no_reparable", que se muestra aparte).
export const ESTADOS_PIPELINE = ['recibido', 'en_diagnostico', 'en_reparacion', 'listo', 'entregado'];

export function tiempoTranscurrido(fecha) {
  if (!fecha) return '—';
  const ms = Date.now() - new Date(fecha).getTime();
  const minutos = Math.floor(ms / 60000);
  if (minutos < 60) return `${Math.max(minutos, 0)} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h`;
  const dias = Math.floor(horas / 24);
  return `${dias} día${dias === 1 ? '' : 's'}`;
}
