import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Wrench, Loader2, Calendar, Smartphone, ChevronRight, Hash } from 'lucide-react';
import api from '../api/client';
import EstadoBadge from '../components/EstadoBadge';
import EmptyState from '../components/EmptyState';
import { formatoCLP, formatoFecha, ESTADOS_ORDEN, ESTADO_CONFIG } from '../utils/format';
import { useAuth } from '../context/AuthContext'; // <-- Importamos autenticación

export default function OrdenesList() {
  const { usuario } = useAuth(); // <-- Obtenemos el usuario logueado
  const navigate = useNavigate(); // <-- Para navegación condicional

  const [searchParams] = useSearchParams();
  const dispositivoIdFiltro = searchParams.get('dispositivoId');
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async (params) => {
    setCargando(true);
    try {
      const { data } = await api.get('/ordenes', { params });
      const filtradas = dispositivoIdFiltro ? data.filter((o) => o.dispositivoId === dispositivoIdFiltro) : data;
      setOrdenes(filtradas);
    } finally {
      setCargando(false);
    }
  }, [dispositivoIdFiltro]);

  useEffect(() => { cargar({}); }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = {};
      if (estado) params.estado = estado;
      if (busqueda) params.q = busqueda;
      cargar(params);
    }, 300);
    return () => clearTimeout(t);
  }, [estado, busqueda, cargar]);

  // <-- NUEVA FUNCIÓN PARA PROTEGER EL ACCESO A LA ORDEN
  const manejarClickOrden = (orden) => {
    if (usuario?.rol === 'tecnico' && orden.usuarioId && orden.usuarioId !== usuario.id) {
      alert('⛔ Acceso denegado: Esta orden está asignada a otro técnico.');
      return;
    }
    navigate(`/ordenes/${orden.id}`);
  };

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
          <Wrench size={200} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">Órdenes de Servicio</h1>
          <p className="text-slate-300 text-sm mt-1 font-medium">Ciclo completo de recepción, diagnóstico y reparación.</p>
        </div>
        <Link 
          to="/ordenes/nueva" 
          className="relative z-10 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all duration-300 hover:-translate-y-1"
        >
          <Plus size={18} strokeWidth={3} /> Nueva orden
        </Link>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
        <div className="relative w-full max-w-md group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors">
            <Search size={18} />
          </div>
          <input 
            className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-2xl text-sm font-medium text-slate-700 placeholder-slate-400 transition-all outline-none shadow-sm" 
            placeholder="Buscar por código (OS-...) o cliente" 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
          />
        </div>
        
        {/* Chips de Filtro Interactivos */}
        <div className="flex gap-2 flex-wrap bg-white/60 p-2 rounded-2xl backdrop-blur-md border border-slate-100 shadow-sm">
          <FiltroChip activo={estado === ''} onClick={() => setEstado('')}>Todas</FiltroChip>
          {ESTADOS_ORDEN.map((e) => (
            <FiltroChip key={e} activo={estado === e} onClick={() => setEstado(e)}>
              {ESTADO_CONFIG[e].label}
            </FiltroChip>
          ))}
        </div>
      </div>

      {/* Lista de Órdenes Flotantes */}
      <div>
        {cargando ? (
          <div className="flex flex-col justify-center items-center py-20 text-slate-400">
            <Loader2 className="animate-spin text-brand-500 mb-4" size={36} />
            <p className="font-medium animate-pulse">Cargando órdenes...</p>
          </div>
        ) : ordenes.length === 0 ? (
          <EmptyState icon={Wrench} title="No hay órdenes de servicio" description="Crea la primera orden para comenzar a registrar reparaciones." />
        ) : (
          <div className="space-y-4">
            
            {/* Cabecera visual (Solo visible en Desktop) */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <div className="col-span-2">Código</div>
              <div className="col-span-3">Cliente / Equipo</div>
              <div className="col-span-3">Estado Actual</div>
              <div className="col-span-2">Compromiso</div>
              <div className="col-span-2 text-right pr-8">Total</div>
            </div>

            {/* Filas interactivas (Cards) cambiadas a DIV para manejar onClick */}
            {ordenes.map((o) => (
              <div 
                key={o.id}
                onClick={() => manejarClickOrden(o)}
                className="cursor-pointer group flex flex-col lg:grid lg:grid-cols-12 gap-4 items-start lg:items-center bg-white/90 backdrop-blur-xl border border-slate-100 p-5 rounded-3xl shadow-[0_4px_15px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-brand-200 transition-all duration-300"
              >
                
                {/* Código */}
                <div className="col-span-2 flex items-center gap-2">
                  <div className="p-2 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                    <Hash size={16} />
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-700 group-hover:text-brand-600 transition-colors">
                    {o.codigo}
                  </span>
                </div>

                {/* Cliente y Equipo */}
                <div className="col-span-3 flex items-start gap-3">
                  <div className="mt-1">
                    <div className="h-2 w-2 rounded-full bg-slate-300 group-hover:bg-brand-400 transition-colors"></div>
                  </div>
                  <div>
                    <p className="text-slate-800 font-bold text-sm leading-tight">{o.cliente?.nombre}</p>
                    {/* <-- AGREGAMOS EL TÉCNICO AQUÍ --> */}
                    <span className="text-[10px] text-brand-600 font-bold flex items-center gap-1 mt-0.5 uppercase tracking-wider">
                      👨‍🔧 {o.usuario?.nombre || o.tecnico?.nombre || 'Sin asignar'}
                    </span>
                    <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mt-1">
                      <Smartphone size={12} /> {o.dispositivo?.marca} {o.dispositivo?.modelo}
                    </p>
                  </div>
                </div>

                {/* Estado */}
                <div className="col-span-3">
                  <EstadoBadge estado={o.estado} />
                </div>

                {/* Fecha Compromiso */}
                <div className="col-span-2 flex items-center gap-2 text-slate-500">
                  <Calendar size={14} className="opacity-70" />
                  <span className="text-sm font-medium">{formatoFecha(o.fechaCompromiso)}</span>
                </div>

                {/* Total y Flecha */}
                <div className="col-span-2 flex items-center justify-between lg:justify-end w-full lg:w-auto">
                  <span className="font-black text-slate-800 text-base">{formatoCLP(o.totales?.total)}</span>
                  <div className="ml-4 p-2 rounded-full bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:translate-x-1 transition-all duration-300">
                    <ChevronRight size={18} strokeWidth={3} />
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FiltroChip({ activo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
        activo 
          ? 'bg-slate-800 text-white shadow-md scale-105' 
          : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}