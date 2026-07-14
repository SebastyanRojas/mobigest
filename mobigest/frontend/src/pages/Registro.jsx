import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Lock, Mail, Phone, User, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Registro() {
  const { registro, cargando } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', telefono: '', direccion: '',
  });
  const [error, setError] = useState('');

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await registro(form);
    if (res.ok) {
      navigate('/mis-ordenes');
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-accent-500 shadow-elevated mb-4">
            <Wrench className="text-brand-900" size={26} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">MobiGest</h1>
          <p className="text-brand-200 mt-1 text-sm">Crea tu cuenta de cliente</p>
        </div>

        <div className="card p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Registro de cliente</h2>
          <p className="text-sm text-slate-500 mb-6">Sigue el estado de tus reparaciones desde tu celular.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Nombre completo</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required className="input pl-9" value={form.nombre} onChange={cambiar('nombre')} placeholder="Tu nombre" />
              </div>
            </div>
            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" required className="input pl-9" value={form.email} onChange={cambiar('email')} placeholder="correo@ejemplo.com" />
              </div>
            </div>
            <div>
              <label className="label">Teléfono</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required className="input pl-9" value={form.telefono} onChange={cambiar('telefono')} placeholder="+56 9 1234 5678" />
              </div>
            </div>
            <div>
              <label className="label">Dirección (opcional)</label>
              <input className="input" value={form.direccion} onChange={cambiar('direccion')} placeholder="Calle, número, comuna" />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" required minLength={6} className="input pl-9" value={form.password} onChange={cambiar('password')} placeholder="Mínimo 6 caracteres" />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={cargando} className="btn-primary w-full">
              {cargando ? <Loader2 size={16} className="animate-spin" /> : null}
              Crear cuenta
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            ¿Ya tienes cuenta? <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
