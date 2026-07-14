import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Lock, Mail, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, cargando } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(email, password);
    if (res.ok) {
      navigate(res.usuario?.rol === 'cliente' ? '/mis-ordenes' : '/');
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-accent-500 shadow-elevated mb-4">
            <Wrench className="text-brand-900" size={26} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">MobiGest</h1>
          <p className="text-brand-200 mt-1 text-sm">Sistema de gestión de órdenes de servicio</p>
        </div>

        <div className="card p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Iniciar sesión</h2>
          <p className="text-sm text-slate-500 mb-6">Ingresa tus credenciales para continuar</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="correo@mobigest.cl"
                />
              </div>
            </div>
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={cargando} className="btn-primary w-full">
              {cargando ? <Loader2 size={16} className="animate-spin" /> : null}
              Ingresar
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            ¿Eres cliente y aún no tienes cuenta? <Link to="/registro" className="text-brand-600 font-semibold hover:text-brand-700">Regístrate aquí</Link>
          </p>

          <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-600">Cuentas de demostración:</p>
            <p>Administrador: admin@mobigest.cl / mobigest2026</p>
            <p>Técnico: tecnico@mobigest.cl / mobigest2026</p>
            <p>Cliente: javiera.munoz@gmail.com / mobigest2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
