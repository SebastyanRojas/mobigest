import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, FileDown, Trash2, Plus, Save, ShieldCheck, CheckCircle2, Send, UserCog, ClipboardCheck, Wrench, Smartphone, User, AlertCircle, Camera
} from 'lucide-react';
import api from '../api/client';
import EstadoBadge from '../components/EstadoBadge';
import { formatoCLP, formatoFechaHora, ESTADOS_ORDEN, ESTADO_CONFIG } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { descargarComprobante } from '../utils/descargarComprobante';

const CHECKLIST_ITEMS = [
  { key: 'pantalla', label: 'Pantalla' },
  { key: 'bateria', label: 'Batería' },
  { key: 'flex_carga', label: 'Flex de Carga' },
  { key: 'glass', label: 'Glass Trizado' },
  { key: 'placa', label: 'Placa' },
  { key: 'flex_main', label: 'Flex Main' },
  { key: 'antena', label: 'Antena' },
  { key: 'parlante_sup', label: 'Parlante Superior' },
  { key: 'parlante_inf', label: 'Parlante Inferior' },
  { key: 'cuerpo', label: 'Cuerpo/Chasis' },
  { key: 'tapa', label: 'Tapa Trasera' },
  { key: 'botones', label: 'Botones' },
  { key: 'camara_front', label: 'Cámara Frontal' },
  { key: 'camaras_tras', label: 'Cámaras Traseras' },
  { key: 'bandeja_sim', label: 'Bandeja SIM' },
  { key: 'puerto_aur', label: 'Puerto Auricular' },
  { key: 'huella', label: 'Huella / Touch ID' },
  { key: 'flash', label: 'Flash' },
  { key: 'sensor_prox', label: 'Sensor Proximidad' },
  { key: 'pin_patron', label: 'Pin o Patrón (Revisado)' },
];

const ESTILO_HEADER = {
  recibido: 'from-slate-900 to-slate-800',
  en_diagnostico: 'from-amber-600 to-orange-500',
  en_reparacion: 'from-indigo-700 to-purple-600',
  listo: 'from-cyan-600 to-blue-500',
  entregado: 'from-emerald-600 to-teal-500',
  no_reparable: 'from-rose-800 to-red-700',
};

export default function OrdenDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { esAdmin, usuario } = useAuth();
  const [orden, setOrden] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [repuestosCatalogo, setRepuestosCatalogo] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  
  const [destello, setDestello] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);
  const [asignando, setAsignando] = useState(false);
  
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const finChat = useRef(null);

  const [diagnostico, setDiagnostico] = useState('');
  const [checklist, setChecklist] = useState({});
  const [metodoDesbloqueo, setMetodoDesbloqueo] = useState('');
  const [presupuestoManoObra, setPresupuestoManoObra] = useState(0); 
  const [anticipo, setAnticipo] = useState(0); 
  const [tieneGarantia, setTieneGarantia] = useState(false);
  const [garantiaHasta, setGarantiaHasta] = useState('');
  const [condicionesGarantia, setCondicionesGarantia] = useState('');
  const [repuestosSel, setRepuestosSel] = useState([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get(`/ordenes/${id}`);
      setOrden(data);
      setDiagnostico(data.diagnostico || '');
      setChecklist(data.checklist || {});
      setMetodoDesbloqueo(data.metodoDesbloqueo || '');
      setPresupuestoManoObra(data.presupuestoManoObra || 0);
      setAnticipo(data.anticipo || 0);
      setTieneGarantia(data.tieneGarantia || false);
      setGarantiaHasta(data.garantiaHasta ? data.garantiaHasta.substring(0, 10) : '');
      setCondicionesGarantia(data.condicionesGarantia || '');
      setRepuestosSel((data.repuestosUsados || []).map((r) => ({ repuestoId: r.repuestoId, cantidad: r.cantidad })));
    } finally {
      setCargando(false);
    }
  }, [id]);

  const cargarMensajes = useCallback(async () => {
    try {
      const { data } = await api.get(`/mensajes/${id}/mensajes`);
      setMensajes(data);
    } catch (err) {
      console.warn("No se pudieron cargar los mensajes", err);
    }
  }, [id]);

  useEffect(() => { cargar(); cargarMensajes(); }, [cargar, cargarMensajes]);
  useEffect(() => { api.get('/repuestos').then(({ data }) => setRepuestosCatalogo(data)); }, []);
  useEffect(() => { if (esAdmin) api.get('/usuarios', { params: { rol: 'tecnico' } }).then(({ data }) => setTecnicos(data)); }, [esAdmin]);
  useEffect(() => { finChat.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

  const asignarTecnico = async (usuarioId) => {
    setAsignando(true);
    try {
      const { data } = await api.put(`/ordenes/${id}/asignar`, { usuarioId: usuarioId || null });
      setOrden(data);
    } finally {
      setAsignando(false);
    }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;
    setEnviandoMensaje(true);
    try {
      await api.post(`/ordenes/${id}/mensajes`, { contenido: nuevoMensaje.trim() });
      setNuevoMensaje('');
      await cargarMensajes();
    } catch (err) {
      console.error(err);
      alert("Error al enviar el mensaje.");
    } finally {
      setEnviandoMensaje(false);
    }
  };

  const cambiarEstado = async (nuevoEstado) => {
    if(!confirm(`¿Avanzar la orden a "${ESTADO_CONFIG[nuevoEstado].label}"?`)) return;
    setGuardando(true); setError('');
    try {
      const { data } = await api.put(`/ordenes/${id}`, { estado: nuevoEstado });
      setOrden(data);
      setDestello(true);
      setTimeout(() => setDestello(false), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cambiar el estado.');
    } finally {
      setGuardando(false);
    }
  };

  const guardarCambios = async () => {
    setGuardando(true); setError('');
    try {
      const { data } = await api.put(`/ordenes/${id}`, {
        diagnostico,
        checklist, // Las fotos seguirán guardadas aquí sin borrarse al editar selects
        metodoDesbloqueo,
        presupuestoManoObra: Number(presupuestoManoObra) || 0,
        anticipo: Number(anticipo) || 0,
        tieneGarantia,
        garantiaHasta: garantiaHasta || null,
        condicionesGarantia: condicionesGarantia || '', 
        repuestos: repuestosSel.filter((r) => r.repuestoId && r.cantidad > 0).map((r) => ({ repuestoId: r.repuestoId, cantidad: Number(r.cantidad) })),
      });
      setOrden(data);
      alert("✅ Panel Clínico guardado exitosamente");
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!confirm(`¿Eliminar la orden ${orden.codigo}? Esta acción no se puede deshacer.`)) return;
    await api.delete(`/ordenes/${id}`);
    navigate('/ordenes');
  };

  const agregarRepuesto = () => {
    if (repuestosCatalogo.length === 0) return;
    setRepuestosSel((prev) => [...prev, { repuestoId: repuestosCatalogo[0].id, cantidad: 1 }]);
  };
  const quitarRepuesto = (idx) => setRepuestosSel((prev) => prev.filter((_, i) => i !== idx));
  const actualizarRepuesto = (idx, campo, valor) => {
    setRepuestosSel((prev) => prev.map((r, i) => (i === idx ? { ...r, [campo]: valor } : r)));
  };

  if (cargando || !orden) {
    return <div className="flex flex-col items-center justify-center py-24 text-slate-400"><Loader2 className="animate-spin mb-4 text-brand-500" size={40} /><p className="font-bold animate-pulse">Cargando expediente...</p></div>;
  }

  const idxEstadoActual = ESTADOS_ORDEN.indexOf(orden.estado);
  const siguienteEstado = orden.estado === 'no_reparable' || orden.estado === 'entregado' ? null : ESTADOS_ORDEN[idxEstadoActual + 1];
  const estadosWorkflow = ESTADOS_ORDEN.filter((e) => e !== 'no_reparable');
  const idxProgreso = estadosWorkflow.indexOf(orden.estado);
  const porcentajeProgreso = (idxProgreso / (estadosWorkflow.length - 1)) * 100;

  const totalRepuestosPreview = repuestosSel.reduce((acc, r) => {
    const rep = repuestosCatalogo.find((x) => x.id === r.repuestoId);
    return acc + (rep ? Number(rep.precioUnitario || rep.precio || 0) * Number(r.cantidad || 0) : 0);
  }, 0);
  const totalPreview = Number(presupuestoManoObra || 0) + totalRepuestosPreview;
  const saldoPreview = totalPreview - Number(anticipo || 0);
  const colorHeader = ESTILO_HEADER[orden.estado] || 'from-slate-900 to-slate-800';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in mt-4">
      
      <button onClick={() => navigate('/ordenes')} className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-max">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver a órdenes
      </button>

      <div className={`bg-gradient-to-r ${colorHeader} transition-all duration-1000 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-end justify-between gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8"><Wrench size={200} /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-black tracking-tight">{orden.codigo}</h1>
            <div className="scale-110 shadow-lg"><EstadoBadge estado={orden.estado} /></div>
          </div>
          <p className="text-white/80 text-sm font-medium">Ingresada el {formatoFechaHora(orden.createdAt)}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="bg-black/30 backdrop-blur-md text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-white/10"><UserCog size={14}/> Técnico: {orden.tecnico?.nombre || 'Sin asignar'}</span>
            {orden.origen === 'cliente' && <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-lg text-xs font-bold border border-white/10">Autogestión Web</span>}
          </div>
        </div>
        
        <div className="relative z-10 flex flex-wrap gap-3">
          <button onClick={() => descargarComprobante(id, orden.codigo)} className="bg-white/20 hover:bg-white/30 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg transition-all flex items-center gap-2 backdrop-blur-sm border border-white/20"><FileDown size={18} /> Descargar PDF</button>
          {esAdmin && <button onClick={eliminar} className="bg-black/20 hover:bg-red-500 text-white/80 hover:text-white font-bold py-2.5 px-4 rounded-xl transition-all border border-black/10" title="Eliminar orden"><Trash2 size={18} /></button>}
        </div>
      </div>

      {esAdmin && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-indigo-50 rounded-xl text-indigo-600 flex items-center justify-center shrink-0"><UserCog size={20}/></div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Reasignar Responsable</p>
            <select className="w-full max-w-sm px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500" value={orden.tecnico?.id || ''} disabled={asignando} onChange={(e) => asignarTecnico(e.target.value)}>
              <option value="">Dejar sin asignar</option>
              {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-8 flex items-center gap-2"><CheckCircle2 size={18} className="text-brand-500"/> Workflow de Reparación</h3>
        
        <div className="relative px-4 sm:px-10 mb-10 mt-4 hidden sm:block">
          <div className="absolute top-1/2 left-10 right-10 -translate-y-1/2 h-1.5 bg-slate-100 rounded-full"></div>
          <div className="absolute top-1/2 left-10 -translate-y-1/2 h-1.5 bg-brand-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `calc(${porcentajeProgreso}% - 1rem)` }}></div>
          <div className="relative flex justify-between">
            {estadosWorkflow.map((e, i) => {
              const esActual = e === orden.estado;
              const yaPaso = i <= idxProgreso;
              return (
                <div key={e} className="flex flex-col items-center relative z-10 w-24">
                  <div className="relative">
                    {esActual && destello && <span className="absolute -inset-2 rounded-full bg-brand-400 opacity-75 animate-ping"></span>}
                    <div className={`h-8 w-8 rounded-full border-4 flex items-center justify-center transition-all duration-700 ${esActual ? 'border-white bg-brand-500 shadow-lg scale-125 ring-4 ring-brand-100' : yaPaso ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 bg-white'}`}>
                      {yaPaso && !esActual && <CheckCircle2 size={14} />}
                    </div>
                  </div>
                  <p className={`mt-3 text-[10px] sm:text-xs font-bold text-center leading-tight transition-colors duration-700 ${esActual ? 'text-brand-600 scale-105' : yaPaso ? 'text-slate-700' : 'text-slate-400'}`}>{ESTADO_CONFIG[e].label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 sm:hidden">
          {estadosWorkflow.map((e, i) => {
            const esActual = e === orden.estado;
            const yaPaso = i <= idxProgreso;
            return (
              <span key={e} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${esActual ? (destello ? 'bg-brand-500 text-white animate-pulse shadow-md' : 'bg-brand-600 text-white shadow-md') : yaPaso ? 'bg-brand-100 text-brand-700' : 'bg-white border border-slate-200 text-slate-400'}`}>
                {ESTADO_CONFIG[e].label}
              </span>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-100">
          {siguienteEstado && (
            <button onClick={() => cambiarEstado(siguienteEstado)} disabled={guardando} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5 group">
              {guardando ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />} 
              {guardando ? 'Procesando...' : `Avanzar a "${ESTADO_CONFIG[siguienteEstado].label}"`}
            </button>
          )}
          {orden.estado !== 'no_reparable' && orden.estado !== 'entregado' && (
            <button onClick={() => cambiarEstado('no_reparable')} disabled={guardando} className="px-6 py-3 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold rounded-xl transition-colors ml-auto border border-rose-100">
              Marcar como No Reparable
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="h-12 w-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center shrink-0"><User size={24}/></div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Datos del Propietario</h3>
            <p className="text-lg font-black text-slate-800">{orden.cliente?.nombre}</p>
            <p className="text-sm text-slate-600 mt-1 font-medium">{orden.cliente?.telefono}</p>
            <p className="text-sm text-slate-500">{orden.cliente?.email || 'Sin correo'}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="h-12 w-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center shrink-0"><Smartphone size={24}/></div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Especificaciones Técnicas</h3>
            <p className="text-lg font-black text-slate-800">{orden.dispositivo?.marca} {orden.dispositivo?.modelo}</p>
            <p className="text-sm text-slate-600 mt-1 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md inline-block">IMEI: {orden.dispositivo?.imei}</p>
            <p className="text-sm text-slate-500 mt-1 font-medium">Estética: {orden.dispositivo?.color || 'No indicada'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-brand-500">
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex items-center gap-3">
          <ClipboardCheck className="text-brand-500" size={24} />
          <div>
            <h2 className="text-xl font-bold text-slate-800">Panel de Diagnóstico Clínico</h2>
            <p className="text-xs text-slate-500 font-medium">Completa la hoja de ruta técnica del dispositivo ingresado.</p>
          </div>
        </div>
        
        <div className="p-6 md:p-8 space-y-8">
          
          <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl">
            <h3 className="text-xs font-bold text-rose-800 uppercase tracking-widest mb-2 flex items-center gap-2"><AlertCircle size={14}/> Falla reportada al ingreso</h3>
            <p className="text-rose-900 font-medium text-sm leading-relaxed">{orden.fallaReportada}</p>
          </div>

          {/* GALERÍA DE IMÁGENES (Aparece solo si hay fotos en el JSON) */}
          {(checklist.foto1 || checklist.foto2 || checklist.foto3) && (
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Camera size={16} className="text-slate-500" /> Evidencia Fotográfica (Al Ingreso)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {checklist.foto1 && <img src={checklist.foto1} alt="Evidencia 1" className="w-full h-48 object-cover rounded-xl border border-slate-200 shadow-sm hover:scale-105 transition-transform" />}
                {checklist.foto2 && <img src={checklist.foto2} alt="Evidencia 2" className="w-full h-48 object-cover rounded-xl border border-slate-200 shadow-sm hover:scale-105 transition-transform" />}
                {checklist.foto3 && <img src={checklist.foto3} alt="Evidencia 3" className="w-full h-48 object-cover rounded-xl border border-slate-200 shadow-sm hover:scale-105 transition-transform" />}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">Revisión de Hardware</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              {CHECKLIST_ITEMS.map((item) => (
                <div key={item.key} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm hover:border-brand-300 transition-colors">
                  <p className="text-[10px] font-bold text-slate-500 uppercase truncate mb-1.5">{item.label}</p>
                  <select
                    className={`w-full text-xs font-bold py-1.5 px-2 rounded-lg outline-none appearance-none cursor-pointer border ${
                      checklist[item.key] === 'dañado' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                      checklist[item.key] === 'revisar' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      checklist[item.key] === 'reparado' ? 'bg-brand-100 text-brand-700 border-brand-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}
                    value={checklist[item.key] || 'ok'}
                    onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.value })}
                  >
                    <option value="ok">✓ OK</option>
                    <option value="dañado">✖ DAÑADO</option>
                    <option value="revisar">? REVISAR</option>
                    <option value="reparado">⚙ REPARADO</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-800">Bitácora / Procedimiento a realizar</h3>
              <textarea 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none transition-all resize-none" 
                rows={4} 
                value={diagnostico} 
                onChange={(e) => setDiagnostico(e.target.value)} 
                placeholder="Describe el procedimiento técnico, las piezas cambiadas o las observaciones de la placa..." 
              />
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800">Desbloqueo</h3>
              <input 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none transition-all text-center tracking-widest" 
                value={metodoDesbloqueo} 
                onChange={(e) => setMetodoDesbloqueo(e.target.value)} 
                placeholder="PIN, Patrón, etc." 
              />
              <p className="text-[10px] text-slate-400 font-bold uppercase text-center mt-2">Manejo Confidencial</p>
            </div>
          </div>
        </div>
      </div>

      {/* PRESUPUESTO Y GARANTÍA */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
            Valorización y Garantía
            {orden.presupuestoEstado === 'pendiente' && <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-md">Pendiente Cliente</span>}
            {orden.presupuestoEstado === 'aprobado' && <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-md">Aprobado</span>}
          </h3>
          <button onClick={guardarCambios} disabled={guardando} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-md">
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar Ficha
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Valor del Trabajo (Mano de Obra)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input type="number" min="0" className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 font-bold outline-none" value={presupuestoManoObra} onChange={(e) => setPresupuestoManoObra(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">Abonado por el Cliente</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">$</span>
              <input type="number" min="0" className="w-full pl-8 pr-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold outline-none" value={anticipo} onChange={(e) => setAnticipo(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Repuestos Instalados</label>
            <button type="button" onClick={agregarRepuesto} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 shadow-sm"><Plus size={14} /> Asociar Material</button>
          </div>
          <div className="space-y-3">
            {repuestosSel.map((r, idx) => {
              const rep = repuestosCatalogo.find((x) => x.id === r.repuestoId);
              return (
                <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                  <select className="w-full sm:flex-1 px-3 py-2 bg-transparent text-sm font-medium outline-none" value={r.repuestoId} onChange={(e) => actualizarRepuesto(idx, 'repuestoId', e.target.value)}>
                    {repuestosCatalogo.map((rc) => {
                      const sinStock = rc.stockActual <= 0;
                      return (
                        <option key={rc.id} value={rc.id} disabled={sinStock}>
                          {rc.nombre} — {formatoCLP(rc.precioUnitario || rc.precio || 0)} {sinStock ? '(AGOTADO)' : `(Stock: ${rc.stockActual})`}
                        </option>
                      );
                    })}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">Cant:</span>
                    <input type="number" min="1" className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center font-bold outline-none" value={r.cantidad} onChange={(e) => actualizarRepuesto(idx, 'cantidad', e.target.value)} />
                    <button type="button" onClick={() => quitarRepuesto(idx)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
            {repuestosSel.length === 0 && <p className="text-sm text-slate-400 italic text-center py-2">Sin repuestos físicos asignados a esta orden.</p>}
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input type="checkbox" className="peer sr-only" checked={tieneGarantia} onChange={(e) => setTieneGarantia(e.target.checked)} />
                <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </div>
              <span className="text-sm font-black text-indigo-900 uppercase tracking-wide flex items-center gap-2"><ShieldCheck size={18}/> ¿Aplicar Garantía?</span>
            </label>
            
            {tieneGarantia && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-200">
                <span className="text-xs font-bold text-indigo-700">Válida hasta:</span>
                <input type="date" className="text-sm font-bold text-indigo-900 outline-none bg-transparent" value={garantiaHasta} onChange={(e) => setGarantiaHasta(e.target.value)} />
              </div>
            )}
          </div>

          {tieneGarantia && (
            <div className="animate-fade-in space-y-2 pt-2 border-t border-indigo-200/50">
              <p className="text-xs font-bold text-indigo-800">Cumple garantía siempre y cuando cumpla con los siguientes requisitos:</p>
              <textarea 
                className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium outline-none resize-none text-indigo-900"
                rows="2"
                placeholder="Ej: No debe presentar rotura de sellos, trizaduras externas ni exposición a líquidos posterior a la entrega."
                value={condicionesGarantia}
                onChange={(e) => setCondicionesGarantia(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="border-t-2 border-slate-800 border-dashed pt-6 flex flex-col md:flex-row items-end justify-between gap-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm w-full md:w-auto">
            <div><p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Valor Trabajo</p><p className="font-bold text-slate-800">{formatoCLP(presupuestoManoObra)}</p></div>
            <div><p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Total Piezas</p><p className="font-bold text-slate-800">{formatoCLP(totalRepuestosPreview)}</p></div>
            <div><p className="text-emerald-600 font-bold uppercase text-[10px] tracking-widest mb-1">Abono</p><p className="font-bold text-emerald-600">- {formatoCLP(anticipo)}</p></div>
          </div>
          
          <div className="bg-rose-50 border border-rose-200 px-6 py-4 rounded-2xl text-right min-w-[200px]">
            <span className="text-xs font-black text-rose-500 uppercase tracking-widest block mb-1">Falta por pagar</span>
            <span className="font-black text-3xl text-rose-600 leading-none">{formatoCLP(saldoPreview)}</span>
          </div>
        </div>

      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Send size={18} className="text-brand-500"/> Chat con el Cliente</h3>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 h-72 overflow-y-auto mb-4 custom-scrollbar">
          {mensajes.length === 0 && <div className="h-full flex items-center justify-center text-sm font-medium text-slate-400">Canal de comunicación abierto. El cliente verá tus mensajes aquí.</div>}
          {mensajes.map((m) => {
            const esMio = m.autorId === usuario.id;
            return (
              <div key={m.id} className={`flex mb-4 ${esMio ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${esMio ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                  {!esMio && <p className="text-[10px] font-black uppercase opacity-50 mb-1">{m.autor?.nombre}</p>}
                  <p className="font-medium">{m.contenido}</p>
                  <p className={`text-[9px] font-bold mt-1.5 text-right ${esMio ? 'text-brand-200' : 'text-slate-400'}`}>{formatoFechaHora(m.createdAt)}</p>
                </div>
              </div>
            );
          })}
          <div ref={finChat} />
        </div>
        <form onSubmit={enviarMensaje} className="flex gap-2">
          <input className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none" placeholder="Notifica un avance, solicita aprobación o responde dudas..." value={nuevoMensaje} onChange={(e) => setNuevoMensaje(e.target.value)} />
          <button type="submit" disabled={enviandoMensaje || !nuevoMensaje.trim()} className="bg-brand-600 hover:bg-brand-500 text-white px-6 rounded-xl font-bold shadow-md transition-all disabled:opacity-50 flex justify-center items-center">
            {enviandoMensaje ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>

    </div>
  );
}