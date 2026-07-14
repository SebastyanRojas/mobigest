import { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../api/client';
import { formatoCLP } from '../utils/format';
import Modal from '../components/Modal'; // Asegúrate de tener este componente

export default function Repuestos() {
  const [repuestos, setRepuestos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [soloAlertas, setSoloAlertas] = useState(false);
  
  // Estados para el Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  
  // Estado del formulario (sirve para Crear y Editar)
  const [formData, setFormData] = useState({
    id: null,
    nombre: '',
    sku: '',
    precioUnitario: '',
    stockActual: '',
    stockMinimo: 2,
    proveedor: ''
  });

  // 1. CARGAR DATOS REALES DE LA BASE DE DATOS
  useEffect(() => {
    cargarRepuestos();
  }, []);

  const cargarRepuestos = async () => {
    try {
      const { data } = await api.get('/repuestos');
      setRepuestos(data);
    } catch (err) {
      console.error("Error al cargar repuestos:", err);
    } finally {
      setCargando(false);
    }
  };

  // 2. FILTROS EN TIEMPO REAL
  const repuestosFiltrados = repuestos.filter(r => {
    const coincideBusqueda = r.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                             (r.sku && r.sku.toLowerCase().includes(busqueda.toLowerCase()));
    
    // Si el toggle está activo, solo mostramos los que tienen stock crítico
    const stockMin = r.stockMinimo || 2;
    const esAlerta = r.stockActual <= stockMin;
    
    if (soloAlertas) return coincideBusqueda && esAlerta;
    return coincideBusqueda;
  });

  // 3. GESTIÓN DEL MODAL
  const abrirModalCrear = () => {
    setFormData({ id: null, nombre: '', sku: '', precioUnitario: '', stockActual: '', stockMinimo: 2, proveedor: '' });
    setError('');
    setModalAbierto(true);
  };

  const abrirModalEditar = (repuesto) => {
    setFormData({
      id: repuesto.id,
      nombre: repuesto.nombre,
      sku: repuesto.sku || '',
      precioUnitario: repuesto.precioUnitario || repuesto.precio || 0,
      stockActual: repuesto.stockActual || repuesto.stock || 0,
      stockMinimo: repuesto.stockMinimo || 2,
      proveedor: repuesto.proveedor || ''
    });
    setError('');
    setModalAbierto(true);
  };

  // 4. GUARDAR O ACTUALIZAR EN BASE DE DATOS
  const guardarRepuesto = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');

    const payload = {
      ...formData,
      precioUnitario: Number(formData.precioUnitario),
      stockActual: Number(formData.stockActual),
      stockMinimo: Number(formData.stockMinimo)
    };

    try {
      if (formData.id) {
        // Actualizar existente
        await api.put(`/repuestos/${formData.id}`, payload);
      } else {
        // Crear nuevo
        await api.post('/repuestos', payload);
      }
      await cargarRepuestos();
      setModalAbierto(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Ocurrió un error al guardar el repuesto.');
    } finally {
      setGuardando(false);
    }
  };

  // 5. ELIMINAR
  const eliminarRepuesto = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este repuesto?')) return;
    try {
      await api.delete(`/repuestos/${id}`);
      await cargarRepuestos();
    } catch (err) {
      alert('Error al eliminar. Es posible que este repuesto ya esté vinculado a una orden.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in mt-4">
      
      {/* HEADER IDÉNTICO AL MOCKUP */}
      <div className="bg-slate-900 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg text-white">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventario de Repuestos</h1>
            <p className="text-slate-400 text-sm mt-0.5">Control de stock, valoración y alertas de abastecimiento.</p>
          </div>
        </div>
        <button onClick={abrirModalCrear} className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md">
          <Plus size={18} /> Nuevo Material
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA Y TOGGLE */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-1/2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por descripción o código SKU..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <span className="text-sm font-bold text-slate-600">Alertas de Stock</span>
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={soloAlertas} onChange={() => setSoloAlertas(!soloAlertas)} />
            <div className={`block w-10 h-6 rounded-full transition-colors ${soloAlertas ? 'bg-rose-500' : 'bg-slate-200'}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${soloAlertas ? 'translate-x-4' : ''}`}></div>
          </div>
        </label>
      </div>

      {/* TABLA DE INVENTARIO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-400 uppercase tracking-wider">
                <th className="p-4">Detalle del Repuesto</th>
                <th className="p-4">Precio Costo</th>
                <th className="p-4">Disponibilidad</th>
                <th className="p-4 hidden md:table-cell">Proveedor</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-slate-400">
                    <Loader2 size={32} className="animate-spin mx-auto mb-2 text-blue-500" />
                    Cargando inventario...
                  </td>
                </tr>
              ) : repuestosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-slate-400 font-medium">
                    No se encontraron repuestos.
                  </td>
                </tr>
              ) : (
                repuestosFiltrados.map((repuesto) => {
                  const stockMin = repuesto.stockMinimo || 2;
                  const enAlerta = repuesto.stockActual <= stockMin;

                  return (
                    <tr key={repuesto.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                            <Package size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{repuesto.nombre}</p>
                            <p className="text-xs font-mono text-slate-400 mt-0.5">{repuesto.sku || 'SIN-SKU'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-700">
                        {formatoCLP(repuesto.precioUnitario || repuesto.precio || 0)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${enAlerta ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {enAlerta && <AlertTriangle size={12} />}
                            {repuesto.stockActual || 0} unid.
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">Min. {stockMin}</span>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell text-sm text-slate-500 font-medium">
                        {repuesto.proveedor || 'No registrado'}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => abrirModalEditar(repuesto)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => eliminarRepuesto(repuesto.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR */}
      <Modal open={modalAbierto} onClose={() => setModalAbierto(false)} title={formData.id ? "Editar Repuesto" : "Nuevo Repuesto"}>
        <form onSubmit={guardarRepuesto} className="space-y-4 mt-2">
          {error && <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm font-bold">{error}</div>}
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre del Material</label>
            <input required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Pantalla iPhone 13 Pro" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">SKU / Código</label>
              <input className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-sm" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} placeholder="Ej: PNT-IP13-01" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Precio Costo ($)</label>
              <input type="number" required min="0" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" value={formData.precioUnitario} onChange={(e) => setFormData({...formData, precioUnitario: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Stock Inicial</label>
              <input type="number" required min="0" className="w-full px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl outline-none font-bold" value={formData.stockActual} onChange={(e) => setFormData({...formData, stockActual: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Stock Mínimo (Alerta)</label>
              <input type="number" required min="1" className="w-full px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl outline-none font-bold" value={formData.stockMinimo} onChange={(e) => setFormData({...formData, stockMinimo: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Proveedor (Opcional)</label>
            <input className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.proveedor} onChange={(e) => setFormData({...formData, proveedor: e.target.value})} placeholder="Ej: ImportCell SpA" />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setModalAbierto(false)} className="px-4 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={guardando} className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md disabled:opacity-50">
              {guardando ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />} 
              {guardando ? 'Guardando...' : 'Guardar Repuesto'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}