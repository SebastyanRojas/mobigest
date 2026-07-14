import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const stored = localStorage.getItem('mobigest_usuario');
    return stored ? JSON.parse(stored) : null;
  });
  const [cargando, setCargando] = useState(false);

  const login = useCallback(async (email, password) => {
    setCargando(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('mobigest_token', data.token);
      localStorage.setItem('mobigest_usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
      return { ok: true, usuario: data.usuario };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || 'No se pudo iniciar sesión.' };
    } finally {
      setCargando(false);
    }
  }, []);

  const registro = useCallback(async (datos) => {
    setCargando(true);
    try {
      const { data } = await api.post('/auth/registro', datos);
      localStorage.setItem('mobigest_token', data.token);
      localStorage.setItem('mobigest_usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
      return { ok: true, usuario: data.usuario };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || 'No se pudo crear la cuenta.' };
    } finally {
      setCargando(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('mobigest_token');
    localStorage.removeItem('mobigest_usuario');
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        login,
        registro,
        logout,
        cargando,
        esAdmin: usuario?.rol === 'admin',
        esTecnico: usuario?.rol === 'tecnico',
        esCliente: usuario?.rol === 'cliente',
        esPersonal: usuario?.rol === 'admin' || usuario?.rol === 'tecnico',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
