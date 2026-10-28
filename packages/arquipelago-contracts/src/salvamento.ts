import { z } from 'zod'
import { ILHA_IDS } from './ilhas'

/**
 * O salvamento do jogo de UM perfil. Tem versão: o serviço aceita a versão atual e as
 * anteriores (migradas por `migrarSalvamento`), então um jogo novo nunca perde o progresso de
 * quem salvou antes. Mudou o formato? Crie a v2, escreva a migração da v1 e mantenha os testes.
 */
export const VERSAO_SALVAMENTO = 1

const iso = z.iso.datetime({ offset: true })
const nivel = z.number().min(0).max(100)

export const SEMENTES = ['alface', 'tomate', 'milho'] as const
export type Semente = (typeof SEMENTES)[number]

export const CanteiroSchema = z.strictObject({
  id: z.string().min(1).max(20),
  semente: z.enum(SEMENTES).nullable(),
  plantadoEm: iso.nullable(),
  regadoEm: iso.nullable(),
})
export type Canteiro = z.infer<typeof CanteiroSchema>

export const SalvamentoV1Schema = z.strictObject({
  versao: z.literal(1),
  criadoEm: iso,
  necessidades: z.strictObject({ fome: nivel, energia: nivel, diversao: nivel }),
  horta: z.array(CanteiroSchema).max(24),
  /** Item → quantidade. Itens desconhecidos de uma versão futura são ignorados pelo jogo. */
  inventario: z.record(z.string().min(1).max(40), z.number().int().min(0).max(999)),
  posicao: z.strictObject({ x: z.number(), y: z.number(), z: z.number() }).nullable(),
  /** Pontes cuja chegada (a cor varrendo a ilha) a pessoa já viu. */
  pontesVistas: z.array(z.enum(ILHA_IDS)).max(ILHA_IDS.length),
  casa: z.strictObject({ portaNova: z.boolean() }),
})
export type SalvamentoV1 = z.infer<typeof SalvamentoV1Schema>

/** O formato atual. */
export const SalvamentoSchema = SalvamentoV1Schema
export type Salvamento = SalvamentoV1

/** Teto do documento serializado (o serviço recusa acima disto). */
export const SALVAMENTO_MAX_BYTES = 64 * 1024

export function criarSalvamentoInicial(agora: Date): Salvamento {
  return {
    versao: 1,
    criadoEm: agora.toISOString(),
    necessidades: { fome: 80, energia: 100, diversao: 70 },
    horta: Array.from({ length: 6 }, (_, i) => ({
      id: `c${i + 1}`,
      semente: null,
      plantadoEm: null,
      regadoEm: null,
    })),
    inventario: { 'semente-alface': 3, 'semente-tomate': 2, 'semente-milho': 1 },
    posicao: null,
    pontesVistas: [],
    casa: { portaNova: false },
  }
}

/**
 * Lê qualquer versão conhecida e devolve a atual. Entrada inválida ou de versão futura volta
 * `null`: quem chama decide (o jogo começa do zero só se não houver nada guardado).
 */
export function migrarSalvamento(entrada: unknown): Salvamento | null {
  const v1 = SalvamentoV1Schema.safeParse(entrada)
  return v1.success ? v1.data : null
}
