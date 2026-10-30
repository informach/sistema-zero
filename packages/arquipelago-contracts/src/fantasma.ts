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

/** A revisão confirma que o recorde já chegou ao serviço, antes do artefato separado. */
export const GuardarFantasmaSchema = z.strictObject({
  versao: z.literal(1),
  revisaoBase: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  fantasma: FantasmaSchema,
})
export type GuardarFantasma = z.infer<typeof GuardarFantasmaSchema>
export const CORPO_DO_FANTASMA_MAX_BYTES = FANTASMA_MAX_BYTES + 1024

/** Sem nome, perfil, inventário ou versão inteira do salvamento do outro jogador. */
export const LeituraDoFantasmaSchema = z.discriminatedUnion('situacao', [
  z.strictObject({
    versao: z.literal(1),
    situacao: z.literal('disponivel'),
    fantasma: FantasmaSchema,
  }),
  z.strictObject({ versao: z.literal(1), situacao: z.literal('ausente') }),
])
export type LeituraDoFantasma = z.infer<typeof LeituraDoFantasmaSchema>
