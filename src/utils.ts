import { Requerimiento, RequerimientoStatus, StatsData } from './types';

export function getRequerimientoStatus(req: Requerimiento): RequerimientoStatus {
  const hoy = new Date().toISOString().split('T')[0];
  
  if (req.informe_codigo !== null) return 'pagado';
  if (req.fecha_recepcion !== null && req.informe_codigo === null) return 'recibido';
  if (req.ot_codigo !== null && req.fecha_recepcion === null && req.fecha_limite < hoy) return 'atrasado';
  if (req.ot_codigo === null) return 'sin_curso';
  return 'en_curso';
}

/**
 * Calcula el monto a pagar según el estado del requerimiento
 * Solo aplica descuento de multa para estados 'recibido' y 'pagado'
 */
export function calcularMontoAPagar(req: Requerimiento): number {
  const status = getRequerimientoStatus(req);
  return (status === 'recibido' || status === 'pagado') 
    ? req.precio_total - req.multa 
    : req.precio_total;
}

/**
 * Formatea fecha ISO a formato DD/MM/YYYY
 */
export function formatearFecha(isoDate: string): string {
  const fecha = new Date(isoDate);
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

export function calculateStats(requerimientos: Requerimiento[]): StatsData {
  const stats: StatsData = {
    cantidades: {
      pagado: 0,
      recibido: 0,
      atrasado: 0,
      en_curso: 0,
      sin_curso: 0
    },
    montos: {
      pagado: 0,
      recibido: 0,
      atrasado: 0,
      en_curso: 0,
      sin_curso: 0
    }
  };

  requerimientos.forEach(req => {
    const status = getRequerimientoStatus(req);
    stats.cantidades[status]++;
    stats.montos[status] += calcularMontoAPagar(req);
  });

  return stats;
}

export const STATUS_LABELS: Record<RequerimientoStatus, string> = {
  pagado: 'Pagados',
  recibido: 'Recibidos',
  atrasado: 'Atrasados',
  en_curso: 'En Curso',
  sin_curso: 'Sin Curso'
};

export const STATUS_COLORS: Record<RequerimientoStatus, string> = {
  pagado: '#10b981',
  recibido: '#3b82f6',
  atrasado: '#ef4444',
  en_curso: '#f59e0b',
  sin_curso: '#6b7280'
};
