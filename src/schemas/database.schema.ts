import { z } from 'zod';

// ===== ESQUEMAS BASE =====
export const JardinSchema = z.object({
  id: z.number(),
  codigo: z.string(),
  nombre: z.string(),
  sobre_costo: z.number(),
  created_at: z.string(),
});

export const PartidaSchema = z.object({
  id: z.number(),
  item: z.string(),
  partida: z.string(),
  unidad: z.string().nullable(),
  precio_unitario: z.number(),
  created_at: z.string(),
});

export const RecintoSchema = z.object({
  id: z.number(),
  jardin_codigo: z.string(),
  nombre: z.string(),
  created_at: z.string(),
});

export const RequerimientoSchema = z.object({
  jardin_codigo: z.string(),
  recinto: z.string(),
  partida_item: z.string(),
  cantidad: z.number(),
  precio_unitario: z.number(),
  precio_total: z.number(),
  fecha_inicio: z.string(),
  fecha_registro: z.string(),
  estado: z.string(),
  ot_codigo: z.string().nullable(),
  informe_codigo: z.string().nullable(),
  fecha_recepcion: z.string().nullable(),
  plazo_dias: z.number(),
  plazo_adicional: z.number(),
  plazo_total: z.number(),
  fecha_limite: z.string(),
  multa: z.number(),
  a_pago: z.number(),
  sobre_costo: z.number(),
  utilidades: z.number(),
  iva: z.number(),
  total_linea: z.number(),
  descripcion: z.string().nullable(),
  observaciones: z.string().nullable(),
});

export const OrdenTrabajoSchema = z.object({
  codigo: z.string(),
  jardin_codigo: z.string(),
  fecha_emision: z.string(),
  monto_total: z.number(),
  estado: z.string(),
  created_at: z.string(),
});

export const InformePagoSchema = z.object({
  id: z.number(),
  codigo: z.string(),
  jardin_codigo: z.string(),
  fecha_creacion: z.string(),
  neto: z.number(),
  sobre_costo: z.number(),
  utilidades: z.number(),
  iva: z.number(),
  total_pagar: z.number(),
  cantidad_requerimientos: z.number().optional(),
  observaciones: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ===== ESQUEMA PRINCIPAL BD =====
export const DatabaseJSONSchema = z.object({
  jardines: z.array(JardinSchema),
  partidas: z.array(PartidaSchema),
  recintos: z.array(RecintoSchema),
  requerimientos: z.array(RequerimientoSchema),
  ordenes_trabajo: z.array(OrdenTrabajoSchema).optional(),
  informes_pago: z.array(InformePagoSchema).optional(),
});

// ===== TIPOS =====
export type DatabaseJSON = z.infer<typeof DatabaseJSONSchema>;
export type Jardin = z.infer<typeof JardinSchema>;
export type Partida = z.infer<typeof PartidaSchema>;
export type Recinto = z.infer<typeof RecintoSchema>;
export type Requerimiento = z.infer<typeof RequerimientoSchema>;
export type OrdenTrabajo = z.infer<typeof OrdenTrabajoSchema>;
export type InformePago = z.infer<typeof InformePagoSchema>;

// ===== VALIDADOR =====
export function validateDatabaseJSON(data: unknown): DatabaseJSON {
  return DatabaseJSONSchema.parse(data);
}
