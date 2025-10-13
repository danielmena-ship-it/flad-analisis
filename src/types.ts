export type ContractType = 'mantencion' | 'calefaccion' | 'area_verde' | 'ascensores';
export type LineType = 'linea_1' | 'linea_2' | 'linea_3' | 'linea_4' | 'linea_5';

export interface LoadedDatabase {
  contract: ContractType;
  line: LineType;
  fechaImportacion: string;
  data: DatabaseJSON;
}

export interface Requerimiento {
  id: number;
  jardin_codigo: string;
  jardin_nombre: string;
  recinto: string;
  partida_item: string;
  partida_nombre: string;
  partida_unidad: string;
  cantidad: number;
  plazo: number;
  plazo_adicional: number;
  descripcion: string;
  observaciones: string;
  precio_unitario: string;
  precio_total: number;
  fecha_inicio: string;
  plazo_total: number;
  fecha_limite: string;
  fecha_registro: string;
  estado: string;
  ot_id: number | null;
  fecha_recepcion: string | null;
  dias_atraso: number;
  multa: number;
  a_pago: number;
  informe_pago_id: number | null;
}

export interface DatabaseJSON {
  version: string;
  metadata: {
    fecha_exportacion: string;
    titulo: string;
    total_requerimientos: number;
    total_ordenes: number;
    total_informes: number;
  };
  configuracion: any;
  catalogos: {
    jardines: Array<{ codigo: string; nombre: string }>;
    partidas: Array<{ item: string; partida: string; unidad: string; precio_unitario: string }>;
    recintos: Array<{ jardin_codigo: string; nombre: string }>;
  };
  datos: {
    requerimientos: Requerimiento[];
  };
}

export type RequerimientoStatus = 'pagado' | 'recibido' | 'atrasado' | 'en_curso' | 'sin_curso';

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
