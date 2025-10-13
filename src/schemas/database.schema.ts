import { z } from 'zod';

export const RequerimientoSchema = z.object({
  id: z.number(),
  jardin_codigo: z.string(),
  jardin_nombre: z.string(),
  recinto: z.string(),
  partida_item: z.string(),
  partida_nombre: z.string(),
  partida_unidad: z.string(),
  cantidad: z.number(),
  plazo: z.number(),
  plazo_adicional: z.number(),
  descripcion: z.string(),
  observaciones: z.string(),
  precio_unitario: z.string(),
  precio_total: z.number(),
  fecha_inicio: z.string(),
  plazo_total: z.number(),
  fecha_limite: z.string(),
  fecha_registro: z.string(),
  estado: z.string(),
  ot_id: z.number().nullable(),
  fecha_recepcion: z.string().nullable(),
  dias_atraso: z.number(),
  multa: z.number(),
  a_pago: z.number(),
  informe_pago_id: z.number().nullable(),
});

export const CatalogoJardinSchema = z.object({
  codigo: z.string(),
  nombre: z.string(),
});

export const CatalogoPartidaSchema = z.object({
  item: z.string(),
  partida: z.string(),
  unidad: z.string(),
  precio_unitario: z.string(),
});

export const CatalogoRecintoSchema = z.object({
  jardin_codigo: z.string(),
  nombre: z.string(),
});

export const DatabaseJSONSchema = z.object({
  version: z.string(),
  metadata: z.object({
    fecha_exportacion: z.string(),
    titulo: z.string(),
    total_requerimientos: z.number(),
    total_ordenes: z.number(),
    total_informes: z.number(),
  }),
  configuracion: z.any(),
  catalogos: z.object({
    jardines: z.array(CatalogoJardinSchema),
    partidas: z.array(CatalogoPartidaSchema),
    recintos: z.array(CatalogoRecintoSchema),
  }),
  datos: z.object({
    requerimientos: z.array(RequerimientoSchema),
  }),
});

export type DatabaseJSON = z.infer<typeof DatabaseJSONSchema>;
export type Requerimiento = z.infer<typeof RequerimientoSchema>;

export function validateDatabaseJSON(data: unknown): DatabaseJSON {
  return DatabaseJSONSchema.parse(data);
}
