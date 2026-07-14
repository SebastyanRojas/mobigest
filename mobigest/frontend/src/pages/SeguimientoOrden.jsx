import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Search as SearchIcon, Wrench, Package, 
  Loader2, Play, ShieldCheck, Clock, Check, Smartphone, FileText 
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatoCLP } from '../utils/format';

// Usamos exactamente los estados que permite tu Base de Datos
const WORKFLOW = [
  { id: 'recibido', titulo: 'Equipo Recibido', desc: 'Ingreso registrado en el sistema.', icon: CheckCircle2 },
  { id: 'en_diagnostico', titulo: 'En Diagnóstico', desc: 'Revisión de hardware y software en curso.', icon: SearchIcon },
  { id: 'en_reparacion', titulo: 'En Reparación', desc: 'Ejecutando procedimiento técnico y cambio de piezas.', icon: Wrench },
  { id: 'listo', titulo: 'Listo para Retiro', desc: 'Equipo cerrado, limpiado y empaquetado.', icon: ShieldCheck },
  { id: 'entregado', titulo: 'Entregado al Cliente', desc: 'Orden finalizada con éxito.', icon: Package }
];

export default function SeguimientoOrden() {
  const { usuario, esAdmin } = useAuth();
  const [vista, setVista] = useState(usuario?.rol === 'tecnico' || esAdmin ? 'tecnico' : 'cliente');
  
  const [busqueda, setBusqueda] = useState('');
  const [ordenesDisponibles, setOrdenesDisponibles] = useState([]);
  const [ordenActual, setOrdenActual] = useState(null);
  
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarOrdenes();
  }, []);

  const cargarOrdenes = async () => {
    try {
      const { data } = await api.get('/ordenes');
      setOrdenesDisponibles(data);
    } catch (err) {
      console.error("Error al cargar órdenes:", err);
    }
  };

  const buscarOrden = (e) => {
    e.preventDefault();
    setError('');
    const encontrada = ordenesDisponibles.find(o => o.codigo.toLowerCase() === busqueda.toLowerCase());
    if (encontrada) {
      setOrdenActual(encontrada);
    } else {
      setError('No se encontró ninguna orden con ese código.');
      setOrdenActual(null);
    }
  };

  const seleccionarOrdenRapida = (orden) => {
    setBusqueda(orden.codigo);
    setOrdenActual(orden);
    setError('');
  };

  const avanzarEstado = async () => {
    if (!ordenActual) return;
    
    // Validar el estado actual contra nuestro Workflow
    let currentIndex = WORKFLOW.findIndex(w => w.id === ordenActual.estado);
    
    // Protección anti-crash: Si el estado en BD no existe en el workflow, asumimos que está en el paso 1
    if (currentIndex === -1) currentIndex = 0; 
    
    if (currentIndex === WORKFLOW.length - 1) return; // Ya está terminado
    
    const nextEstado = WORKFLOW[currentIndex + 1].id;
    
    setActualizando(true);
    try {
      const { data } = await api.put(`/ordenes/${ordenActual.id}`, {
        estado: nextEstado
      });
      setOrdenActual(data);
      await cargarOrdenes(); 
    } catch (err) {
      setError('Error al actualizar el estado en la Base de Datos.');
    } finally {
      setActualizando(false);
    }
  };

  // Cálculos visuales con protección anti-errores
  const getIndexActual = () => {
    const idx = WORKFLOW.findIndex(w => w.id === ordenActual?.estado);
    return idx !== -1 ? idx : 0; // Por defecto siempre muestra al menos el paso 1
  };
  
  const progresoPorcentaje = ordenActual ? Math.round(((getIndexActual() + 1) / WORKFLOW.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in mt-4">
      
      {/* 1. BUSCADOR INTELIGENTE */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <SearchIcon size={20} className="text-brand-500" /> Rastrear Orden de Servicio
        </h2>
        
        <form onSubmit={buscarOrden} className="flex gap-3">
          <input 
            type="text" 
            placeholder="Ingresa el código (Ej: OS-2026-00001)" 
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm font-bold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 uppercase"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value.toUpperCase())}
            required
          />
          <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-8 rounded-xl font-bold transition-all shadow-md">
            Buscar
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Órdenes Activas:</span>
          {ordenesDisponibles.slice(0, 5).map(o => (
            <button 
              key={o.id} 
              onClick={() => seleccionarOrdenRapida(o)}
              className="text-[10px] font-mono font-bold bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              {o.codigo}
            </button>
          ))}
        </div>

        {error && <p className="text-sm font-bold text-rose-500 mt-4">{error}</p>}
      </div>

      {/* 2. PANEL DE SEGUIMIENTO */}
      {ordenActual && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="bg-slate-900 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none text-white">
              <ActivityBackground size={250} strokeWidth={1} />
            </div>
            
            <div className="flex items-center gap-5 relative z-10 w-full md:w-auto">
              <div className="h-16 w-16 bg-brand-500/20 border border-brand-500/30 rounded-2xl flex items-center justify-center text-brand-400 shrink-0">
                <Smartphone size={32} />
              </div>
              <div>
                <p className="text-3xl font-black font-mono text-white tracking-tight">{ordenActual.codigo}</p>
                <p className="text-brand-300 font-medium text-sm mt-1">{ordenActual.dispositivo?.marca} {ordenActual.dispositivo?.modelo} — Cliente: {ordenActual.cliente?.nombre || 'General'}</p>
              </div>
            </div>

            {(usuario?.rol === 'tecnico' || esAdmin) && (
              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 relative z-10 w-full md:w-auto shrink-0">
                <button onClick={() => setVista('tecnico')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${vista === 'tecnico' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                  <Wrench size={14} /> Vista Técnico
                </button>
                <button onClick={() => setVista('cliente')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${vista === 'cliente' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                  <Check size={14} /> Vista Cliente
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 mb-8">Workflow de Reparación</h3>
              
              <div className="space-y-0 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                
                {WORKFLOW.map((paso, index) => {
                  const Icon = paso.icon;
                  const isCompleted = index < getIndexActual();
                  const isCurrent = index === getIndexActual();
                  
                  return (
                    <div key={paso.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-8">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-md transition-colors duration-300 z-10 ${
                        isCompleted ? 'bg-emerald-500 text-white' : 
                        isCurrent ? 'bg-brand-500 text-white ring-4 ring-brand-100' : 
                        'bg-slate-100 text-slate-400'
                      }`}>
                        <Icon size={20} />
                      </div>
                      
                      <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-5 rounded-2xl border transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-50/50 border-emerald-100' : 
                        isCurrent ? 'bg-white border-brand-200 shadow-lg scale-[1.02]' : 
                        'bg-slate-50 border-slate-100 opacity-60'
                      }`}>
                        <h4 className={`font-black text-base ${isCompleted ? 'text-emerald-700' : isCurrent ? 'text-brand-700' : 'text-slate-500'}`}>
                          {paso.titulo}
                        </h4>
                        <p className={`text-xs mt-1 font-medium ${isCurrent ? 'text-slate-600' : 'text-slate-500'}`}>
                          {paso.desc}
                        </p>

                        {vista === 'tecnico' && isCurrent && index < WORKFLOW.length - 1 && (
                          <div className="mt-4 pt-4 border-t border-brand-100/50">
                            <button 
                              onClick={avanzarEstado}
                              disabled={actualizando}
                              className="w-full flex items-center justify-between bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
                            >
                              {actualizando ? <Loader2 size={16} className="animate-spin" /> : <span>Avanzar a {WORKFLOW[index+1].titulo}</span>}
                              {!actualizando && <Play size={14} className="fill-white" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-800 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden border border-slate-700">
                <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                  <Clock size={150} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 relative z-10">SLA de Reparación</p>
                <div className="flex items-end gap-2 relative z-10">
                  <span className="text-5xl font-black tracking-tighter">48</span>
                  <span className="text-sm font-bold text-slate-300 pb-1">Horas hábiles</span>
                </div>
                <div className="mt-6 relative z-10">
                  <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${progresoPorcentaje}%` }}></div>
                  </div>
                  <p className="text-[10px] text-right font-bold text-emerald-400 mt-2">{progresoPorcentaje}% Completado</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-4">
                  <FileText size={14} /> Registro Interno
                </h4>
                <div className="space-y-4">
                  <div className="relative pl-4 before:absolute before:left-0 before:top-1.5 before:h-1.5 before:w-1.5 before:bg-brand-400 before:rounded-full">
                    <p className="text-xs font-bold text-slate-800">Diagnóstico / Motivo</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-3">{ordenActual.diagnostico || ordenActual.fallaReportada || 'Sin detalles registrados'}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-1">{ordenActual.createdAt ? new Date(ordenActual.createdAt).toLocaleDateString('es-CL') : ''}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-800 flex justify-between">
                      Presupuesto Base <span>{formatoCLP(ordenActual.presupuestoManoObra || 0)}</span>
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityBackground(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}