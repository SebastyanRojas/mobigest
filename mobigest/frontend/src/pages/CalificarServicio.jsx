// src/pages/CalificarServicio.jsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, CheckCircle2, MessageSquare, Loader2 } from 'lucide-react';
import api from '../api/client';

export default function CalificarServicio() {
  const { id } = useParams(); // Obtenemos el ID de la orden desde la URL
  const [calificacion, setCalificacion] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const enviarCalificacion = async () => {
    if (calificacion === 0) {
      setError('Por favor selecciona una cantidad de estrellas.');
      return;
    }
    
    setEnviando(true);
    setError('');
    
    try {
      await api.put(`/ordenes/${id}/calificar-publico`, {
        calificacion,
        comentario
      });
      setEnviado(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Ocurrió un error al enviar la calificación.');
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center border border-slate-100 animate-fade-in">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">¡Gracias por tu feedback!</h2>
          <p className="text-slate-500">Tu calificación nos ayuda a mejorar continuamente nuestro servicio técnico.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-800 mb-2">¿Cómo estuvo nuestro servicio?</h1>
          <p className="text-slate-500 text-sm">Evalúa el trabajo realizado por nuestro técnico.</p>
        </div>

        {/* Sistema de Estrellas */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="transition-transform hover:scale-110 focus:outline-none"
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setCalificacion(star)}
            >
              <Star 
                size={48} 
                className={`transition-colors duration-200 ${
                  star <= (hover || calificacion) 
                    ? 'fill-amber-400 text-amber-400' 
                    : 'text-slate-200 fill-transparent'
                }`} 
              />
            </button>
          ))}
        </div>

        {/* Comentario opcional */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
            <MessageSquare size={16} /> Comentario (Opcional)
          </label>
          <textarea 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none transition-all"
            rows="3"
            placeholder="¿Qué te pareció la atención y la reparación?"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-rose-500 text-sm font-bold text-center mb-4">{error}</p>
        )}

        <button 
          onClick={enviarCalificacion}
          disabled={enviando || calificacion === 0}
          className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 flex justify-center items-center gap-2"
        >
          {enviando ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Calificación'}
        </button>
      </div>
    </div>
  );
}