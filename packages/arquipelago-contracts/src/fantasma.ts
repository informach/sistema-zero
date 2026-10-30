import { z } from 'zod'
import { PERCURSOS } from './salvamento'

export const PASSO_DO_FANTASMA_MS = 100
export const DURACAO_MAXIMA_DO_FANTASMA_MS = 300_000
export const AMOSTRAS_MAXIMAS_DO_FANTASMA = DURACAO_MAXIMA_DO_FANTASMA_MS / PASSO_DO_FANTASMA_MS + 1
export const FANTASMA_MAX_BYTES = 128 * 1024
const coordenada = z.number().int().min(-50_000).max(50_000)
/** Centro do corpo em centímetros; giro em uma volta de 65536 unidades. Sem nomes ou identidade. */
export const AmostraDoFantasmaSchema = z.tuple([
  coordenada,
  coordenada,
  coordenada,
  z.number().int().min(0).max(65_535),
])
export const FantasmaSchema = z
  .strictObject({
    versao: z.literal(1),
    percurso: z.enum(PERCURSOS),
    tempoMs: z.number().int().min(1).max(DURACAO_MAXIMA_DO_FANTASMA_MS),
    passoMs: z.literal(PASSO_DO_FANTASMA_MS),
    amostras: z.array(AmostraDoFantasmaSchema).min(2).max(AMOSTRAS_MAXIMAS_DO_FANTASMA),
  })
  .refine((r) => r.amostras.length === Math.ceil(r.tempoMs / PASSO_DO_FANTASMA_MS) + 1)
  .refine((r) => new TextEncoder().encode(JSON.stringify(r)).byteLength <= FANTASMA_MAX_BYTES)
export type Fantasma = z.infer<typeof FantasmaSchema>
