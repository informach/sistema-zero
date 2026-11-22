import { z } from 'zod'
import { IdentificadorDeCenarioSchema } from './entidades-schema'

/**
 * As regiões de um cenário 3D (proposta aprovada em 21/11/2026, item 4; formato em
 * `docs/estudio-evolucao/regioes-3d-especificacao.md`). Quem monta o cenário desenha retângulos no
 * terreno e dá nome a eles ("Vila", "Floresta", "Caverna"); o Estúdio carrega a região onde o
 * personagem está e as vizinhas, e o bloco "Quando entrar na região" dispara pelo nome.
 *
 * O campo é OPCIONAL no documento v2 (cenário sem regiões fica igual) e entra só depois de os
 * leitores (o Estúdio, o motor e o SDK) aceitarem o campo, com o interruptor `CENARIOS_REGIOES`
 * do Members desligado até lá.
 */
export const LIMITES_REGIOES = {
  min: 1,
  max: 64,
  nome: 60,
  vizinhas: 8,
} as const

export const CaixaDeRegiaoSchema = z
  .object({
    x0: z.number().finite(),
    z0: z.number().finite(),
    x1: z.number().finite(),
    z1: z.number().finite(),
  })
  .strict()

export const RegiaoSchema = z
  .object({
    id: IdentificadorDeCenarioSchema,
    nome: z.string().min(1).max(LIMITES_REGIOES.nome),
    caixa: CaixaDeRegiaoSchema,
    vizinhas: z.array(IdentificadorDeCenarioSchema).max(LIMITES_REGIOES.vizinhas),
  })
  .strict()

export const RegioesSchema = z.array(RegiaoSchema).min(LIMITES_REGIOES.min).max(LIMITES_REGIOES.max)

export type CaixaDeRegiao = z.infer<typeof CaixaDeRegiaoSchema>
export type RegiaoDeCenario = z.infer<typeof RegiaoSchema>
