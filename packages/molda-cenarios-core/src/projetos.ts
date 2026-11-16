import { z } from 'zod'
import { ModeloDeCatalogoSchema } from './catalogo'
import { LoteDeCenarioSchema } from './comandos'
import { type DocumentoDeCenario, DocumentoDeCenarioSchema } from './documento'

export const CriarCenarioSchema = z
  .object({
    nome: z.string().min(1).max(120),
    documento: DocumentoDeCenarioSchema,
    operacaoId: z.uuid(),
  })
  .strict()
export const EditarCenarioSchema = LoteDeCenarioSchema.extend({ operacaoId: z.uuid() }).strict()
export const AplicarCenarioSchema = z.object({ revisao: z.number().int().nonnegative() }).strict()
export const RestaurarCenarioSchema = z
  .object({
    revisaoEsperada: z.number().int().nonnegative(),
    origem: z.number().int().nonnegative(),
    operacaoId: z.uuid(),
  })
  .strict()
export const ReferenciaDeCatalogoSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-zA-Z0-9_-]+$/),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
export const RegistrarCatalogoSchema = ReferenciaDeCatalogoSchema.extend({
  modelos: z.array(ModeloDeCatalogoSchema).min(1).max(20_000),
}).strict()
export interface RevisaoDeCenario {
  projetoId: string
  revisao: number
  documento: DocumentoDeCenario
  autorId: string
  criadoEm: string
  operacaoId: string
  impressao: string
}
export interface ProjetoDeCenario {
  id: string
  nome: string
  revisao: number
  revisaoAplicada: number | null
  atualizadoEm: string
  autorId: string
}
