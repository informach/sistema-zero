import { z } from 'zod'
import { GrupoSchema, IdentificadorDeCenarioSchema, TransformacaoSchema } from './entidades-schema'
import { FragmentoBasicoSchema } from './fragmento-base-schema'

export const LIMITES_CONJUNTOS = {
  definicoes: 128,
  montagens: 2000,
  objetosPorDefinicao: 2000,
} as const

/** Revisão imutável fixada no cenário. Abrir o histórico não consulta a cabeça da biblioteca. */
export const DefinicaoDeConjuntoSchema = z
  .object({
    id: IdentificadorDeCenarioSchema,
    biblioteca: IdentificadorDeCenarioSchema,
    conjunto: IdentificadorDeCenarioSchema,
    revisao: z.number().int().positive().max(2147483647),
    nome: z.string().min(1).max(120),
    conteudo: FragmentoBasicoSchema.refine(
      (f) =>
        f.instancias.length > 0 && f.instancias.length <= LIMITES_CONJUNTOS.objetosPorDefinicao,
      'O conjunto precisa ter entre um e 2.000 objetos',
    ),
  })
  .strict()

/** Tamanho uniforme conserva as proporções internas sem introduzir cisalhamento. */
export const MontagemDeConjuntoSchema = GrupoSchema.extend({
  id: IdentificadorDeCenarioSchema.max(160),
  definicao: IdentificadorDeCenarioSchema,
  /** Ausente nos conjuntos livres; o vínculo usa a mesma altura do terreno que os objetos. */
  apoio: z
    .discriminatedUnion('tipo', [
      z.object({ tipo: z.literal('absoluto') }).strict(),
      z
        .object({
          tipo: z.literal('terreno'),
          deslocamento: z.number().finite().min(-10000).max(10000),
        })
        .strict(),
    ])
    .optional(),
  transformacao: TransformacaoSchema.refine(
    (t) => t.escala.x === t.escala.y && t.escala.y === t.escala.z,
    'O tamanho do conjunto precisa preservar suas proporções',
  ),
}).strict()

export type DefinicaoDeConjunto = z.infer<typeof DefinicaoDeConjuntoSchema>
export type MontagemDeConjunto = z.infer<typeof MontagemDeConjuntoSchema>
