import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Trash2, UserPlus, Smartphone, Wrench, Calculator, DollarSign, Calendar, AlertCircle, Users, Zap } from 'lucide-react';
import api from '../api/client';
import { formatoCLP } from '../utils/format';

export default function OrdenNueva() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [dispositivos, setDispositivos] = useState([]);
  const [repuestosCatalogo, setRepuestosCatalogo] = useState([]);

  // ✅ NUEVO: Modo de Ingreso (Para Walk-ins)
  const [modoIngreso, setModoIngreso] = useState('registrado'); // 'registrado' | 'rapido'

  // Estados del formulario - MODO REGISTRADO
  const [clienteId, setClienteId] = useState('');
  const [dispositivoId, setDispositivoId] = useState('');
  
  // Estados del formulario - MODO RÁPIDO (Walk-in)
  const [clienteRapido, setClienteRapido] = useState({ nombre: '', telefono: '', email: '' });
  const [dispositivoRapido, setDispositivoRapido] = useState({ imei: '', marca: '', modelo: '', color: '' });

  // Estados Compartidos (Orden)
  const [fallaReportada, setFallaReportada] = useState('');
  const [presupuestoManoObra, setPresupuestoManoObra] = useState('');
  const [anticipo, setAnticipo] = useState('');
  const [fechaCompromiso, setFechaCompromiso] = useState('');
  const [repuestosSel, setRepuestosSel] = useState([]); 

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Carga inicial
  useEffect(() => {
    api.get('/clientes').then(({ data }) => setClientes(data));
    api.get('/repuestos').then(({ data }) => setRepuestosCatalogo(data));
  }, []);

  // Cargar dispositivos cuando se selecciona un cliente (Solo en modo registrado)
  useEffect(() => {
    if (modoIngreso === 'rapido' || !clienteId) { setDispositivos([]); return; }
    api.get('/dispositivos', { params: { clienteId } }).then(({ data }) => setDispositivos(data));
  }, [clienteId, modoIngreso]);

  // Gestión de Repuestos
  const agregarRepuesto = () => {
    if (repuestosCatalogo.length === 0) return;
    setRepuestosSel((prev) => [...prev, { repuestoId: repuestosCatalogo[0].id, cantidad: 1 }]);
  };
  const quitarRepuesto = (idx) => setRepuestosSel((prev) => prev.filter((_, i) => i !== idx));
  const actualizarRepuesto = (idx, campo, valor) => {
    setRepuestosSel((prev) => prev.map((r, i) => (i === idx ? { ...r, [campo]: valor } : r)));
  };

  // MATEMÁTICA EN TIEMPO REAL
  const totalRepuestos = repuestosSel.reduce((acc, r) => {
    const rep = repuestosCatalogo.find((x) => x.id === r.repuestoId);
    const precioUnit = rep ? (Number(rep.precioUnitario) || Number(rep.precio) || 0) : 0;
    return acc + (precioUnit * Number(r.cantidad || 0));
  }, 0);
  
  const totalGeneral = Number(presupuestoManoObra || 0) + totalRepuestos;
  const saldoPendiente = totalGeneral - Number(anticipo || 0);

  // GUARDADO INTELIGENTE (Detecta si es Walk-in o Registrado)
  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true); 
    setError('');

    try {
      let finalClienteId = clienteId;
      let finalDispositivoId = dispositivoId;

      // SI ES UN CLIENTE PRESENCIAL NUEVO (WALK-IN)
      if (modoIngreso === 'rapido') {
        // 1. Creamos al cliente silenciosamente en la BD
        const { data: nuevoCli } = await api.post('/clientes', clienteRapido);
        finalClienteId = nuevoCli.id;

        // 2. Le vinculamos el dispositivo
        const { data: nuevoDisp } = await api.post('/dispositivos', { ...dispositivoRapido, clienteId: finalClienteId });
        finalDispositivoId = nuevoDisp.id;
      }

      // 3. Aperturamos la Orden
      const { data: nuevaOrden } = await api.post('/ordenes', {
        clienteId: finalClienteId,
        dispositivoId: finalDispositivoId,
        fallaReportada: modoIngreso === 'rapido' ? `[PRESENCIAL] - ${fallaReportada}` : fallaReportada,
        presupuestoManoObra: presupuestoManoObra || 0,
        anticipo: anticipo || 0,
        fechaCompromiso: fechaCompromiso || null,
        repuestos: repuestosSel.filter((r) => r.repuestoId && r.cantidad > 0)
          .map((r) => ({ repuestoId: r.repuestoId, cantidad: Number(r.cantidad) })),
      });
      
      navigate(`/ordenes/${nuevaOrden.id}`);

    } catch (err) {
      setError(err.response?.data?.error || 'Ocurrió un error al crear la orden. Revisa los datos.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10 animate-fade-in mt-4">
      
      <button onClick={() => navigate('/ordenes')} className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-max">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver a órdenes
      </button>

      {/* Header Premium */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
          <Wrench size={180} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">Ingreso al Taller</h1>
          <p className="text-slate-300 text-sm mt-1 font-medium">Apertura de ficha técnica, recepción de equipo y cotización.</p>
        </div>
      </div>

      <form onSubmit={guardar} className="space-y-6">
        
        {/* SECCIÓN 1: IDENTIFICACIÓN (SELECTOR DE MODO) */}
        <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600"><UserPlus size={18} /></div>
              <h3 className="font-bold text-lg text-slate-800">1. Identificación del Cliente</h3>
            </div>
            
            {/* TABS DE MODO DE INGRESO */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                type="button"
                onClick={() => setModoIngreso('registrado')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${modoIngreso === 'registrado' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users size={14} /> Cliente Registrado
              </button>
              <button 
                type="button"
                onClick={() => setModoIngreso('rapido')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${modoIngreso === 'rapido' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Zap size={14} /> Ingreso Presencial (Nuevo)
              </button>
            </div>
          </div>

          {/* MODO 1: CLIENTE REGISTRADO (DIRECTORIO) */}
          {modoIngreso === 'registrado' && (
            <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Cliente en Base de Datos</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none transition-all" required value={clienteId} onChange={(e) => { setClienteId(e.target.value); setDispositivoId(''); }}>
                  <option value="">Selecciona en el directorio...</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre} — {c.telefono}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Equipo Registrado</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none transition-all disabled:opacity-50" required disabled={!clienteId} value={dispositivoId} onChange={(e) => setDispositivoId(e.target.value)}>
                  <option value="">{clienteId ? 'Selecciona un equipo...' : 'Falta seleccionar cliente'}</option>
                  {dispositivos.map((d) => <option key={d.id} value={d.id}>{d.marca} {d.modelo} — {d.imei}</option>)}
                </select>
                {clienteId && dispositivos.length === 0 && (
                  <p className="text-xs text-rose-500 mt-2 font-medium">Este cliente no tiene equipos. Usa el "Ingreso Presencial".</p>
                )}
              </div>
            </div>
          )}

          {/* MODO 2: WALK-IN (INGRESO RÁPIDO PRESENCIAL) */}
          {modoIngreso === 'rapido' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-5">
                <h4 className="text-xs font-black text-brand-700 uppercase tracking-widest mb-4">Datos del Cliente</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nombre Completo</label>
                    <input className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-brand-400" required value={clienteRapido.nombre} onChange={(e) => setClienteRapido({...clienteRapido, nombre: e.target.value})} placeholder="Ej: Juan Pérez" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Teléfono (WhatsApp)</label>
                    <input className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-brand-400" required value={clienteRapido.telefono} onChange={(e) => setClienteRapido({...clienteRapido, telefono: e.target.value})} placeholder="+56 9..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Email (Para enviar PDF)</label>
                    <input type="email" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-brand-400" required value={clienteRapido.email} onChange={(e) => setClienteRapido({...clienteRapido, email: e.target.value})} placeholder="correo@ejemplo.com" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2"><Smartphone size={14}/> Datos del Equipo</h4>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">IMEI / Serie</label>
                    <input className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold text-brand-700 outline-none focus:border-brand-400" required minLength={14} maxLength={15} value={dispositivoRapido.imei} onChange={(e) => setDispositivoRapido({...dispositivoRapido, imei: e.target.value.replace(/\D/g, '')})} placeholder="15 dígitos" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Marca</label>
                    <input className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-brand-400" required value={dispositivoRapido.marca} onChange={(e) => setDispositivoRapido({...dispositivoRapido, marca: e.target.value})} placeholder="Ej: Apple" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Modelo</label>
                    <input className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-brand-400" required value={dispositivoRapido.modelo} onChange={(e) => setDispositivoRapido({...dispositivoRapido, modelo: e.target.value})} placeholder="Ej: iPhone 13" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Motivo de Ingreso (Falla reportada por el cliente)</label>
            <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none transition-all resize-none" rows={3} required value={fallaReportada} onChange={(e) => setFallaReportada(e.target.value)} placeholder="Describe el problema del equipo de forma detallada..." />
          </div>
        </section>

        {/* SECCIÓN 2: PRESUPUESTO Y MATEMÁTICA */}
        <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><Calculator size={18} /></div>
            <h3 className="font-bold text-lg text-slate-800">2. Cotización y Abonos</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Mano de Obra ($)</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" min="0" className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-bold outline-none" value={presupuestoManoObra} onChange={(e) => setPresupuestoManoObra(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Abono Inicial ($)</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" min="0" className="w-full pl-9 pr-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-bold outline-none" value={anticipo} onChange={(e) => setAnticipo(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Fecha Estimada de Entrega</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="date" className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-bold outline-none text-slate-700" value={fechaCompromiso} onChange={(e) => setFechaCompromiso(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Repuestos */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-0">Componentes requeridos (Opcional)</label>
              <button type="button" onClick={agregarRepuesto} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-brand-600 hover:border-brand-300 hover:text-brand-700 flex items-center gap-1 transition-all shadow-sm"><Plus size={14} /> Agregar Repuesto</button>
            </div>
            
            {repuestosSel.length > 0 ? (
              <div className="space-y-3">
                {repuestosSel.map((r, idx) => {
                  const rep = repuestosCatalogo.find((x) => x.id === r.repuestoId);
                  const precioU = rep ? (Number(rep.precioUnitario) || Number(rep.precio) || 0) : 0;
                  const stockMax = rep ? (Number(rep.stockActual) || Number(rep.stock) || 99) : 99;
                  
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                      <select className="w-full sm:flex-1 px-3 py-2 bg-transparent text-sm font-medium outline-none" value={r.repuestoId} onChange={(e) => actualizarRepuesto(idx, 'repuestoId', e.target.value)}>
                        {repuestosCatalogo.map((rc) => {
                           const p = Number(rc.precioUnitario) || Number(rc.precio) || 0;
                           const s = Number(rc.stockActual) || Number(rc.stock) || 0;
                           return (
                            <option key={rc.id} value={rc.id} disabled={s === 0}>
                              {rc.nombre} ({formatoCLP(p)}) — Quedan: {s}
                            </option>
                           );
                        })}
                      </select>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-xs font-bold text-slate-400">Cant:</span>
                        <input type="number" min="1" max={stockMax} className="w-16 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center font-bold outline-none focus:ring-2 focus:ring-brand-500" value={r.cantidad} onChange={(e) => actualizarRepuesto(idx, 'cantidad', e.target.value)} />
                        <button type="button" onClick={() => quitarRepuesto(idx)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic text-center py-2">No se han añadido repuestos a esta cotización.</p>
            )}
          </div>

          {/* Bloque Totalizador Profesional */}
          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="bg-slate-900 rounded-2xl p-6 text-white max-w-sm ml-auto shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none"><Calculator size={100}/></div>
              <div className="relative z-10 space-y-3">
                <div className="flex justify-between items-center text-sm font-medium text-slate-400">
                  <span>Costo Total Reparación:</span>
                  <span className="text-white">{formatoCLP(totalGeneral)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium text-emerald-400 border-b border-white/10 pb-3">
                  <span>Abono del Cliente:</span>
                  <span>- {formatoCLP(anticipo || 0)}</span>
                </div>
                <div className="flex justify-between items-end pt-1">
                  <span className="text-sm font-bold text-rose-400 uppercase tracking-widest">Saldo Pendiente</span>
                  <span className="text-3xl font-black text-rose-400 leading-none">{formatoCLP(saldoPendiente)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && <p className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center gap-2"><AlertCircle size={16}/> {error}</p>}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
          <button type="button" onClick={() => navigate('/ordenes')} className="px-6 py-4 sm:py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">Cancelar</button>
          <button type="submit" disabled={guardando} className="flex justify-center items-center gap-2 px-8 py-4 sm:py-3 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
            {guardando ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Aperturar Orden de Taller
          </button>
        </div>
      </form>
    </div>
  );
}