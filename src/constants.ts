import { ContractType, LineType } from './types';

// ===== CONSTANTES DE CONTRATOS Y LÍNEAS =====
export const CONTRACTS: Array<{ id: ContractType; label: string }> = [
  { id: 'mantencion', label: 'Mantención' },
  { id: 'calefaccion', label: 'Calefacción' },
  { id: 'area_verde', label: 'Área Verde' },
  { id: 'ascensores', label: 'Ascensores' }
];

export const LINES: Array<{ id: LineType; label: string }> = [
  { id: 'linea_1', label: 'Línea 1' },
  { id: 'linea_2', label: 'Línea 2' },
  { id: 'linea_3', label: 'Línea 3' },
  { id: 'linea_4', label: 'Línea 4' },
  { id: 'linea_5', label: 'Línea 5' }
];

// ===== CLAVES DE ALMACENAMIENTO =====
export const STORAGE_KEY = 'flad-analisis-databases';
export const FILTERS_KEY = 'flad-analisis-filters';
