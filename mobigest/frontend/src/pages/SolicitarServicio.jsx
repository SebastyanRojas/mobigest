import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Smartphone, CalendarDays, Clock, MapPin, AlertCircle, ShieldCheck } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';

const esImeiValido = (imei) => {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(imei.charAt(i));
    if (i % 2 !== 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};

// ✅ AQUÍ ESTÁ EL CAMBIO: Horarios cada 30 minutos desde las 09:00 hasta las 18:00
const HORARIOS_DISPONIBLES = [
  '09:00', '09:30', 
  '10:00', '10:30', 
  '11:00', '11:30', 
  '12:00', '12:30', 
  '13:00', '13:30', 
  '14:00', '14:30', 
  '15:00', '15:30', 
  '16:00', '16:30', 
  '17:00', '17:30', 
  '18:00'
];

export default function SolicitarServicio() {
  const navigate = useNavigate();
  
  const [dispositivos, setDispositivos] = useState([]);
  const [cargandoDispositivos, setCargandoDispositivos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [dispositivoId, setDispositivoId] = useState('');
  const [fechaReserva, setFechaReserva] = useState('');
  const [horaReserva, setHoraReserva] = useState('');
  const [motivoVisita, setMotivoVisita] = useState('');

  const [modalDispositivo, setModalDispositivo] = useState(false);
  const [nuevoDispositivo, setNuevoDispositivo] = useState({ imei: '', marca: '', modelo: '', color: '' });
  const [errorDispositivo, setErrorDispositivo] = useState('');

  const hoy = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Al no consultar las órdenes previas, múltiples clientes pueden reservar la misma hora
    api.get('/dispositivos')
      .then((resDisp) => {
        setDispositivos(resDisp.data);
      })
      .finally(() => setCargandoDispositivos(false));
  }, []);

  const crearDispositivo = async (e) => {
    e.preventDefault();
    setErrorDispositivo('');
    
    if (!esImeiValido(nuevoDispositivo.imei)) {
      setErrorDispositivo('IMEI Inválido: La suma de verificación no coincide (Algoritmo de Luhn).');
      return;
    }

    try {
      const { data } = await api.post('/dispositivos', nuevoDispositivo);
      setDispositivos((prev) => [...prev, data]);
      setDispositivoId(data.id);
      setModalDispositivo(false);
      setNuevoDispositivo({ imei: '', marca: '', modelo: '', color: '' });
    } catch (err) {
      setErrorDispositivo(err.response?.data?.error || 'No se pudo registrar el equipo.');
    }
  };

  const confirmarCita = async (e) => {
    e.preventDefault();
    if (!dispositivoId || !fechaReserva || !horaReserva || !motivoVisita) {
      setError('Por favor, completa todos los pasos para anunciar tu visita.');
      return;
    }

    setGuardando(true); 
    setError('');

    // Cambiamos el tag interno de CITA PRESENCIAL a VISITA
    const fallaFormateada = `[VISITA: ${horaReserva} hrs] - Motivo: ${motivoVisita}`;

    try {
      const { data } = await api.post('/ordenes', {
        dispositivoId,
        fallaReportada: fallaFormateada, 
        fechaCompromiso: fechaReserva,
      });
      navigate(`/mis-ordenes/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Ocurrió un error al agendar tu visita.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10 animate-fade-in mt-4">
      
      <button onClick={() => navigate('/mis-ordenes')} className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-max">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver al panel
      </button>

      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 md:p-10 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
          <CalendarDays size={200} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight">Anunciar Visita al Taller</h1>
          <p className="text-slate-300 mt-2 font-medium max-w-lg">
            Avísanos cuándo traerás tu equipo para esperarte y brindarte una evaluación rápida y sin filas.
          </p>
        </div>
      </div>

      <form onSubmit={confirmarCita} className="space-y-6">
        
        {/* PASO 1 */}
        <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <div className="h-8 w-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 font-black">1</div>
            <h3 className="font-bold text-lg text-slate-800">¿Qué equipo traerás?</h3>
          </div>

          {cargandoDispositivos ? (
            <div className="flex items-center gap-2 text-sm text-brand-600 font-bold bg-brand-50 p-4 rounded-xl w-max"><Loader2 size={16} className="animate-spin" /> Cargando tus equipos...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dispositivos.map((d) => (
                <div 
                  key={d.id} 
                  onClick={() => setDispositivoId(d.id)}
                  className={`cursor-pointer border-2 rounded-2xl p-4 transition-all duration-200 flex items-center gap-4 ${dispositivoId === d.id ? 'border-brand-500 bg-brand-50 shadow-md' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'}`}
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${dispositivoId === d.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <p className={`font-bold ${dispositivoId === d.id ? 'text-brand-700' : 'text-slate-800'}`}>{d.marca} {d.modelo}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">IMEI: {d.imei}</p>
                  </div>
                </div>
              ))}
              <div 
                onClick={() => setModalDispositivo(true)}
                className="cursor-pointer border-2 border-dashed border-slate-300 rounded-2xl p-4 flex flex-col items-center justify-center text-slate-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all min-h-[90px]"
              >
                <Plus size={24} className="mb-1" />
                <span className="text-xs font-bold uppercase tracking-wide">Registrar otro equipo</span>
              </div>
            </div>
          )}
        </section>

        {/* PASO 2 */}
        <section className={`bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 transition-opacity duration-300 ${!dispositivoId ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-black">2</div>
            <h3 className="font-bold text-lg text-slate-800">Fecha y hora estimada</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Día de visita</label>
              <div className="relative">
                <CalendarDays size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input 
                  type="date" 
                  min={hoy}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-bold outline-none text-slate-700 transition-all" 
                  required 
                  value={fechaReserva} 
                  onChange={(e) => { setFechaReserva(e.target.value); setHoraReserva(''); }} 
                />
              </div>
            </div>

            <div className={`${!fechaReserva ? 'opacity-30 pointer-events-none' : ''}`}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Horarios de atención</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {HORARIOS_DISPONIBLES.map((hora) => (
                  <button
                    key={hora}
                    type="button"
                    onClick={() => setHoraReserva(hora)}
                    className={`py-2 px-1 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${horaReserva === hora ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600'}`}
                  >
                    <Clock size={14} className={horaReserva === hora ? 'text-white' : 'text-slate-400'} />
                    {hora}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PASO 3 */}
        <section className={`bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 transition-opacity duration-300 ${!horaReserva ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 font-black">3</div>
            <h3 className="font-bold text-lg text-slate-800">Motivo de la visita</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Cuéntanos brevemente qué revisaremos</label>
            <textarea 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium outline-none transition-all resize-none" 
              rows={3} 
              required 
              value={motivoVisita} 
              onChange={(e) => setMotivoVisita(e.target.value)} 
              placeholder="Ej: Quiero cotizar el cambio de la pantalla porque se astilló en la esquina..." 
            />
          </div>
        </section>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold animate-shake">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button 
            type="submit" 
            disabled={guardando || !dispositivoId || !fechaReserva || !horaReserva || !motivoVisita} 
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-black text-white text-sm uppercase tracking-wide bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {guardando ? <Loader2 size={18} className="animate-spin" /> : <CalendarDays size={18} />} 
            Confirmar Visita
          </button>
        </div>
      </form>

      {/* MODAL NUEVO DISPOSITIVO */}
      <Modal open={modalDispositivo} onClose={() => setModalDispositivo(false)} title="Registrar Equipo Nuevo">
        <form onSubmit={crearDispositivo} className="space-y-4 mt-2">
          {errorDispositivo && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" /> <p>{errorDispositivo}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">IMEI (Algoritmo de Validación Activo)</label>
            <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-mono font-bold text-brand-700 outline-none" required minLength={14} maxLength={15} value={nuevoDispositivo.imei} onChange={(e) => setNuevoDispositivo({ ...nuevoDispositivo, imei: e.target.value.replace(/\D/g, '') })} placeholder="Ingresa los 15 dígitos" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Marca</label>
              <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm outline-none" required value={nuevoDispositivo.marca} onChange={(e) => setNuevoDispositivo({ ...nuevoDispositivo, marca: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Modelo</label>
              <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm outline-none" required value={nuevoDispositivo.modelo} onChange={(e) => setNuevoDispositivo({ ...nuevoDispositivo, modelo: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setModalDispositivo(false)} className="px-4 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
            <button type="submit" className="px-6 py-2 rounded-lg font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md">Validar y Registrar</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}