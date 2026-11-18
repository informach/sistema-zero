import { z } from 'zod'
import { VetorSchema } from '../documento'
import { CenarioInvalido } from '../validacao'
import { alteracoesDoGesto, transformacaoResolvida } from './chao'
import type { ComandoDeCenario } from './comandos'
import type { DocumentoDeCenario } from './documento'
import { volumeDaReferencia } from './fontes'
import { girarNaVertical } from './rotacao'
import type { FonteDeAlturas } from './terreno'
import { transformarVolume } from './volume'

/** Preferências de edição, separadas do documento autoral e do histórico. */
export const EncaixeDeComposicaoSchema = z
  .object({
    grade: z.number().finite().min(0.05).max(100).nullable(),
    angulo: z.number().finite().min(0.1).max(180).nullable(),
    origem: VetorSchema.default({ x: 0, y: 0, z: 0 }),
    andar: z
      .object({
        altura: z.number().finite().min(0.1).max(100),
        nivel: z.number().int().min(-100).max(100),
      })
      .strict()
      .nullable()
      .default(null),
    superficie: z.boolean().default(false),
  })
  .strict()
export type EncaixeDeComposicao = z.infer<typeof EncaixeDeComposicaoSchema>

export function encaixarNaGrade(valor: number, passo: number | null, origem = 0): number {
  if (passo === null) return valor
  if (!Number.isFinite(passo) || passo <= 0 || !Number.isFinite(origem) || !Number.isFinite(valor))
    throw new CenarioInvalido(['Grade inválida'])
  const v = origem + Math.round((valor - origem) / passo) * passo
  return Math.abs(v) < 1e-12 ? 0 : v
}

export function girarObjetosNaVertical(
  doc: DocumentoDeCenario,
  ids: readonly string[],
  angulo: number,
): ComandoDeCenario[] {
  if (!Number.isFinite(angulo)) throw new CenarioInvalido(['Giro inválido'])
  return ids.map((id) => {
    const o = doc.instancias.find((o) => o.id === id)
    if (!o) throw new CenarioInvalido([`Objeto ausente: ${id}`])
    const t = o.apoio.tipo === 'agua' ? transformacaoResolvida(doc, o) : o.transformacao
    const mundo = { ...t, rotacao: girarNaVertical(t.rotacao, angulo) }
    return {
      tipo: 'instancia.atualizar',
      id,
      alteracoes:
        o.apoio.tipo === 'agua'
          ? alteracoesDoGesto(doc, o, mundo)
          : {
              transformacao: {
                ...o.transformacao,
                rotacao: girarNaVertical(o.transformacao.rotacao, angulo),
              },
            },
    }
  })
}

/** Ação explícita: apoia a base das peças no plano do andar escolhido. */
export function levarObjetosAoAndar(
  doc: DocumentoDeCenario,
  ids: readonly string[],
  altura: number,
  fonte?: FonteDeAlturas,
): ComandoDeCenario[] {
  if (!Number.isFinite(altura) || Math.abs(altura) > 100_000)
    throw new CenarioInvalido(['Altura de andar inválida'])
  return ids.map((id) => {
    const o = doc.instancias.find((o) => o.id === id)
    const volume = volumeDaReferencia(doc, o?.modelo)
    if (!o || !volume)
      throw new CenarioInvalido(['Confira as medidas das peças antes de mudar de andar'])
    const t = transformacaoResolvida(doc, o, fonte)
    t.posicao.y = 0
    t.posicao.y = altura - transformarVolume(volume, t).min.y
    return {
      tipo: 'instancia.atualizar',
      id,
      alteracoes: { transformacao: t, apoio: { tipo: 'absoluto' } },
    }
  })
}
