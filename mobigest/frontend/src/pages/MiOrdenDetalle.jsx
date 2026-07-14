import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, FileDown, Send, Star, ShieldCheck, ThumbsUp, ThumbsDown, CheckCircle2, Clock, Wrench, Smile
} from 'lucide-react';
import api from '../api/client';
import EstadoBadge from '../components/EstadoBadge';
import {
  formatoCLP, formatoFecha, formatoFechaHora, ESTADOS_PIPELINE, ESTADO_CONFIG,
} from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { descargarComprobante } from '../utils/descargarComprobante';

export default function MiOrdenDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [orden, setOrden] = useState(null);
  const [cargando, setCargando] = useState(true);
  
  // Chat
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const finChat = useRef(null);
  
  // Presupuesto
  const [decidiendo, setDecidiendo] = useState(false);
  
  // Calificación Multi-criterio
  const [calTiempo, setCalTiempo] = useState(0);
  const [hoverTiempo, setHoverTiempo] = useState(0);
  
  const [calCalidad, setCalCalidad] = useState(0);
  const [hoverCalidad, setHoverCalidad] = useState(0);
  
  const [calAtencion, setCalAtencion] = useState(0);
  const [hoverAtencion, setHoverAtencion] = useState(0);

  const [guardandoCalificacion, setGuardandoCalificacion] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await api.get(`/ordenes/${id}`);
    setOrden(data);
  }, [id]);

  const cargarMensajes = useCallback(async () => {
    const { data } = await api.get(`/ordenes/${id}/mensajes`);
    setMensajes(data);
  }, [id]);

  useEffect(() => {
    setCargando(true);
    Promise.all([cargar(), cargarMensajes()]).finally(() => setCargando(false));
  }, [cargar, cargarMensajes]);

  useEffect(() => {
    finChat.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const decidirPresupuesto = async (aprobado) => {
    setDecidiendo(true);
    try {
      await api.put(`/ordenes/${id}/presupuesto`, { aprobado });
      await cargar();
    } finally {
      setDecidiendo(false);
    }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;
    setEnviando(true);
    try {
      await api.post(`/ordenes/${id}/mensajes`, { contenido: nuevoMensaje.trim() });
      setNuevoMensaje('');
      await cargarMensajes();
    } finally {
      setEnviando(false);
    }
  };

  // ✅ Calcula el promedio y lo envía a la base de datos
  const enviarCalificacion = async () => {
    if (!calTiempo || !calCalidad || !calAtencion) return;
    
    // Calcula el promedio redondeado
    const promedio = Math.round((calTiempo + calCalidad + calAtencion) / 3);

    setGuardandoCalificacion(true);
    try {
      await api.put(`/ordenes/${id}/calificacion`, { calificacion: promedio });
      await cargar();
    } finally {
      setGuardandoCalificacion(false);
    }
  };

  if (cargando || !orden) {
    return <div className="flex flex-col items-center justify-center py-24 text-slate-400"><Loader2 className="animate-spin mb-4 text-brand-500" size={40} /><p className="font-bold animate-pulse">Cargando detalles de tu equipo...</p></div>;
  }

  const idx = ESTADOS_PIPELINE.indexOf(orden.estado);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in mt-4">
      <button onClick={() => navigate('/mis-ordenes')} className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-max">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver a mis órdenes
      </button>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{orden.codigo}</h1>
            <div className="scale-110 shadow-sm"><EstadoBadge estado={orden.estado} /></div>
          </div>
          <p className="text-brand-600 font-bold text-lg flex items-center gap-2">
            {orden.dispositivo?.marca} {orden.dispositivo?.modelo}
          </p>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
            Ingresada el {formatoFecha(orden.createdAt)}
          </p>
        </div>
        <button onClick={() => descargarComprobante(id, orden.codigo)} className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-5 rounded-xl border border-slate-200 shadow-sm transition-all flex items-center gap-2 whitespace-nowrap">
          <FileDown size={18} /> Comprobante PDF
        </button>
      </div>

      {/* LÍNEA DE TIEMPO DE ESTADOS */}
      {orden.estado !== 'no_reparable' ? (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Progreso de la reparación</p>
          <div className="flex items-center">
            {ESTADOS_PIPELINE.map((e, i) => (
              <div key={e} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-2 relative z-10 w-16">
                  <div className={`h-8 w-8 rounded-full border-4 flex items-center justify-center transition-all duration-700 ${i <= idx ? 'bg-brand-500 border-brand-100 shadow-md scale-110' : 'bg-slate-100 border-white'}`}>
                    {i <= idx && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <span className={`text-[10px] text-center font-bold absolute top-10 whitespace-nowrap transition-colors ${i <= idx ? 'text-brand-700' : 'text-slate-400'}`}>
                    {ESTADO_CONFIG[e].label}
                  </span>
                </div>
                {i < ESTADOS_PIPELINE.length - 1 && (
                  <div className={`h-1.5 flex-1 mx-[-1rem] rounded-full transition-colors duration-700 ${i < idx ? 'bg-brand-500' : 'bg-slate-100'}`} />
                )}
              </div>
            ))}
          </div>
          {orden.fechaCompromiso && (
            <div className="mt-12 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl font-black text-slate-700">📅</div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha de entrega estimada</p>
                <p className="text-sm font-black text-slate-700">{formatoFecha(orden.fechaCompromiso)}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-3xl shadow-sm flex items-start gap-4">
          <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><ShieldCheck className="text-rose-500" size={24} /></div>
          <div>
            <p className="text-lg font-black text-rose-800">Equipo no reparable</p>
            <p className="text-sm font-medium text-rose-700 mt-1">Nuestro técnico determinó que el equipo no puede repararse de forma segura o rentable. Contáctanos mediante el chat para coordinar el retiro.</p>
          </div>
        </div>
      )}

      {/* DIAGNÓSTICO Y FALLA */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Falla reportada al ingreso</h3>
          <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[100px]">{orden.fallaReportada}</p>
        </div>

        {orden.diagnostico && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bitácora del Técnico</h3>
            <p className="text-sm font-medium text-slate-700 leading-relaxed bg-brand-50 p-4 rounded-2xl border border-brand-100 min-h-[100px]">{orden.diagnostico}</p>
          </div>
        )}
      </div>

      {/* PRESUPUESTO */}
      {orden.presupuestoEstado !== 'no_aplica' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4">Detalle de Valorización</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mano de obra</p>
              <p className="font-black text-slate-700 text-lg">{formatoCLP(orden.totales?.manoObra)}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Repuestos</p>
              <p className="font-black text-slate-700 text-lg">{formatoCLP(orden.totales?.totalRepuestos)}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl shadow-md text-white">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Costo Total</p>
              <p className="font-black text-2xl">{formatoCLP(orden.totales?.total)}</p>
            </div>
          </div>
          
          {orden.tieneGarantia && (
            <p className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-xl flex items-center gap-2">
              <ShieldCheck size={18} /> Esta reparación incluye garantía{orden.garantiaHasta ? ` hasta el ${formatoFecha(orden.garantiaHasta)}` : ''}.
            </p>
          )}

          {/* ACCIONES DE APROBACIÓN */}
          {orden.presupuestoEstado === 'pendiente' && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
              <p className="text-sm font-bold text-amber-800">El técnico ha enviado el presupuesto. ¿Deseas proceder con la reparación?</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button onClick={() => decidirPresupuesto(true)} disabled={decidiendo} className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex justify-center items-center gap-2">
                  <ThumbsUp size={18} /> Aprobar Presupuesto
                </button>
                <button onClick={() => decidirPresupuesto(false)} disabled={decidiendo} className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold py-3 px-8 rounded-xl transition-all flex justify-center items-center gap-2">
                  <ThumbsDown size={18} /> Rechazar
                </button>
              </div>
            </div>
          )}
          {orden.presupuestoEstado === 'aprobado' && (
            <p className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-center">✅ Presupuesto aprobado. El técnico está trabajando en tu equipo.</p>
          )}
          {orden.presupuestoEstado === 'rechazado' && (
            <p className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-center">❌ Presupuesto rechazado. Por favor contáctanos para coordinar el retiro del equipo.</p>
          )}
        </div>
      )}

      {/* ✅ MÓDULO DE CALIFICACIÓN MULTICRITERIO */}
      {orden.estado === 'entregado' && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 shadow-xl text-white">
          <div className="text-center mb-8">
            <h3 className="font-black text-2xl tracking-tight mb-2">¡Tu equipo ha sido entregado! 🎉</h3>
            <p className="text-slate-300 text-sm font-medium">
              {orden.calificacion 
                ? 'Gracias por ayudarnos a mejorar evaluando nuestro servicio.' 
                : 'Por favor evalúa nuestro servicio. Tu opinión alimenta las métricas de calidad de nuestro equipo.'}
            </p>
          </div>

          {orden.calificacion ? (
            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-md text-center border border-white/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-300 mb-2">Nota Promedio Final</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={32} className={n <= orden.calificacion ? 'fill-amber-400 text-amber-400 drop-shadow-md' : 'text-slate-600 fill-slate-800/50'} />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Criterio 1: Tiempo */}
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-brand-500/20 text-brand-300 rounded-xl flex items-center justify-center"><Clock size={20}/></div>
                  <div className="text-left text-center md:text-left">
                    <p className="font-bold text-sm">Tiempo de Entrega</p>
                    <p className="text-[11px] text-slate-400">¿Cumplimos con el plazo prometido?</p>
                  </div>
                </div>
                <div className="flex gap-1" onMouseLeave={() => setHoverTiempo(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setCalTiempo(n)} onMouseEnter={() => setHoverTiempo(n)}>
                      <Star size={28} className={`transition-colors duration-200 ${n <= (hoverTiempo || calTiempo) ? 'fill-amber-400 text-amber-400 drop-shadow-md' : 'text-slate-500 fill-transparent'}`} strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Criterio 2: Calidad */}
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-emerald-500/20 text-emerald-300 rounded-xl flex items-center justify-center"><Wrench size={20}/></div>
                  <div className="text-center md:text-left">
                    <p className="font-bold text-sm">Calidad Técnica</p>
                    <p className="text-[11px] text-slate-400">¿El equipo quedó funcionando perfecto?</p>
                  </div>
                </div>
                <div className="flex gap-1" onMouseLeave={() => setHoverCalidad(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setCalCalidad(n)} onMouseEnter={() => setHoverCalidad(n)}>
                      <Star size={28} className={`transition-colors duration-200 ${n <= (hoverCalidad || calCalidad) ? 'fill-amber-400 text-amber-400 drop-shadow-md' : 'text-slate-500 fill-transparent'}`} strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Criterio 3: Atención */}
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-purple-500/20 text-purple-300 rounded-xl flex items-center justify-center"><Smile size={20}/></div>
                  <div className="text-center md:text-left">
                    <p className="font-bold text-sm">Atención al Cliente</p>
                    <p className="text-[11px] text-slate-400">¿Cómo fue el trato de nuestro personal?</p>
                  </div>
                </div>
                <div className="flex gap-1" onMouseLeave={() => setHoverAtencion(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setCalAtencion(n)} onMouseEnter={() => setHoverAtencion(n)}>
                      <Star size={28} className={`transition-colors duration-200 ${n <= (hoverAtencion || calAtencion) ? 'fill-amber-400 text-amber-400 drop-shadow-md' : 'text-slate-500 fill-transparent'}`} strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={enviarCalificacion}
                disabled={!calTiempo || !calCalidad || !calAtencion || guardandoCalificacion}
                className="w-full bg-brand-500 hover:bg-brand-400 text-white font-black py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2 uppercase tracking-wide text-sm border border-brand-400"
              >
                {guardandoCalificacion ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {guardandoCalificacion ? 'Guardando...' : 'Enviar Evaluación'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* CHAT CON EL TÉCNICO */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4">Comunicación Directa</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {mensajes.length === 0 && <p className="text-sm font-bold text-slate-400 text-center py-8">Canal de comunicación abierto. Envía un mensaje al taller.</p>}
          {mensajes.map((m) => {
            const esMio = m.autorId === usuario.id;
            return (
              <div key={m.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm shadow-sm ${esMio ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                  {!esMio && <p className="text-[10px] font-black uppercase opacity-50 mb-1">{m.autor?.nombre || 'Taller'}</p>}
                  <p className="font-medium">{m.contenido}</p>
                  <p className={`text-[9px] font-bold mt-2 text-right ${esMio ? 'text-brand-200' : 'text-slate-400'}`}>{formatoFechaHora(m.createdAt)}</p>
                </div>
              </div>
            );
          })}
          <div ref={finChat} />
        </div>
        <form onSubmit={enviarMensaje} className="flex gap-2">
          <input
            className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none transition-all"
            placeholder="Escribe tu consulta aquí..."
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
          />
          <button type="submit" disabled={enviando || !nuevoMensaje.trim()} className="bg-brand-600 hover:bg-brand-500 text-white px-6 rounded-xl font-bold shadow-md transition-all disabled:opacity-50 flex justify-center items-center">
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
      
    </div>
  );
}