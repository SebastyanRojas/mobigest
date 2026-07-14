import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Dispositivos from './pages/Dispositivos';
import Repuestos from './pages/Repuestos';
import OrdenesList from './pages/OrdenesList';
import OrdenNueva from './pages/OrdenNueva';
import OrdenDetalle from './pages/OrdenDetalle';
import MisOrdenes from './pages/MisOrdenes';
import MiOrdenDetalle from './pages/MiOrdenDetalle';
import SolicitarServicio from './pages/SolicitarServicio';
import Perfil from './pages/Perfil';
import OrdenTecnico from './pages/OrdenTecnico';
import SeguimientoOrden from './pages/SeguimientoOrden';
import CalificarServicio from './pages/CalificarServicio';

// Importamos la nueva pantalla de Personal
import Personal from './pages/Personal';

function Home() {
  const { esCliente, usuario } = useAuth();
  
  if (esCliente) {
    return <Navigate to="/mis-ordenes" replace />;
  }

  if (usuario?.rol === 'tecnico') {
    return <Navigate to="/diagnostico" replace />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />

            {/* Portal del cliente */}
            <Route path="mis-ordenes" element={<RoleRoute roles={['cliente']}><MisOrdenes /></RoleRoute>} />
            <Route path="mis-ordenes/:id" element={<RoleRoute roles={['cliente']}><MiOrdenDetalle /></RoleRoute>} />
            <Route path="solicitar" element={<RoleRoute roles={['cliente']}><SolicitarServicio /></RoleRoute>} />
            <Route path="perfil" element={<RoleRoute roles={['cliente']}><Perfil /></RoleRoute>} />
            <Route path="/calificar/:id" element={<CalificarServicio />} />

            {/* Módulo de Seguimiento en Tiempo Real (Accesible para TODOS) */}
            <Route 
              path="tracking" 
              element={<RoleRoute roles={['admin', 'tecnico', 'cliente']}><SeguimientoOrden /></RoleRoute>} 
            />

            {/* Panel de administración / técnico */}
            <Route path="diagnostico" element={<RoleRoute roles={['admin', 'tecnico']}><OrdenTecnico /></RoleRoute>} />
            <Route path="clientes" element={<RoleRoute roles={['admin', 'tecnico']}><Clientes /></RoleRoute>} />
            <Route path="dispositivos" element={<RoleRoute roles={['admin', 'tecnico']}><Dispositivos /></RoleRoute>} />
            <Route path="repuestos" element={<RoleRoute roles={['admin', 'tecnico']}><Repuestos /></RoleRoute>} />
            <Route path="ordenes" element={<RoleRoute roles={['admin', 'tecnico']}><OrdenesList /></RoleRoute>} />
            <Route path="ordenes/nueva" element={<RoleRoute roles={['admin', 'tecnico']}><OrdenNueva /></RoleRoute>} />
            <Route path="ordenes/:id" element={<RoleRoute roles={['admin', 'tecnico']}><OrdenDetalle /></RoleRoute>} />
            
            {/* NUEVA RUTA: Gestión de Personal (SOLO ADMIN) */}
            <Route path="personal" element={<RoleRoute roles={['admin']}><Personal /></RoleRoute>} />
            
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}