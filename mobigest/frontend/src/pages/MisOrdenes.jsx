import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Smartphone, Wrench } from 'lucide-react';
import api from '../api/client';
import EmptyState from '../components/EmptyState';
import EstadoBadge from '../components/EstadoBadge';
import { formatoCLP, formatoFecha, ESTADOS_PIPELINE, ESTADO_CONFIG } from '../utils/format';

export default function MisOrdenes() {
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/ordenes').then(({ data }) => setOrdenes(data)).finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return <div className="flex justify-center py-24 text-slate-400"><Loader2 className="animate-spin" size={28} /></div>;
  }

  const activas = ordenes.filter((o) => !['entregado', 'no_reparable'].includes(o.estado));
  const historial = ordenes.filter((o) => ['entregado', 'no_reparable'].includes(o.estado));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mis Órdenes de Servicio</h1>
          <p className="text-slate-500 text-sm mt-0.5">Sigue el estado de tus reparaciones en tiempo real.</p>
        </div>
        <Link to="/solicitar" className="btn-primary"><Plus size={16} /> Solicitar servicio</Link>
      </div>

      {ordenes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Wrench}
            title="Aún no tienes órdenes de servicio"
            description="Cuando solicites una reparación, aparecerá aquí con su estado actualizado."
            action={<Link to="/solicitar" className="btn-primary"><Plus size={16} /> Solicitar servicio</Link>}
          />
        </div>
      ) : (
        <>
          {activas.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">En curso</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {activas.map((o) => <TarjetaOrden key={o.id} orden={o} />)}
              </div>
            </section>
          )}

          {historial.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Historial</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {historial.map((o) => <TarjetaOrden key={o.id} orden={o} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function TarjetaOrden({ orden }) {
  const idx = ESTADOS_PIPELINE.indexOf(orden.estado);

  return (
    <Link to={`/mis-ordenes/${orden.id}`} className="card p-5 block hover:shadow-elevated transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-mono text-sm font-semibold text-brand-700">{orden.codigo}</p>
          <p className="text-slate-700 font-medium mt-0.5 flex items-center gap-1.5">
            <Smartphone size={14} className="text-slate-400" /> {orden.dispositivo?.marca} {orden.dispositivo?.modelo}
          </p>
        </div>
        <EstadoBadge estado={orden.estado} />
      </div>

      {orden.estado !== 'no_reparable' && (
        <div className="flex items-center gap-1 mb-3">
          {ESTADOS_PIPELINE.map((e, i) => (
            <div key={e} className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-brand-500' : 'bg-slate-100'}`} title={ESTADO_CONFIG[e].label} />
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500 line-clamp-2">{orden.fallaReportada}</p>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 text-xs text-slate-500">
        <span>Ingresada el {formatoFecha(orden.createdAt)}</span>
        <span className="font-semibold text-slate-700">{formatoCLP(orden.totales?.total)}</span>
      </div>

      {/* AQUÍ ESTÁ EL CAMBIO CLAVE: La alerta solo aparece en Diagnóstico */}
      {orden.presupuestoEstado === 'pendiente' && orden.estado === 'en_diagnostico' && (
        <p className="mt-2 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
          ⚠️ Tienes un presupuesto pendiente de aprobación
        </p>
      )}

      {orden.estado === 'entregado' && !orden.calificacion && (
        <p className="mt-2 text-xs font-medium text-brand-700 bg-brand-50 rounded-lg px-2.5 py-1.5 border border-brand-100">
          ⭐ Cuéntanos cómo fue tu experiencia — califica el servicio
        </p>
      )}
    </Link>
  );
}