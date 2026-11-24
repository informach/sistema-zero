import { z } from 'zod'
import { VetorSchema } from '../documento'
import {
  CamadaSchema,
  GrupoSchema,
  InstanciaSchema,
  LIMITES_CENARIO_V2,
  ModeloDoCenarioSchema,
  TexturaDoCenarioSchema,
} from './entidades-schema'
import { FormaDeCenarioSchema } from './formas'

const origem = z.string().min(1).max(240)
export const PrefixoDeColagemSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[\p{L}\p{N}_.-]+$/u)

/** Dados autorais, sem binários, endereços temporários ou estado de interface. */
export const FragmentoBasicoSchema = z
  .object({
    formato: z.literal('molda-cenario-fragmento'),
    versao: z.literal(1),
    origem: z.object({ espaco: origem, cenario: origem }).strict(),
    ancora: VetorSchema,
    raizes: z
      .array(origem)
      .min(1)
      .max(LIMITES_CENARIO_V2.objetos)
      .refine((ids) => new Set(ids).size === ids.length, 'Raízes repetidas'),
    modelos: z.array(ModeloDoCenarioSchema).max(LIMITES_CENARIO_V2.modelos),
    formas: z.array(FormaDeCenarioSchema).max(2000),
    texturas: z.array(TexturaDoCenarioSchema).max(256),
    grupos: z.array(GrupoSchema).max(LIMITES_CENARIO_V2.objetos),
    camadas: z.array(CamadaSchema).max(128),
    instancias: z.array(InstanciaSchema).max(LIMITES_CENARIO_V2.objetos),
  })
  .strict()
export type FragmentoBasico = z.infer<typeof FragmentoBasicoSchema>
