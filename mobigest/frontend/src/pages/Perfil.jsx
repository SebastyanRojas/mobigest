import { useEffect, useState } from 'react';
import { Loader2, Save, Smartphone, UserCircle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Perfil() {
  const { usuario } = useAuth();
  const [cliente, setCliente] = useState(null);
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '' });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    api.get('/clientes/me').then(({ data }) => {
      setCliente(data);
      setForm({ nombre: data.nombre, telefono: data.telefono, direccion: data.direccion || '' });
    }).finally(() => setCargando(false));
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true); setMensaje('');
    try {
      const { data } = await api.put('/clientes/me', form);
      setCliente((prev) => ({ ...prev, ...data }));
      setMensaje('Datos actualizados correctamente.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <div className="flex justify-center py-24 text-slate-400"><Loader2 className="animate-spin" size={28} /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><UserCircle className="text-brand-600" /> Mi Perfil</h1>
        <p className="text-slate-500 text-sm mt-0.5">Actualiza tus datos de contacto y revisa tus equipos registrados.</p>
      </div>

      <form onSubmit={guardar} className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-700">Datos de contacto</h3>
        <div>
          <label className="label">Correo electrónico</label>
          <input className="input bg-slate-50" value={usuario?.email} disabled />
        </div>
        <div>
          <label className="label">Nombre completo</label>
          <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div>
          <label className="label">Teléfono</label>
          <input className="input" required value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </div>
        <div>
          <label className="label">Dirección</label>
          <input className="input" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        </div>
        {mensaje && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{mensaje}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={guardando} className="btn-primary">
            {guardando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar cambios
          </button>
        </div>
      </form>

      <div className="card p-6 space-y-3">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2"><Smartphone size={16} /> Mis equipos</h3>
        {cliente?.dispositivos?.length ? (
          <ul className="divide-y divide-slate-50">
            {cliente.dispositivos.map((d) => (
              <li key={d.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-700">{d.marca} {d.modelo}</p>
                  <p className="text-xs text-slate-400 font-mono">IMEI: {d.imei}</p>
                </div>
                <span className="text-xs text-slate-400">{d.color || '—'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">Aún no tienes equipos registrados.</p>
        )}
      </div>
    </div>
  );
}
