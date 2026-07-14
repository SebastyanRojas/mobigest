import api from '../api/client';

export async function descargarComprobante(ordenId, codigo) {
  const { data } = await api.get(`/ordenes/${ordenId}/comprobante`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `comprobante-${codigo || ordenId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
