import { DatabaseJSON, Requerimiento, RequerimientoEnriquecido } from '../types';
import { calcularMontoAPagar } from '../utils';

/**
 * Enriquece requerimientos con datos de catálogos (jardines, partidas)
 */
export function enriquecerRequerimientos(
  requerimientos: Requerimiento[],
  db: DatabaseJSON
): RequerimientoEnriquecido[] {
  const jardinMap = new Map(db.jardines.map(j => [j.codigo, j]));
  const partidaMap = new Map(db.partidas.map(p => [p.item, p]));

  return requerimientos.map(req => {
    const jardin = jardinMap.get(req.jardin_codigo);
    const partida = partidaMap.get(req.partida_item);
    
    // Calcular días de atraso
    const fechaLimite = new Date(req.fecha_limite);
    const hoy = new Date();
    const diasAtraso = Math.max(0, Math.floor((hoy.getTime() - fechaLimite.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      ...req,
      jardin_nombre: jardin?.nombre || 'Desconocido',
      partida_nombre: partida?.partida || 'Desconocida',
      partida_unidad: partida?.unidad || null,
      dias_atraso: diasAtraso,
      a_pago: calcularMontoAPagar(req)
    };
  });
}

/**
 * Valida si la BD tiene el formato nuevo (SQLite)
 */
export function esFormatoNuevo(data: any): data is DatabaseJSON {
  return (
    Array.isArray(data?.jardines) &&
    Array.isArray(data?.partidas) &&
    Array.isArray(data?.recintos) &&
    Array.isArray(data?.requerimientos) &&
    // Verificar estructura snake_case
    data.jardines[0]?.created_at !== undefined
  );
}

/**
 * Obtiene fecha de exportación (nuevo formato no tiene metadata)
 */
export function obtenerFechaExportacion(db: DatabaseJSON): string {
  // En formato nuevo, usar la fecha más reciente de created_at
  const fechas = [
    ...db.jardines.map(j => j.created_at),
    ...db.partidas.map(p => p.created_at),
    ...db.recintos.map(r => r.created_at)
  ];
  
  const fechaMasReciente = fechas.reduce((max, fecha) => 
    fecha > max ? fecha : max, 
    fechas[0] || new Date().toISOString()
  );
  
  return fechaMasReciente;
}

/**
 * Obtiene estadísticas de la BD
 */
export function obtenerEstadisticas(db: DatabaseJSON) {
  return {
    total_requerimientos: db.requerimientos.length,
    total_ordenes: db.ordenes_trabajo?.length || 0,
    total_informes: db.informes_pago?.length || 0,
    total_jardines: db.jardines.length,
    total_partidas: db.partidas.length,
    total_recintos: db.recintos.length
  };
}
