import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { formatoFechaHora } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function NotificationBell() {
  const { esCliente } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const ref = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/notificaciones');
      setNotificaciones(data.notificaciones);
      setNoLeidas(data.noLeidas);
    } catch {
      // silencioso: si falla, simplemente no se muestran notificaciones
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000); // refresco cada 30s (polling simple)
    return () => clearInterval(t);
  }, [cargar]);

  useEffect(() => {
    const onClickFuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', onClickFuera);
    return () => document.removeEventListener('mousedown', onClickFuera);
  }, []);

  const marcarTodasLeidas = async () => {
    setCargando(true);
    try {
      await api.put('/notificaciones/leer-todas');
      await cargar();
    } finally {
      setCargando(false);
    }
  };

  const marcarLeida = async (id) => {
    await api.put(`/notificaciones/${id}/leer`);
    cargar();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        title="Notificaciones"
      >
        <Bell size={19} />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-elevated border border-slate-100 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white">
            <p className="font-semibold text-slate-700 text-sm">Notificaciones</p>
            {noLeidas > 0 && (
              <button onClick={marcarTodasLeidas} disabled={cargando} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                {cargando ? <Loader2 size={12} className="animate-spin" /> : 'Marcar todas'}
              </button>
            )}
          </div>
          {notificaciones.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sin notificaciones por ahora.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {notificaciones.map((n) => (
                <li key={n.id} className={`px-4 py-3 ${!n.leida ? 'bg-brand-50/40' : ''}`}>
                  <Link
                    to={n.ordenId ? (esCliente ? `/mis-ordenes/${n.ordenId}` : `/ordenes/${n.ordenId}`) : '#'}
                    onClick={() => { if (!n.leida) marcarLeida(n.id); setAbierto(false); }}
                    className="block"
                  >
                    <p className="text-sm font-medium text-slate-700">{n.titulo}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.mensaje}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{formatoFechaHora(n.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
