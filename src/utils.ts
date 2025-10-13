import { Requerimiento, RequerimientoStatus, StatsData } from './types';

export function getRequerimientoStatus(req: Requerimiento): RequerimientoStatus {
  const hoy = new Date().toISOString().split('T')[0];
  
  if (req.informe_pago_id !== null) return 'pagado';
  if (req.fecha_recepcion !== null && req.informe_pago_id === null) return 'recibido';
  if (req.ot_id !== null && req.fecha_recepcion === null && req.fecha_limite < hoy) return 'atrasado';
  if (req.ot_id === null) return 'sin_curso';
  return 'en_curso';
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
    // Si tiene a_pago (requerimientos recibidos), usar a_pago, sino usar precio_total
    const valor = req.a_pago ? req.a_pago : req.precio_total;
    stats.montos[status] += valor;
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
