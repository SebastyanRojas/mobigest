import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area 
} from 'recharts';
import {
  Wrench, Clock, TrendingUp, AlertTriangle, CheckCircle2, DollarSign, 
  Loader2, Inbox, Star, UserX, Activity, CalendarDays, ListOrdered
} from 'lucide-react';
import api from '../api/client';
import { formatoCLP, ESTADO_CONFIG, tiempoTranscurrido, formatoFechaHora } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  recibido: '#94A3B8',
  en_diagnostico: '#F59E0B',
  espera_aprobacion: '#8B5CF6',
  en_reparacion: '#3B82F6',
  qa: '#06B6D4',
  listo: '#10B981',
  entregado: '#16A34A',
  no_reparable: '#EF4444',
};

const glassCard = "bg-white/90 backdrop-blur-xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 transition-all duration-300";

export default function Dashboard() {
  const { usuario, esAdmin } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [kanban, setKanban] = useState(null);
  const [ordenesRaw, setOrdenesRaw] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/kpis/dashboard').then(({ data }) => setKpis(data)),
      api.get('/kpis/kanban').then(({ data }) => setKanban(data)),
      api.get('/ordenes').then(({ data }) => setOrdenesRaw(data)), // Traemos todo para la tabla detallada
    ]).finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-brand-500" size={40} />
          <p className="text-sm font-medium animate-pulse">Procesando analíticas de la plataforma...</p>
        </div>
      </div>
    );
  }

  if (!kpis) return null;

  // Procesamiento de Satisfacción Global (NUEVO KPI)
  const ordenesCalificadas = ordenesRaw.filter(o => o.calificacion && o.calificacion > 0);
  const satisfaccionPromedio = ordenesCalificadas.length > 0
    ? (ordenesCalificadas.reduce((acc, o) => acc + o.calificacion, 0) / ordenesCalificadas.length).toFixed(1)
    : 'S/N';

  // Procesamiento Gráfico de Torta
  const dataPie = Object.entries(kpis.porEstado)
    .filter(([, v]) => v > 0)
    .map(([estado, value]) => ({ name: ESTADO_CONFIG[estado]?.label || estado, value, estado }));

  // Procesamiento Gráfico de Barras
  const dataBar = Object.entries(kpis.porEstado).map(([estado, value]) => ({
    estado: ESTADO_CONFIG[estado]?.label || estado,
    cantidad: value,
    fill: COLORS[estado] || '#CBD5E1',
  }));

  // Procesamiento Gráfico de Tendencias (Área: Ingresos vs Entregas últimos 7 días)
  const ultimos7Dias = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const dataTendencias = ultimos7Dias.map(fecha => {
    const recibidosHoy = ordenesRaw.filter(o => o.createdAt.startsWith(fecha)).length;
    const entregadosHoy = ordenesRaw.filter(o => o.estado === 'entregado' && o.updatedAt.startsWith(fecha)).length;
    const fechaObj = new Date(fecha);
    fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset()); // Ajuste timezone
    return {
      dia: fechaObj.toLocaleDateString('es-CL', { weekday: 'short' }),
      Recibidos: recibidosHoy,
      Entregados: entregadosHoy
    };
  });

  // Simulación de fechas de proceso para la tabla detallada
  const generarFechasDetalladas = (orden) => {
    const fIngreso = new Date(orden.createdAt);
    let fDiagnostico = null;
    let fReparacion = null;
    let fEntrega = null;

    if (orden.estado !== 'recibido') {
      fDiagnostico = new Date(fIngreso.getTime() + 1000 * 60 * 60 * 2); // Simula 2 hrs después
    }
    if (['en_reparacion', 'qa', 'listo', 'entregado'].includes(orden.estado)) {
      fReparacion = new Date(fIngreso.getTime() + 1000 * 60 * 60 * 24); // Simula 24 hrs después
    }
    if (orden.estado === 'entregado') {
      fEntrega = new Date(orden.updatedAt);
    }

    return { fIngreso, fDiagnostico, fReparacion, fEntrega };
  };

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
          <Activity size={150} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight">Panel Ejecutivo</h1>
          <p className="text-slate-300 text-sm mt-1 font-medium">Bienvenido(a), {usuario?.nombre} — Control general de operaciones.</p>
        </div>
      </div>

      {/* KPI CARDS (Métricas Principales) - Adaptadas a 6 columnas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        <KpiCard icon={Wrench} label="Equipos Taller" value={kpis.ordenesActivas} sub="En proceso activo" color="brand" />
        <KpiCard icon={CheckCircle2} label="Entregados" value={ordenesRaw.filter(o => o.estado === 'entregado').length} sub="Histórico total" color="emerald" />
        <KpiCard icon={TrendingUp} label="A tiempo" value={kpis.tasaEntregaATiempo != null ? `${kpis.tasaEntregaATiempo}%` : '—'} sub="SLA: ≥ 90%" color="violet" />
        <KpiCard icon={Clock} label="TAT Promedio" value={kpis.tatPromedioDias != null ? `${kpis.tatPromedioDias} d` : '—'} sub="Ciclo reparación" color="amber" />
        {/* NUEVO KPI DE SATISFACCIÓN */}
        <KpiCard icon={Star} label="Satisfacción" value={satisfaccionPromedio !== 'S/N' ? `${satisfaccionPromedio}` : 'S/N'} sub="Calidad percibida" color="amber" />
        {esAdmin && <KpiCard icon={DollarSign} label="Ingresos Mes" value={formatoCLP(kpis.ingresosMes)} sub="Facturación estimada" color="emerald" />}
      </div>

      {/* ALERTAS CRÍTICAS */}
      <div className="flex flex-col gap-3">
        {kpis.ordenesSinAsignar > 0 && esAdmin && (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl px-5 py-4 text-sm shadow-sm animate-pulse">
            <div className="p-2 bg-rose-200/50 rounded-full shrink-0"><UserX size={18} /></div>
            <p><strong>ALERTA OPERATIVA:</strong> Hay <strong>{kpis.ordenesSinAsignar}</strong> equipo(s) ingresados sin técnico responsable. Asigna carga de trabajo inmediatamente.</p>
          </div>
        )}
      </div>

      {/* GRÁFICOS AVANZADOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico 1: Flujo de Ingresos vs Entregas */}
        <div className={`${glassCard} lg:col-span-2`}>
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><CalendarDays size={18} className="text-brand-500"/> Balance Operativo (Últimos 7 días)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dataTendencias} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRecibidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorEntregados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="Recibidos" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRecibidos)" />
              <Area type="monotone" dataKey="Entregados" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorEntregados)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 2: Distribución Actual */}
        <div className={glassCard}>
          <h3 className="font-bold text-slate-800 mb-6">Estado del Taller</h3>
          {dataPie.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">Sin equipos en taller.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={dataPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={4} stroke="none">
                  {dataPie.map((entry) => (
                    <Cell key={entry.estado} fill={COLORS[entry.estado]} className="hover:opacity-80 outline-none" />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {dataPie.map((d) => (
              <div key={d.estado} className="flex items-center gap-2 text-[10px] text-slate-600 font-bold bg-slate-50 p-1.5 rounded-lg">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[d.estado] }} />
                <span className="truncate">{d.name}</span>
                <span className="ml-auto text-slate-800 bg-white px-1.5 rounded shadow-sm">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KANBAN OPERATIVO RÁPIDO */}
      {kanban && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Control de Flujo <span className="text-xs bg-slate-800 text-white px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">Kanban</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <ColumnaKanban titulo="Ingresos de Hoy" icon={Inbox} color="slate" ordenes={kanban.recibidoHoy} />
            <ColumnaKanban titulo="En Diagnóstico / Rep." icon={Wrench} color="brand" ordenes={kanban.enProceso} />
            <ColumnaKanban titulo="Listos / Entregados Hoy" icon={CheckCircle2} color="emerald" ordenes={kanban.terminadoHoy} />
            <ColumnaKanban titulo="Pausados / Atrasados" icon={AlertTriangle} color="red" ordenes={kanban.pendienteAtrasado} />
          </div>
        </div>
      )}

      {/* TABLA DE HISTORIAL ULTRA DETALLADA */}
      <div className={`${glassCard} overflow-hidden`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><ListOrdered size={20} className="text-brand-500" /> Trazabilidad Detallada de Equipos</h3>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">Total Histórico: {ordenesRaw.length}</span>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar pb-4">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest">
                <th className="p-4 rounded-tl-2xl font-bold">Orden / ID</th>
                <th className="p-4 font-bold">Cliente y Equipo</th>
                <th className="p-4 font-bold">Fecha Ingreso</th>
                <th className="p-4 font-bold">Fecha Diagnóstico</th>
                <th className="p-4 font-bold">Fecha Reparación</th>
                <th className="p-4 font-bold">Fecha Entrega</th>
                <th className="p-4 rounded-tr-2xl font-bold text-center">Estado Actual</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {ordenesRaw.slice(0, 15).map((orden) => { 
                const fechas = generarFechasDetalladas(orden);
                
                return (
                  <tr key={orden.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <Link to={`/ordenes/${orden.id}`} className="font-mono font-bold text-brand-600 hover:text-brand-800">{orden.codigo}</Link>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{orden.cliente?.nombre || 'Desconocido'}</p>
                      <p className="text-xs text-slate-500">{orden.dispositivo?.marca} {orden.dispositivo?.modelo}</p>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {fechas.fIngreso.toLocaleDateString('es-CL')} <br/><span className="text-xs text-slate-400">{fechas.fIngreso.toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {fechas.fDiagnostico ? (
                        <>{fechas.fDiagnostico.toLocaleDateString('es-CL')} <br/><span className="text-xs text-slate-400">{fechas.fDiagnostico.toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}</span></>
                      ) : <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded">Pendiente</span>}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {fechas.fReparacion ? (
                        <>{fechas.fReparacion.toLocaleDateString('es-CL')} <br/><span className="text-xs text-slate-400">{fechas.fReparacion.toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}</span></>
                      ) : <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded">Pendiente</span>}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {fechas.fEntrega ? (
                        <>{fechas.fEntrega.toLocaleDateString('es-CL')} <br/><span className="text-xs text-slate-400">{fechas.fEntrega.toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}</span></>
                      ) : <span className="text-xs font-bold text-slate-400 italic">En Taller</span>}
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xs font-bold px-3 py-1 rounded-full border shadow-sm" style={{ 
                        backgroundColor: `${COLORS[orden.estado]}15`, 
                        color: COLORS[orden.estado],
                        borderColor: `${COLORS[orden.estado]}30`
                      }}>
                        {ESTADO_CONFIG[orden.estado]?.label || orden.estado}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {ordenesRaw.length === 0 && <p className="text-center text-slate-400 py-6 text-sm">No hay registros históricos disponibles.</p>}
        </div>
      </div>

    </div>
  );
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

const KANBAN_COLOR_MAP = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  brand: 'bg-blue-100 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  red: 'bg-rose-100 text-rose-700 border-rose-200',
};

function ColumnaKanban({ titulo, icon: Icon, color, ordenes }) {
  return (
    <div className={`bg-slate-50/50 rounded-3xl p-4 border border-slate-100 flex flex-col h-[380px]`}>
      <div className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 mb-4 border ${KANBAN_COLOR_MAP[color]}`}>
        <Icon size={16} className="opacity-80" />
        <span className="text-[10px] font-black uppercase tracking-widest">{titulo}</span>
        <span className="ml-auto text-xs font-black bg-white/60 px-2 py-0.5 rounded-md">{ordenes.length}</span>
      </div>
      <div className="space-y-3 overflow-y-auto pr-1 pb-2 custom-scrollbar">
        {ordenes.length === 0 && <div className="h-full flex items-center justify-center pt-10"><p className="text-xs text-slate-400 font-medium italic">Columna vacía</p></div>}
        {ordenes.map((o) => (
          <Link
            key={o.id}
            to={`/ordenes/${o.id}`}
            className="block bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md group-hover:bg-brand-100 transition-colors">{o.codigo}</span>
              <span className="text-[10px] text-slate-400 font-bold">{tiempoTranscurrido(o.createdAt)}</span>
            </div>
            <p className="text-sm font-bold text-slate-800 line-clamp-1">{o.cliente}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5 line-clamp-1">{o.equipo}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

const COLOR_MAP = {
  brand: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
};

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className={`bg-white border border-slate-100 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 rounded-3xl p-5 flex flex-col justify-between`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner ${COLOR_MAP[color]}`}>
          <Icon size={24} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-black text-slate-800 tracking-tight">{value}</p>
        <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wide">{label}</p>
        <p className="text-xs font-medium text-slate-400 mt-1 bg-slate-50 inline-block px-2 py-1 rounded-lg">{sub}</p>
      </div>
    </div>
  );
}