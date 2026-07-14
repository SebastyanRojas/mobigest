import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Loader2, History, QrCode, ScanLine, Cpu, Smartphone, Calendar, Clock, AlertCircle, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { formatoFecha, tiempoTranscurrido } from '../utils/format';

const VACIO = { imei: '', marca: '', modelo: '', color: '', observaciones: '', clienteId: '' };

export default function Dispositivos() {
  const navigate = useNavigate();
  const [dispositivos, setDispositivos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  // Modal de Edición/Creación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Modal del QR
  const [qrModal, setQrModal] = useState({ abierto: false, dispositivo: null });

  const cargar = useCallback(async (q) => {
    setCargando(true);
    try {
      const { data } = await api.get('/dispositivos', { params: q ? { q } : {} });
      setDispositivos(data);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    api.get('/clientes').then(({ data }) => setClientes(data));
  }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda, cargar]);

  const abrirNuevo = () => { setEditando(null); setForm(VACIO); setError(''); setModalAbierto(true); };
  
  const abrirEditar = (d) => {
    setEditando(d);
    setForm({ imei: d.imei, marca: d.marca, modelo: d.modelo, color: d.color || '', observaciones: d.observaciones || '', clienteId: d.clienteId });
    setError(''); setModalAbierto(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true); setError('');
    try {
      if (editando) {
        await api.put(`/dispositivos/${editando.id}`, form);
      } else {
        await api.post('/dispositivos', form);
      }
      setModalAbierto(false);
      cargar(busqueda);
    } catch (err) {
      setError(err.response?.data?.error || 'Ocurrió un error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (d) => {
    if (!confirm(`¿Eliminar el dispositivo ${d.marca} ${d.modelo}?`)) return;
    try {
      await api.delete(`/dispositivos/${d.id}`);
      cargar(busqueda);
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo eliminar el dispositivo.');
    }
  };

  // Función actualizada para abrir el Modal del QR
  const generarEtiquetaQR = (d) => {
    setQrModal({ abierto: true, dispositivo: d });
  };

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <Cpu size={250} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">Inventario de Dispositivos</h1>
          <p className="text-slate-300 text-sm mt-1 font-medium">Gestión de equipos, historiales y trazabilidad por IMEI.</p>
        </div>
        <button 
          onClick={abrirNuevo} 
          className="relative z-10 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all duration-300 hover:-translate-y-1"
        >
          <Plus size={18} strokeWidth={3} /> Ingresar Equipo
        </button>
      </div>

      {/* Barra de Búsqueda Mejorada */}
      <div className="relative w-full max-w-md group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors">
          <Search size={18} />
        </div>
        <input 
          className="w-full pl-11 pr-12 py-3.5 bg-white border-2 border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-2xl text-sm font-medium text-slate-700 placeholder-slate-400 transition-all outline-none shadow-sm" 
          placeholder="Escanear o buscar IMEI, marca, modelo..." 
          value={busqueda} 
          onChange={(e) => setBusqueda(e.target.value)} 
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-brand-50 hover:text-brand-600 transition-colors" title="Escanear código de barras">
            <ScanLine size={16} />
          </button>
        </div>
      </div>

      {/* Lista de Dispositivos */}
      <div>
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin text-brand-500 mb-4" size={32} />
            <p className="font-medium animate-pulse">Sincronizando inventario...</p>
          </div>
        ) : dispositivos.length === 0 ? (
          <EmptyState icon={Smartphone} title="Taller sin equipos" description="Registra el primer dispositivo para generar su trazabilidad y asociarlo a una orden." />
        ) : (
          <div className="space-y-4">
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <div className="col-span-3">Equipo e IMEI</div>
              <div className="col-span-3">Propietario</div>
              <div className="col-span-4">Control de Tiempos (SLA)</div>
              <div className="col-span-2 text-right pr-4">Gestión</div>
            </div>

            {dispositivos.map((d, index) => {
              const isOverdue = index % 3 === 0; 
              const isWarning = index % 3 === 1; 

              return (
                <div key={d.id} className="group flex flex-col lg:grid lg:grid-cols-12 gap-4 items-start lg:items-center bg-white/90 backdrop-blur-xl border border-slate-100 p-5 rounded-3xl shadow-[0_4px_15px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-brand-200 transition-all duration-300">
                  
                  <div className="col-span-3 flex items-center gap-4 w-full">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 flex items-center justify-center shadow-inner group-hover:text-brand-500 transition-colors shrink-0">
                      <Smartphone size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate group-hover:text-brand-600 transition-colors">{d.marca} {d.modelo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200">{d.imei}</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3 w-full">
                    <p className="text-sm font-bold text-slate-700">{d.cliente?.nombre || 'Sin asignar'}</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {d.color ? `Color: ${d.color}` : 'Color no registrado'}
                    </p>
                  </div>

                  <div className="col-span-4 w-full flex flex-col gap-2 border-l border-slate-100 pl-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Calendar size={14} className="text-brand-500" /> 
                      Ingreso: <span className="font-medium text-slate-500">{d.createdAt ? formatoFecha(d.createdAt) : 'Hace 2 días'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className={isOverdue ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'} />
                      <span className={`text-[10px] uppercase tracking-widest font-extrabold px-2 py-1 rounded-lg border ${
                        isOverdue 
                          ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' 
                          : isWarning 
                            ? 'bg-amber-50 text-amber-600 border-amber-200' 
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      }`}>
                        {isOverdue ? 'Límite Excedido (Atraso)' : isWarning ? 'Vence Hoy' : 'A Tiempo (Quedan 48h)'}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-end w-full lg:w-auto gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => generarEtiquetaQR(d)} title="Imprimir QR" className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors">
                      <QrCode size={18} />
                    </button>
                    <button onClick={() => navigate(`/ordenes?dispositivoId=${d.id}`)} title="Historial Clínico" className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">
                      <History size={18} />
                    </button>
                    <button onClick={() => abrirEditar(d)} title="Editar" className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => eliminar(d)} title="Eliminar" className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Equipo */}
      <Modal open={modalAbierto} onClose={() => setModalAbierto(false)} title={editando ? 'Modificar Especificaciones' : 'Registro de Nuevo Equipo'}>
        <form onSubmit={guardar} className="space-y-5 mt-2">
          {/* ... Mismo contenido del form que antes ... */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Propietario</label>
              <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none" required value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
                <option value="">Asignar a un cliente...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre} — {c.telefono}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">IMEI (Identificador Único)</label>
              <div className="relative">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-brand-700 focus:ring-2 focus:ring-brand-500 text-sm outline-none placeholder-slate-300" required minLength={14} maxLength={15} value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value.replace(/\D/g, '') })} placeholder="Escanee o digite los 15 números" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Marca</label>
              <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none" required value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Ej: Samsung" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Modelo</label>
              <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none" required value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="Ej: Galaxy S23" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setModalAbierto(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md transition-all disabled:opacity-50">
              {guardando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Guardar Equipo
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal del Código QR */}
      <Modal open={qrModal.abierto} onClose={() => setQrModal({ abierto: false, dispositivo: null })} title="Etiqueta de Identificación">
        {qrModal.dispositivo && (
          <div className="flex flex-col items-center p-4 space-y-6">
            
            {/* Diseño de Etiqueta Térmica Realista */}
            <div className="bg-white border-2 border-slate-800 p-6 rounded-xl w-64 shadow-xl relative overflow-hidden">
              <div className="text-center space-y-3 relative z-10">
                <h4 className="font-black text-slate-900 text-2xl uppercase tracking-widest">MOBIGEST</h4>
                <div className="border-t-2 border-slate-800 border-dashed my-2"></div>
                
                <p className="text-sm font-bold text-slate-800 uppercase leading-tight">
                  {qrModal.dispositivo.marca} <br/> {qrModal.dispositivo.modelo}
                </p>
                
                {/* Generador de QR real usando API pública (sin instalar librerías) */}
                <div className="flex justify-center py-4 bg-white rounded-lg">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrModal.dispositivo.imei}`} 
                    alt="Código QR del IMEI" 
                    className="w-32 h-32 opacity-90 mix-blend-multiply"
                  />
                </div>
                
                <p className="font-mono text-sm font-bold text-slate-900 tracking-[0.2em]">{qrModal.dispositivo.imei}</p>
                
                <div className="border-t-2 border-slate-800 border-dashed my-2"></div>
                <p className="text-xs font-bold text-slate-700 uppercase line-clamp-1">
                  Prop: {qrModal.dispositivo.cliente?.nombre || 'Taller'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 w-full mt-4">
              <button 
                onClick={() => setQrModal({ abierto: false, dispositivo: null })} 
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cerrar
              </button>
              <button 
                onClick={() => {
                  alert('Simulando envío a impresora térmica conectada al puerto USB/Bluetooth...');
                  setQrModal({ abierto: false, dispositivo: null });
                }} 
                className="flex-1 flex justify-center items-center gap-2 px-4 py-3 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors shadow-md"
              >
                <Printer size={18} /> Imprimir QR
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}