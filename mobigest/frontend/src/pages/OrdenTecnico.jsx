import { useState, useEffect } from 'react';
import { 
  Camera, ShieldAlert, Wrench, FileText, CheckCircle2, XCircle, Circle, 
  DollarSign, PenTool, Save, UploadCloud, X, ArrowLeft, Inbox, Calendar, 
  ChevronRight, Smartphone, Loader2, AlertCircle
} from 'lucide-react';
import api from '../api/client';
import { formatoCLP } from '../utils/format';
import { useAuth } from '../context/AuthContext'; // IMPORTAMOS LA AUTENTICACIÓN

const HARDWARE_LIST = [
  { key: 'pantalla', label: 'Pantalla' },
  { key: 'bateria', label: 'Batería' },
  { key: 'flex_carga', label: 'Flex de Carga' },
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
  { key: 'huella', label: 'Huella / Touch ID' }
];

const FALLAS_COMUNES = [
  'Pantalla trizada / Rota',
  'Batería degradada / Hinchada',
  'No enciende (Muerte súbita)',
  'Pin de carga dañado / Suelto',
  'Se reinicia en el logo (Bootloop)',
  'No da señal / Sin servicio',
  'Micrófono no funciona',
  'Cristal trasero roto'
];

export default function OrdenTecnico() {
  const { usuario } = useAuth(); // EXTRAEMOS EL USUARIO LOGUEADO
  
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);
  const [cargandoInbox, setCargandoInbox] = useState(true);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);

  // ESTADOS PARA ASIGNACIÓN DE TÉCNICOS
  const [tecnicos, setTecnicos] = useState([]);
  const [tecnicoId, setTecnicoId] = useState('');

  const [hardwareState, setHardwareState] = useState({});
  const [pin, setPin] = useState('');
  const [patron, setPatron] = useState([]);
  const [fotos, setFotos] = useState({ 1: null, 2: null, 3: null });
  const [fallaTexto, setFallaTexto] = useState('');
  const [bitacora, setBitacora] = useState('');
  
  const [totalReparacion, setTotalReparacion] = useState('');
  const [abonoInicial, setAbonoInicial] = useState('');
  
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');

  const saldoPendiente = Math.max(0, Number(totalReparacion || 0) - Number(abonoInicial || 0));

  useEffect(() => {
    cargarBandeja();
    // Cargar la lista de técnicos disponibles para el selector
    api.get('/usuarios', { params: { rol: 'tecnico' } })
       .then(res => setTecnicos(res.data))
       .catch(err => console.error("Error cargando técnicos", err));
  }, []);

  const cargarBandeja = async () => {
    setCargandoInbox(true);
    try {
      const { data } = await api.get('/ordenes');
      const pendientes = data.filter(o => o.estado === 'recibido');
      setOrdenesPendientes(pendientes);
    } catch (error) {
      console.error("Error al cargar inbox:", error);
    } finally {
      setCargandoInbox(false);
    }
  };

  const abrirOrden = (orden) => {
    setOrdenSeleccionada(orden);
    setHardwareState({});
    setPin('');
    setPatron([]);
    setFotos({ 1: null, 2: null, 3: null });
    setTotalReparacion('');
    setAbonoInicial('');
    setBitacora('');
    setErrorGuardar('');
    
    // Asignar automáticamente al técnico logueado (o al que ya estaba asignado)
    setTecnicoId(orden.usuarioId || usuario?.id || '');

    const { motivo } = extraerDatosCita(orden.fallaReportada);
    setFallaTexto(motivo);
  };

  const cerrarOrden = () => {
    setOrdenSeleccionada(null);
  };

  const toggleHardware = (key, status) => {
    setHardwareState(prev => ({ ...prev, [key]: status }));
  };

  const togglePatron = (index) => {
    if (patron.includes(index)) {
      setPatron(patron.filter(i => i !== index));
    } else {
      setPatron([...patron, index]);
    }
  };

  const handleImageUpload = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotos(prev => ({ ...prev, [index]: reader.result }));
      };
      reader.readAsDataURL(file); 
    }
  };

  const removeImage = (index, e) => {
    e.preventDefault();
    setFotos(prev => ({ ...prev, [index]: null }));
  };

  const agregarFallaRapida = (falla) => {
    setFallaTexto(prev => prev ? `${prev}, ${falla}` : falla);
  };

  const extraerDatosCita = (falla) => {
    if (!falla) return { esCita: false, hora: null, motivo: 'Sin detalles' };
    
    if (falla.includes('[VISITA:')) {
      const partes = falla.split(']');
      const hora = partes[0].replace('[VISITA:', '').trim();
      const motivo = partes[1]?.replace('-', '').trim() || 'Sin motivo especificado';
      return { esCita: true, hora, motivo };
    } else if (falla.includes('[CITA PRESENCIAL:')) {
      const partes = falla.split(']');
      const hora = partes[0].replace('[CITA PRESENCIAL:', '').trim();
      const motivo = partes[1]?.replace('-', '').trim() || 'Sin motivo especificado';
      return { esCita: true, hora, motivo };
    }
    return { esCita: false, hora: null, motivo: falla };
  };

  // ==========================================
  // GUARDAR DIAGNÓSTICO Y ASIGNAR TÉCNICO
  // ==========================================
  const guardarDiagnostico = async () => {
    if (!totalReparacion) {
      setErrorGuardar('Por favor, ingresa un Total de Reparación estimado.');
      return;
    }
    setGuardando(true);
    setErrorGuardar('');

    try {
      const checklistParseado = {};
      
      if (fotos[1]) checklistParseado.foto1 = fotos[1];
      if (fotos[2]) checklistParseado.foto2 = fotos[2];
      if (fotos[3]) checklistParseado.foto3 = fotos[3];

      Object.entries(hardwareState).forEach(([key, status]) => {
        if (status === 'ok') checklistParseado[key] = 'ok';
        if (status === 'bad') checklistParseado[key] = 'dañado';
      });

      const diagnosticoFinal = `📌 FALLA CONFIRMADA:\n${fallaTexto}\n\n📝 PROCEDIMIENTO / BITÁCORA:\n${bitacora || 'Sin notas adicionales.'}`;
      
      let metodoDesbloqueoFinal = 'Sin bloqueo';
      if (pin) {
        metodoDesbloqueoFinal = `PIN: ${pin}`;
      } else if (patron.length > 0) {
        metodoDesbloqueoFinal = `Patrón: ${patron.join('-')}`; 
      }

      // 1. Guardamos el diagnóstico
      await api.put(`/ordenes/${ordenSeleccionada.id}`, {
        diagnostico: diagnosticoFinal,
        checklist: checklistParseado, 
        metodoDesbloqueo: metodoDesbloqueoFinal,
        presupuestoManoObra: Number(totalReparacion),
        anticipo: Number(abonoInicial || 0),
        estado: 'en_reparacion' 
      });

      // 2. ASIGNAMOS EL TÉCNICO EN LA BASE DE DATOS (Solo si no es técnico autoasignándose por defecto)
      if (tecnicoId && usuario?.rol !== 'tecnico') {
        await api.put(`/ordenes/${ordenSeleccionada.id}/asignar`, { usuarioId: tecnicoId });
      }

      await cargarBandeja();
      cerrarOrden();

    } catch (err) {
      setErrorGuardar(err.response?.data?.error || 'Error al conectar con la base de datos.');
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // VISTA 1: BANDEJA DE ENTRADA
  // ==========================================
  if (!ordenSeleccionada) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-10 animate-fade-in mt-4">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-xl flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
            <Inbox size={180} />
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <Inbox className="text-brand-400" size={32} /> Bandeja de Evaluaciones
            </h1>
            <p className="text-slate-300 text-sm mt-1">Selecciona una cita pendiente para iniciar su diagnóstico clínico.</p>
          </div>
          <div className="relative z-10 hidden md:block bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/20 text-center">
            <p className="text-3xl font-black text-brand-400 leading-none">{ordenesPendientes.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mt-1">Pendientes</p>
          </div>
        </div>

        {cargandoInbox ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={40} className="animate-spin text-brand-500 mb-4" />
            <p className="font-bold">Buscando citas programadas...</p>
          </div>
        ) : ordenesPendientes.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">¡Bandeja al día!</h3>
            <p className="text-slate-500 mt-2">No hay equipos esperando evaluación en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ordenesPendientes.map(orden => {
              const { esCita, hora, motivo } = extraerDatosCita(orden.fallaReportada);
              const fCompromiso = orden.fechaCompromiso ? new Date(orden.fechaCompromiso).toLocaleDateString('es-CL') : 'Fecha no definida';

              return (
                <div 
                  key={orden.id} 
                  onClick={() => abrirOrden(orden)}
                  className="bg-white border border-slate-200 rounded-3xl p-5 hover:border-brand-400 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1 flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold font-mono px-2.5 py-1 rounded-lg border border-slate-200">
                      {orden.codigo}
                    </span>
                    {esCita ? (
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-200">
                        <Calendar size={12} /> Visita: {hora}
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-200">
                        Mostrador
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-slate-800 mb-1 line-clamp-1">{orden.cliente?.nombre || orden.cliente}</h3>
                  <p className="text-sm font-bold text-brand-600 flex items-center gap-1.5 mb-4 line-clamp-1">
                    <Smartphone size={16} /> {orden.dispositivo?.marca || orden.equipo}
                  </p>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex-grow">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Motivo Reportado</p>
                    <p className="text-sm text-slate-600 font-medium line-clamp-2">{motivo}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-400 pt-4 border-t border-slate-100">
                    <span>Agendado: {fCompromiso}</span>
                    <div className="flex items-center text-brand-500 group-hover:translate-x-1 transition-transform">
                      Atender <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VISTA 2: HOJA CLÍNICA DE DIAGNÓSTICO
  // ==========================================
  return (
    <div className="space-y-6 pb-10 animate-fade-in max-w-6xl mx-auto mt-4">
      
      <button onClick={cerrarOrden} className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-max">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver a Bandeja
      </button>

      <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-3">
            <Wrench className="text-brand-400" /> Diagnóstico Activo
          </h1>
          <p className="text-slate-400 text-sm mt-1">Completa la hoja de ruta clínica del equipo de <span className="text-white font-bold">{ordenSeleccionada.cliente?.nombre || ordenSeleccionada.cliente}</span>.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
          
          {/* NUEVO SELECTOR DE TÉCNICO PROTEGIDO */}
          <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700 w-full md:w-auto">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Técnico a Cargo</p>
            {usuario?.rol === 'tecnico' ? (
              <div className="w-full bg-slate-900 border border-slate-600 text-brand-400 text-sm font-bold rounded-xl px-4 py-2 text-center">
                👨‍🔧 {usuario.nombre}
              </div>
            ) : (
              <select 
                className="w-full bg-slate-900 border border-slate-600 text-brand-400 text-sm font-bold rounded-xl px-3 py-2 outline-none focus:border-brand-500 cursor-pointer"
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
              >
                <option value="">Sin asignar (Global)</option>
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-slate-800 px-6 py-3 rounded-2xl border border-slate-700 text-center w-full md:w-auto">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">ID de Orden</p>
            <p className="font-mono text-2xl font-black text-brand-400 tracking-wider">{ordenSeleccionada.codigo}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white/90 backdrop-blur-xl border border-slate-100 shadow-sm rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Camera size={16} /> Evidencia Fotográfica Inicial
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <label key={i} className={`relative border-2 border-dashed rounded-2xl h-32 flex flex-col items-center justify-center transition-colors cursor-pointer group overflow-hidden ${fotos[i] ? 'border-brand-500' : 'border-slate-200 text-slate-400 hover:text-brand-500 hover:border-brand-300 hover:bg-brand-50'}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(i, e)} />
                  {fotos[i] ? (
                    <>
                      <img src={fotos[i]} alt={`Evidencia ${i}`} className="w-full h-full object-cover" />
                      <button onClick={(e) => removeImage(i, e)} className="absolute top-2 right-2 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full shadow-md transition-transform hover:scale-110" title="Quitar foto">
                        <X size={14} strokeWidth={3} />
                      </button>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={28} className="mb-2 group-hover:-translate-y-1 transition-transform" />
                      <span className="text-xs font-bold text-center px-2">Subir Foto {i}</span>
                    </>
                  )}
                </label>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-3 font-medium text-center">Permite formatos JPG y PNG. Máx 50MB por imagen.</p>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-slate-100 shadow-sm rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldAlert size={16} /> Diagnóstico de Componentes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {HARDWARE_LIST.map((item) => (
                <div key={item.key} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                  <span className="text-xs font-bold text-slate-700">{item.label}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => toggleHardware(item.key, 'ok')} className={`p-1.5 rounded-full transition-all ${hardwareState[item.key] === 'ok' ? 'bg-emerald-100 text-emerald-600 scale-110 shadow-sm' : 'text-slate-300 hover:bg-slate-100'}`} title="Funciona OK"><CheckCircle2 size={18} /></button>
                    <button onClick={() => toggleHardware(item.key, 'bad')} className={`p-1.5 rounded-full transition-all ${hardwareState[item.key] === 'bad' ? 'bg-rose-100 text-rose-600 scale-110 shadow-sm' : 'text-slate-300 hover:bg-slate-100'}`} title="Falla Detectada"><XCircle size={18} /></button>
                    <button onClick={() => toggleHardware(item.key, null)} className={`p-1.5 rounded-full transition-all ${!hardwareState[item.key] ? 'bg-slate-200 text-slate-600 scale-110 shadow-sm' : 'text-slate-300 hover:bg-slate-100'}`} title="No revisado"><Circle size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-rose-50/50 border border-rose-100 rounded-3xl p-6 shadow-sm flex flex-col">
              <label className="text-sm font-bold text-rose-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={16} /> Falla Confirmada
              </label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {FALLAS_COMUNES.map(falla => (
                  <button 
                    key={falla}
                    onClick={() => agregarFallaRapida(falla)}
                    className="text-[10px] font-bold bg-white border border-rose-200 text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-rose-600 hover:text-white transition-colors shadow-sm"
                  >
                    + {falla}
                  </button>
                ))}
              </div>
              <textarea 
                className="w-full flex-grow bg-white/80 border border-rose-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rose-400 outline-none resize-none text-slate-700" 
                rows={4} 
                value={fallaTexto}
                onChange={(e) => setFallaTexto(e.target.value)}
                placeholder="Describe detalladamente el problema del equipo aquí..."
              />
            </div>
            
            <div className="bg-brand-50/50 border border-brand-100 rounded-3xl p-6 shadow-sm flex flex-col">
              <label className="text-sm font-bold text-brand-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <PenTool size={16} /> Bitácora Técnica
              </label>
              <textarea 
                className="w-full flex-grow bg-white/80 border border-brand-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-400 outline-none resize-none text-slate-700" 
                rows={4}
                value={bitacora}
                onChange={(e) => setBitacora(e.target.value)} 
                placeholder="Indica los pasos a seguir, repuestos necesarios y observaciones para que el cliente apruebe la reparación..."
              />
            </div>
          </div>

        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 text-white shadow-xl rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none"><ShieldAlert size={100} /></div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2 relative z-10">
              <LockIcon size={16} /> Accesos del Equipo
            </h3>
            
            <div className="space-y-6 relative z-10">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-2">PIN Numérico</label>
                <input 
                  type="text" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center tracking-[0.5em] font-mono text-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-white" 
                  placeholder="----" 
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-3 text-center">O Patrón de Desbloqueo</label>
                <div className="grid grid-cols-3 gap-4 w-40 mx-auto">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((dot) => (
                    <button 
                      key={dot}
                      onClick={() => togglePatron(dot)}
                      className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 ${patron.includes(dot) ? 'bg-brand-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110' : 'bg-slate-700 hover:bg-slate-600'}`}
                    >
                      {patron.includes(dot) && <div className="h-3 w-3 bg-white rounded-full"></div>}
                    </button>
                  ))}
                </div>
                <div className="text-center mt-3">
                  <button onClick={() => setPatron([])} className="text-xs text-slate-400 hover:text-white underline">Limpiar patrón</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <DollarSign size={16} /> Valoración Inicial
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">Total Reparación</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input 
                    type="number" 
                    value={totalReparacion}
                    onChange={(e) => setTotalReparacion(e.target.value)}
                    className="pl-8 pr-4 py-2 w-32 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-slate-700 outline-none focus:border-brand-500" 
                    placeholder="0" 
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">Abono Inicial</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">$</span>
                  <input 
                    type="number" 
                    value={abonoInicial}
                    onChange={(e) => setAbonoInicial(e.target.value)}
                    className="pl-8 pr-4 py-2 w-32 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-right font-bold outline-none focus:border-emerald-500" 
                    placeholder="0" 
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-extrabold text-rose-600">Saldo Pendiente</span>
                <span className="text-xl font-black text-rose-600">{formatoCLP(saldoPendiente)}</span>
              </div>
            </div>
          </div>

          {errorGuardar && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-shake">
              <AlertCircle size={18} className="shrink-0" />
              {errorGuardar}
            </div>
          )}

          <button 
            onClick={guardarDiagnostico} 
            disabled={guardando}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {guardando ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />} 
            {guardando ? 'Iniciando Reparación...' : 'Aprobar e Iniciar Reparación'}
          </button>

        </div>
      </div>
    </div>
  );
}

function LockIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}