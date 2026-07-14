import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Smartphone, Wrench, Package, LogOut, Menu, X, 
  ClipboardList, PlusCircle, UserCircle, Activity, Inbox
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const NAV_CLIENTE = [
  { to: '/mis-ordenes', label: 'Mis Órdenes', icon: ClipboardList },
  { to: '/solicitar', label: 'Solicitar Servicio', icon: PlusCircle },
  { to: '/tracking', label: 'Seguimiento', icon: Activity },
  { to: '/perfil', label: 'Mi Perfil', icon: UserCircle },
];

export default function AppLayout() {
  const { usuario, logout, esCliente } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // ==========================================
  // LÓGICA DINÁMICA DEL MENÚ LATERAL
  // ==========================================
  let navItems = [];

  if (esCliente) {
    navItems = NAV_CLIENTE;
  } else if (usuario?.rol === 'tecnico') {
    // Si es TÉCNICO, su primera opción es la Bandeja. No ve el Dashboard gerencial.
    navItems = [
      { to: '/diagnostico', label: 'Bandeja de Evaluaciones', icon: Inbox },
      { to: '/ordenes', label: 'Órdenes de Servicio', icon: Wrench },
      { to: '/clientes', label: 'Clientes', icon: Users },
      { to: '/dispositivos', label: 'Dispositivos', icon: Smartphone },
      { to: '/repuestos', label: 'Repuestos', icon: Package },
      { to: '/tracking', label: 'Seguimiento en Vivo', icon: Activity },
    ];
  } else {
    // Si es ADMIN, ve el Dashboard, la Bandeja de los técnicos y el menú de Personal.
    navItems = [
      { to: '/', label: 'Panel Ejecutivo', icon: LayoutDashboard },
      { to: '/diagnostico', label: 'Bandeja Técnica', icon: Inbox },
      { to: '/ordenes', label: 'Gestión de Órdenes', icon: Wrench },
      { to: '/clientes', label: 'Clientes', icon: Users },
      { to: '/dispositivos', label: 'Dispositivos', icon: Smartphone },
      { to: '/repuestos', label: 'Inventario Físico', icon: Package },
      { to: '/tracking', label: 'Seguimiento en Vivo', icon: Activity },
      { to: '/personal', label: 'Personal Técnico', icon: Users },
    ];
  }

  const cerrarSesion = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 text-white shrink-0 shadow-2xl relative z-20">
        <SidebarContent usuario={usuario} onLogout={cerrarSesion} navItems={navItems} />
      </aside>

      {/* Sidebar mobile */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setMenuAbierto(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col shadow-2xl transform transition-transform duration-300">
            <SidebarContent usuario={usuario} onLogout={cerrarSesion} navItems={navItems} onNavigate={() => setMenuAbierto(false)} isMobile onMenuToggle={() => setMenuAbierto(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 h-16 lg:justify-end lg:px-6 shadow-sm relative z-10">
          <button onClick={() => setMenuAbierto(true)} className="p-2.5 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors lg:hidden">
            <Menu size={22} />
          </button>
          
          <div className="flex items-center gap-2 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-white shadow-inner">M</div>
            <span className="font-extrabold text-slate-800 tracking-tight">MobiGest</span>
          </div>
          
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ usuario, onLogout, onNavigate, navItems, isMobile, onMenuToggle }) {
  return (
    <>
      <div className="flex items-center justify-between px-6 h-16 border-b border-white/10 shrink-0 bg-slate-950/30">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-bold text-white shadow-lg shadow-brand-500/30">M</div>
          <div>
            <p className="font-extrabold text-white tracking-tight leading-tight">MobiGest</p>
            <p className="text-[10px] text-brand-300 uppercase tracking-widest font-semibold leading-tight">Pro Edition</p>
          </div>
        </div>
        {isMobile && (
          <button onClick={onMenuToggle} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            end={item.to === '/' || item.to === '/mis-ordenes' || item.to === '/diagnostico'}
            className={({ isActive }) => {
              const isTracking = item.to === '/tracking';
              return `group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                isActive 
                  ? 'bg-brand-500/10 text-brand-400' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              } ${isTracking && !isActive ? 'hover:bg-emerald-500/10 hover:text-emerald-400' : ''}`
            }}
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-brand-500 rounded-r-full" />}
                <item.icon size={18} className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                {item.label}
                {item.to === '/tracking' && (
                  <span className="ml-auto flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 pb-6 shrink-0">
        <div className="bg-slate-800/50 rounded-2xl p-3 mb-3 border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-700 flex items-center justify-center font-bold text-white shrink-0 shadow-inner">
              {usuario?.nombre?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{usuario?.nombre}</p>
              <p className="text-[11px] text-brand-300 uppercase tracking-wider font-semibold">{usuario?.rol}</p>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 w-full transition-colors border border-transparent hover:border-rose-500/20"
        >
          <LogOut size={16} strokeWidth={2.5} />
          Cerrar sesión
        </button>
      </div>
    </>
  );
}