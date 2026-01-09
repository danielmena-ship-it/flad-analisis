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
    stats.montos[status] += req.total_linea; // Monto real a pagar con todos los recargos
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

/**
 * Calcula rango de fechas para atajos comunes
 */
export function calcularRangoAtajo(tipo: 'mes' | '30dias' | 'trimestre'): { desde: string; hasta: string } {
  const hoy = new Date();
  let desde = new Date();
  
  if (tipo === 'mes') {
    desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  } else if (tipo === '30dias') {
    desde.setDate(hoy.getDate() - 30);
  } else if (tipo === 'trimestre') {
    const trimestre = Math.floor(hoy.getMonth() / 3);
    desde = new Date(hoy.getFullYear(), trimestre * 3, 1);
  }
  
  return {
    desde: desde.toISOString().split('T')[0],
    hasta: hoy.toISOString().split('T')[0]
  };
}

/**
 * Genera texto descriptivo del rango activo
 */
export function generarTextoRango(fechaDesde: string, fechaHasta: string): string {
  if (!fechaDesde && !fechaHasta) return '';
  const formatFecha = (fecha: string) => {
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };
  if (fechaDesde && fechaHasta) return `${formatFecha(fechaDesde)} - ${formatFecha(fechaHasta)}`;
  if (fechaDesde) return `Desde ${formatFecha(fechaDesde)}`;
  if (fechaHasta) return `Hasta ${formatFecha(fechaHasta)}`;
  return '';
}

/**
 * Valida si una fecha_limite está dentro del rango especificado
 */
export function validarFechaEnRango(
  fechaLimite: string | null,
  fechaDesde: string,
  fechaHasta: string
): boolean {
  if (!fechaDesde && !fechaHasta) return true;
  if (!fechaLimite) return false;
  
  const fechaLimiteDate = new Date(fechaLimite);
  fechaLimiteDate.setHours(0, 0, 0, 0);

  if (fechaDesde) {
    const desde = new Date(fechaDesde);
    desde.setHours(0, 0, 0, 0);
    if (fechaLimiteDate < desde) return false;
  }

  if (fechaHasta) {
    const hasta = new Date(fechaHasta);
    hasta.setHours(23, 59, 59, 999);
    if (fechaLimiteDate > hasta) return false;
  }

  return true;
}
