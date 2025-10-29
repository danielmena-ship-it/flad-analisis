// ===== TIPOS BASE =====
export type ContractType = 'mantencion' | 'calefaccion' | 'area_verde' | 'ascensores';
export type LineType = 'linea_1' | 'linea_2' | 'linea_3' | 'linea_4' | 'linea_5';
export type RequerimientoStatus = 'pagado' | 'recibido' | 'atrasado' | 'en_curso' | 'sin_curso';

// ===== FORMATO NUEVO (SQLite) =====
export interface Jardin {
  id: number;
  codigo: string;
  nombre: string;
  created_at: string;
}

export interface Partida {
  id: number;
  item: string;
  partida: string;
  unidad: string | null;
  precio_unitario: number;
  created_at: string;
}

export interface Recinto {
  id: number;
  jardin_codigo: string;
  nombre: string;
  created_at: string;
}

export interface Requerimiento {
  jardin_codigo: string;
  recinto: string;
  partida_item: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  fecha_inicio: string;
  fecha_registro: string;
  estado: string;
  ot_codigo: string | null;
  informe_codigo: string | null;
  fecha_recepcion: string | null;
  plazo_dias: number;
  plazo_adicional: number;
  plazo_total: number;
  fecha_limite: string;
  multa: number;
  descripcion: string | null;
  observaciones: string | null;
}

export interface OrdenTrabajo {
  codigo: string;
  jardin_codigo: string;
  fecha_emision: string;
  monto_total: number;
  estado: string;
  created_at: string;
}

export interface InformePago {
  codigo: string;
  jardin_codigo: string;
  fecha_emision: string;
  monto_total: number;
  estado: string;
  created_at: string;
}

// Nueva estructura BD SQLite
export interface DatabaseJSON {
  jardines: Jardin[];
  partidas: Partida[];
  recintos: Recinto[];
  requerimientos: Requerimiento[];
  ordenes_trabajo?: OrdenTrabajo[];
  informes_pago?: InformePago[];
}

// ===== APP STATE =====
export interface LoadedDatabase {
  contract: ContractType;
  line: LineType;
  fechaImportacion: string;
  data: DatabaseJSON;
}

// ===== REQUERIMIENTO ENRIQUECIDO (para UI) =====
export interface RequerimientoEnriquecido extends Requerimiento {
  jardin_nombre: string;
  partida_nombre: string;
  partida_unidad: string | null;
  dias_atraso: number;
  a_pago: number;
}

export interface StatsData {
  cantidades: Record<RequerimientoStatus, number>;
  montos: Record<RequerimientoStatus, number>;
}

export interface FilterOptions {
  jardines: string[];
  partidas: string[];
  fechaDesde?: string;
  fechaHasta?: string;
}
