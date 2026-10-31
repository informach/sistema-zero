import { z } from 'zod'
import { AberturaSchema, ObraDaCabanaSchema, PisoDoComodoSchema, TrechoSchema } from './salvamento'

/**
 * A obra estendida (E04 e B14, 31/10/2026): o que a criação avançada constrói e não cabe no
 * salvamento (a V22 tem uns 186 bytes de folga no pior caso). Um documento à parte no serviço, por
 * perfil e público, com revisão própria, no molde dos fantasmas: o iglu do Pico, o andar de cima da
 * casa e o terreno moldado do lote. A obra da casa continua no salvamento; este documento só
 * acrescenta. Suporte e visita só leem.
 */
export const VERSAO_DA_OBRA_ESTENDIDA = 1
export const OBRA_ESTENDIDA_MAX_BYTES = 32 * 1024

const coordenada = z.number().int().min(-60).max(60)

/**
 * O andar de cima da casa (Pico em diante): a escada interna (1 × 4 células, posta num cômodo do
 * térreo; a célula é o pé dela e o giro diz para onde sobe), e as paredes, portas, janelas e pisos
 * de cima, no mesmo formato da obra do térreo. O piso de cima cobre as células dos cômodos do
 * térreo (menos o vão da escada); onde não há parede, o guarda-corpo segura.
 */
export const AndarDeCimaSchema = z.strictObject({
  escada: z
    .strictObject({ x: coordenada, z: coordenada, giro: z.number().int().min(0).max(3) })
    .nullable(),
  paredes: z.array(TrechoSchema).max(120),
  aberturas: z.array(AberturaSchema).max(30),
  pisos: z.array(PisoDoComodoSchema).max(20),
})
export type AndarDeCima = z.infer<typeof AndarDeCimaSchema>

/** As alturas que a criança dá a uma célula do lote, em meios metros (0 é o chão de sempre). */
export const ALTURA_MAXIMA_DO_TERRENO = 3
/** Quantas células moldadas o lote guarda (as de altura zero não se guardam). */
export const CELULAS_MOLDADAS_MAXIMO = 600

/**
 * O terreno moldado do lote grande (Nuvens em diante): só as células com altura, em tuplas
 * [x, z, altura em meios metros], sem repetir célula.
 */
export const TerrenoSchema = z.strictObject({
  alturas: z
    .array(z.tuple([coordenada, coordenada, z.number().int().min(1).max(ALTURA_MAXIMA_DO_TERRENO)]))
    .max(CELULAS_MOLDADAS_MAXIMO)
    .refine((l) => new Set(l.map(([x, zz]) => `${x},${zz}`)).size === l.length, 'célula repetida'),
})
export type Terreno = z.infer<typeof TerrenoSchema>

export const ObraEstendidaSchema = z
  .strictObject({
    versao: z.literal(VERSAO_DA_OBRA_ESTENDIDA),
    /** A obra do iglu no lote da clareira do Pico (o mesmo formato da cabana do Bosque). */
    iglu: ObraDaCabanaSchema.nullable(),
    andar: AndarDeCimaSchema.nullable(),
    terreno: TerrenoSchema.nullable(),
  })
  .refine(
    (o) => new TextEncoder().encode(JSON.stringify(o)).byteLength <= OBRA_ESTENDIDA_MAX_BYTES,
    'obra estendida grande demais',
  )
export type ObraEstendida = z.infer<typeof ObraEstendidaSchema>

export function obraEstendidaVazia(): ObraEstendida {
  return { versao: VERSAO_DA_OBRA_ESTENDIDA, iglu: null, andar: null, terreno: null }
}

/** O que o serviço devolve: a revisão (0 = nunca gravada) e a obra (`null` antes da primeira). */
export const LeituraDaObraEstendidaSchema = z.strictObject({
  revisao: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  obra: ObraEstendidaSchema.nullable(),
})
export type LeituraDaObraEstendida = z.infer<typeof LeituraDaObraEstendidaSchema>

/** Gravar: a revisão em que a mudança se baseou (a do serviço cresce de um em um). */
export const GravarObraEstendidaSchema = z.strictObject({
  revisaoBase: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  obra: ObraEstendidaSchema,
})
export type GravarObraEstendida = z.infer<typeof GravarObraEstendidaSchema>
export const CORPO_DA_OBRA_ESTENDIDA_MAX_BYTES = OBRA_ESTENDIDA_MAX_BYTES + 1024
