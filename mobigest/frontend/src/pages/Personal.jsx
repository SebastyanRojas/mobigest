import { useState, useEffect } from 'react';
import { 
  Users, Plus, Trash2, Coffee, CheckCircle2, Sun, UserMinus, 
  Search, Wrench, Star, Briefcase, Mail, Phone, Calendar, Eye,
  Activity, AlertCircle, Loader2, Shield
} from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';

export default function Personal() {
  const [tecnicos, setTecnicos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  // Modales
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState(null);
  
  // Formulario Nuevo Empleado (CON EL CAMPO ROL AGREGADO)
  const [nuevoTecnico, setNuevoTecnico] = useState({
    nombre: '', email: '', password: '', telefono: '', especialidad: '', rol: 'tecnico'
  });
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');

  useEffect(() => {
    cargarMeticasEnVivo();
  }, []);

  const cargarMeticasEnVivo = async () => {
    try {
      // Pedimos TODOS los usuarios del staff (tecnicos y admins)
      const [resTecnicos, resOrdenes] = await Promise.all([
        api.get('/usuarios'), // Traemos a todos
        api.get('/ordenes')
      ]);

      // Filtramos para no mostrar clientes en este panel
      const staff = resTecnicos.data.filter(u => u.rol === 'tecnico' || u.rol === 'admin');
      const todasLasOrdenes = resOrdenes.data;

      const personalConMétricas = staff.map(empleado => {
        const susOrdenes = todasLasOrdenes.filter(o => o.usuarioId === empleado.id);
        const activas = susOrdenes.filter(o => !['entregado', 'no_reparable', 'recibido'].includes(o.estado));
        const finalizadas = susOrdenes.filter(o => ['entregado', 'no_reparable'].includes(o.estado));
        const clientesUnicos = new Set(susOrdenes.map(o => o.clienteId)).size;

        const ordenesConRating = finalizadas.filter(o => o.calificacion > 0);
        const ratingPromedio = ordenesConRating.length 
          ? (ordenesConRating.reduce((acc, o) => acc + o.calificacion, 0) / ordenesConRating.length).toFixed(1)
          : 5.0;

        let estadoOperativo = 'disponible';
        if (empleado.rol === 'admin') estadoOperativo = 'admin'; // Estado especial para admins
        else if (activas.length >= 4) estadoOperativo = 'saturado';
        else if (activas.length > 0) estadoOperativo = 'trabajando';

        return {
          ...empleado,
          fechaIngreso: empleado.createdAt ? new Date(empleado.createdAt).toLocaleDateString('es-CL') : 'Desconocida',
          especialidad: empleado.rol === 'admin' ? 'Gestión y Administración' : (empleado.especialidad || 'Técnico General'),
          telefono: empleado.telefono || 'No registrado',
          reparacionesHistoricas: finalizadas.length,
          clientesAtendidos: clientesUnicos,
          rating: ratingPromedio,
          cargaActual: activas.length,
          estado: estadoOperativo
        };
      });

      setTecnicos(personalConMétricas);
    } catch (error) {
      console.error("Error al cargar las métricas de RRHH:", error);
    } finally {
      setCargando(false);
    }
  };

  const tecnicosFiltrados = tecnicos.filter(t => 
    t.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (t.especialidad && t.especialidad.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const renderEstado = (estado) => {
    switch(estado) {
      case 'admin': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Shield size={14}/> Administrador</span>;
      case 'disponible': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><CheckCircle2 size={14}/> Disponible</span>;
      case 'trabajando': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Activity size={14}/> En Reparación</span>;
      case 'saturado': return <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><AlertCircle size={14}/> Saturado (Alto Flujo)</span>;
      default: return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><UserMinus size={14}/> Desconectado</span>;
    }
  };

  const registrarNuevoTecnico = async (e) => {
    e.preventDefault();
    setCreando(true);
    setErrorCrear('');
    try {
      await api.post('/auth/registro', {
        nombre: nuevoTecnico.nombre,
        email: nuevoTecnico.email,
        password: nuevoTecnico.password,
        telefono: nuevoTecnico.telefono,
        rol: nuevoTecnico.rol, // AHORA ENVIAMOS EL ROL DEL SELECTOR
        especialidad: nuevoTecnico.rol === 'admin' ? null : nuevoTecnico.especialidad
      });
      await cargarMeticasEnVivo();
      setModalNuevo(false);
      setNuevoTecnico({ nombre: '', email: '', password: '', telefono: '', especialidad: '', rol: 'tecnico' });
    } catch (err) {
      setErrorCrear(err.response?.data?.error || 'Error de validación. Revisa los permisos de rol en tu backend.');
    } finally {
      setCreando(false);
    }
  };

  const eliminarTecnico = async (id, nombre) => {
    if(confirm(`¿Dar de baja a ${nombre}? Se mantendrá su historial de reparaciones por motivos de auditoría.`)) {
      try {
        await api.delete(`/usuarios/${id}`);
        await cargarMeticasEnVivo();
      } catch (error) {
        alert("Error al eliminar. Es posible que tenga órdenes activas asociadas.");
      }
    }
  };

  const abrirExpediente = (tecnico) => {
    setTecnicoSeleccionado(tecnico);
    setModalDetalle(true);
  };

  if (cargando) {
    return <div className="flex flex-col items-center justify-center py-24 text-slate-400"><Loader2 className="animate-spin mb-4 text-brand-500" size={40} /><p className="font-bold animate-pulse">Analizando métricas de personal...</p></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in mt-4">
      
      {/* HEADER CORPORATIVO */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
          <Users size={180} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight">Recursos Humanos</h1>
          <p className="text-slate-300 text-sm mt-1 font-medium">Gestión de personal técnico, cargas de trabajo y trazabilidad.</p>
        </div>
        <div className="relative z-10">
          <button onClick={() => setModalNuevo(true)} className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-6 rounded-xl shadow-md shadow-brand-500/30 transition-all hover:-translate-y-0.5 flex items-center gap-2">
            <Plus size={18} /> Contratar Personal
          </button>
        </div>
      </div>

      {/* MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center"><Users size={20}/></div>
          <div><p className="text-2xl font-black text-slate-800">{tecnicos.length}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plantilla Total</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><CheckCircle2 size={20}/></div>
          <div><p className="text-2xl font-black text-slate-800">{tecnicos.filter(t => t.estado === 'disponible').length}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disponibles</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Activity size={20}/></div>
          <div><p className="text-2xl font-black text-slate-800">{tecnicos.filter(t => t.estado === 'trabajando').length}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trabajando</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center"><AlertCircle size={20}/></div>
          <div><p className="text-2xl font-black text-slate-800">{tecnicos.filter(t => t.estado === 'saturado').length}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saturados</p></div>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre o especialidad..." 
          className="flex-1 bg-transparent text-sm font-medium outline-none text-slate-700"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* GRILLA DE PERSONAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tecnicosFiltrados.map(tecnico => (
          <div key={tecnico.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
            <div className="p-6 flex-grow">
              <div className="flex justify-between items-start mb-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-black shadow-inner">
                  {tecnico.nombre.charAt(0)}
                </div>
                {renderEstado(tecnico.estado)}
              </div>
              
              <h3 className="text-lg font-black text-slate-800">{tecnico.nombre}</h3>
              <p className="text-sm font-medium text-brand-600 mb-4 line-clamp-1">{tecnico.especialidad}</p>
              
              {/* ALERTA DE CARGA DE TRABAJO (Solo técnicos) */}
              {tecnico.rol === 'tecnico' && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Equipos en Mesa:</span>
                  <span className={`font-black ${tecnico.cargaActual >= 4 ? 'text-rose-600' : tecnico.cargaActual > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                    {tecnico.cargaActual} activos
                  </span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Histórico</p>
                  <p className="text-lg font-black text-slate-700">{tecnico.reparacionesHistoricas} <span className="text-xs font-medium text-slate-400">órdenes</span></p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Rating Real</p>
                  <p className="text-lg font-black text-amber-500 flex items-center gap-1">{tecnico.rating} <Star size={14} className="fill-amber-500"/></p>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 border-t border-slate-100 p-3 flex gap-2">
              <button onClick={() => abrirExpediente(tecnico)} className="flex-1 bg-white border border-slate-200 hover:border-brand-300 hover:text-brand-600 text-slate-600 text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                <Eye size={14} /> Ficha Técnica
              </button>
              <button onClick={() => eliminarTecnico(tecnico.id, tecnico.nombre)} className="px-3 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-500 rounded-xl transition-colors shadow-sm" title="Dar de baja">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {tecnicosFiltrados.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 font-medium">No se encontró personal en la base de datos.</p>
        </div>
      )}

      {/* MODAL NUEVO EMPLEADO (CON LISTA DESPLEGABLE) */}
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Registrar Cuenta de Personal">
        <form onSubmit={registrarNuevoTecnico} className="space-y-4 mt-2">
          {errorCrear && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm font-bold flex items-center gap-2">
              <AlertCircle size={16} /> {errorCrear}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Rol en el Sistema</label>
            <select 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-bold outline-none cursor-pointer text-slate-700"
              value={nuevoTecnico.rol}
              onChange={(e) => setNuevoTecnico({ ...nuevoTecnico, rol: e.target.value })}
            >
              <option value="tecnico">Técnico Reparador</option>
              <option value="admin">Administrador (Acceso Total)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Nombre completo</label>
            <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm outline-none" required value={nuevoTecnico.nombre} onChange={(e) => setNuevoTecnico({ ...nuevoTecnico, nombre: e.target.value })} placeholder="Ej: Camila Rojas" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Email de Acceso</label>
              <input type="email" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm outline-none" required value={nuevoTecnico.email} onChange={(e) => setNuevoTecnico({ ...nuevoTecnico, email: e.target.value })} placeholder="nombre@mobigest.cl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Contraseña Temporal</label>
              <input type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm outline-none" required minLength={6} value={nuevoTecnico.password} onChange={(e) => setNuevoTecnico({ ...nuevoTecnico, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Teléfono Corporativo</label>
              <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-mono outline-none" required value={nuevoTecnico.telefono} onChange={(e) => setNuevoTecnico({ ...nuevoTecnico, telefono: e.target.value })} placeholder="+56 9..." />
            </div>
            
            {/* Ocultamos la especialidad si es Administrador */}
            <div className={`transition-opacity duration-300 ${nuevoTecnico.rol === 'admin' ? 'opacity-30 pointer-events-none' : ''}`}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Especialidad Operativa</label>
              <input 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm outline-none" 
                value={nuevoTecnico.especialidad} 
                onChange={(e) => setNuevoTecnico({ ...nuevoTecnico, especialidad: e.target.value })} 
                placeholder={nuevoTecnico.rol === 'admin' ? 'No aplica para Admin' : 'Ej: Microelectrónica'} 
                disabled={nuevoTecnico.rol === 'admin'}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setModalNuevo(false)} className="px-4 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={creando} className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md disabled:opacity-50">
              {creando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Generar Credenciales
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EXPEDIENTE DETALLADO */}
      <Modal open={modalDetalle} onClose={() => setModalDetalle(false)} title="Expediente del Colaborador">
        {tecnicoSeleccionado && (
          <div className="space-y-6 mt-2">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="h-16 w-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-2xl font-black shadow-inner shrink-0">
                {tecnicoSeleccionado.nombre.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">{tecnicoSeleccionado.nombre}</h2>
                <p className="text-sm font-bold text-brand-600">{tecnicoSeleccionado.especialidad}</p>
                <div className="mt-2">{renderEstado(tecnicoSeleccionado.estado)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Mail className="text-slate-400 mt-0.5" size={16} />
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email (Acceso)</p><p className="text-sm font-medium text-slate-700">{tecnicoSeleccionado.email}</p></div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="text-slate-400 mt-0.5" size={16} />
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contacto</p><p className="text-sm font-medium text-slate-700">{tecnicoSeleccionado.telefono}</p></div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="text-slate-400 mt-0.5" size={16} />
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha Ingreso</p><p className="text-sm font-medium text-slate-700">{tecnicoSeleccionado.fechaIngreso}</p></div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Rendimiento Histórico y Métricas</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <Wrench className="mx-auto text-brand-500 mb-1" size={16} />
                  <p className="text-xl font-black text-slate-800">{tecnicoSeleccionado.reparacionesHistoricas}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Procesos Exitosos</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <Users className="mx-auto text-emerald-500 mb-1" size={16} />
                  <p className="text-xl font-black text-slate-800">{tecnicoSeleccionado.clientesAtendidos}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Clientes Únicos</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <Star className="mx-auto text-amber-500 mb-1" size={16} />
                  <p className="text-xl font-black text-slate-800">{tecnicoSeleccionado.rating}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Calidad Cliente</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}