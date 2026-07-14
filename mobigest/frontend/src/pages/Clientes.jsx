import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Users, Loader2, Phone, Mail, MapPin, UserCircle } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

const VACIO = { nombre: '', email: '', telefono: '', direccion: '' };

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para el Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async (q) => {
    setCargando(true);
    try {
      const { data } = await api.get('/clientes', { params: q ? { q } : {} });
      setClientes(data);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda, cargar]);

  const abrirNuevo = () => { setEditando(null); setForm(VACIO); setError(''); setModalAbierto(true); };
  
  const abrirEditar = (c) => {
    setEditando(c);
    setForm({ nombre: c.nombre, email: c.email || '', telefono: c.telefono || '', direccion: c.direccion || '' });
    setError(''); setModalAbierto(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true); setError('');
    try {
      if (editando) {
        await api.put(`/clientes/${editando.id}`, form);
      } else {
        await api.post('/clientes', form);
      }
      setModalAbierto(false);
      cargar(busqueda);
    } catch (err) {
      setError(err.response?.data?.error || 'Ocurrió un error al guardar el cliente.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (c) => {
    if (!confirm(`¿Estás seguro de eliminar a ${c.nombre}? Esto podría afectar su historial.`)) return;
    try {
      await api.delete(`/clientes/${c.id}`);
      cargar(busqueda);
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo eliminar el cliente.');
    }
  };

  // Función auxiliar para obtener iniciales del nombre
  const getIniciales = (nombre) => {
    if (!nombre) return '?';
    const partes = nombre.split(' ');
    return partes.length > 1 ? partes[0][0] + partes[1][0] : partes[0][0];
  };

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
          <Users size={200} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">Cartera de Clientes</h1>
          <p className="text-slate-300 text-sm mt-1 font-medium">Gestiona los datos de contacto y fidelización de tus usuarios.</p>
        </div>
        <button 
          onClick={abrirNuevo} 
          className="relative z-10 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all duration-300 hover:-translate-y-1"
        >
          <Plus size={18} strokeWidth={3} /> Nuevo Cliente
        </button>
      </div>

      {/* Buscador */}
      <div className="relative w-full max-w-md group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors">
          <Search size={18} />
        </div>
        <input 
          className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-2xl text-sm font-medium text-slate-700 placeholder-slate-400 transition-all outline-none shadow-sm" 
          placeholder="Buscar por nombre, teléfono o email..." 
          value={busqueda} 
          onChange={(e) => setBusqueda(e.target.value)} 
        />
      </div>

      {/* Lista de Clientes (Grilla Interactiva) */}
      <div>
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin text-brand-500 mb-4" size={32} />
            <p className="font-medium animate-pulse">Cargando directorio...</p>
          </div>
        ) : clientes.length === 0 ? (
          <EmptyState icon={UserCircle} title="No hay clientes registrados" description="Ingresa tu primer cliente para poder asociarlo a dispositivos y órdenes de servicio." />
        ) : (
          <div className="space-y-4">
            
            {/* Cabecera visual (Solo Desktop) */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <div className="col-span-4">Identificación del Cliente</div>
              <div className="col-span-4">Información de Contacto</div>
              <div className="col-span-3">Dirección Registrada</div>
              <div className="col-span-1 text-right pr-4">Acciones</div>
            </div>

            {/* Filas/Cards de Clientes */}
            {clientes.map((c) => (
              <div key={c.id} className="group flex flex-col lg:grid lg:grid-cols-12 gap-4 items-start lg:items-center bg-white/90 backdrop-blur-xl border border-slate-100 p-5 rounded-3xl shadow-[0_4px_15px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-brand-200 transition-all duration-300">
                
                {/* Columna: Nombre y Avatar */}
                <div className="col-span-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-brand-600 font-bold flex items-center justify-center shadow-inner group-hover:from-brand-50 group-hover:to-brand-100 transition-colors shrink-0">
                    {getIniciales(c.nombre).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{c.nombre}</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Cliente Registrado</p>
                  </div>
                </div>

                {/* Columna: Contacto */}
                <div className="col-span-4 space-y-1.5 w-full">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} className="text-slate-400 group-hover:text-brand-500 transition-colors" />
                    <span className="text-sm font-medium font-mono">{c.telefono || 'Sin teléfono'}</span>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail size={14} className="text-slate-400 group-hover:text-brand-500 transition-colors" />
                      <span className="text-xs">{c.email}</span>
                    </div>
                  )}
                </div>

                {/* Columna: Dirección */}
                <div className="col-span-3 w-full">
                  <div className="flex items-start gap-2 text-slate-500">
                    <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0 group-hover:text-brand-500 transition-colors" />
                    <span className="text-xs leading-relaxed">{c.direccion || 'Sin dirección registrada'}</span>
                  </div>
                </div>

                {/* Columna: Acciones */}
                <div className="col-span-1 flex items-center justify-end w-full lg:w-auto gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => abrirEditar(c)} title="Editar información" className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => eliminar(c)} title="Eliminar cliente" className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Premium para Clientes */}
      <Modal open={modalAbierto} onClose={() => setModalAbierto(false)} title={editando ? 'Actualizar Ficha de Cliente' : 'Registro de Nuevo Cliente'}>
        <form onSubmit={guardar} className="space-y-5 mt-2">
          
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Nombre Completo</label>
              <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Javiera Muñoz" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Phone size={14}/> Teléfono Móvil</label>
                <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none font-mono" required value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+56 9 1234 5678" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Mail size={14}/> Correo Electrónico</label>
                <input type="email" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="cliente@correo.com" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><MapPin size={14}/> Dirección (Opcional)</label>
            <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Av. Providencia 1234, Santiago" />
          </div>

          {error && <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setModalAbierto(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md transition-all disabled:opacity-50">
              {guardando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {editando ? 'Actualizar Datos' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}