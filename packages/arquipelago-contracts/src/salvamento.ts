import { z } from 'zod'
import { ILHA_IDS } from './ilhas'

/**
 * O salvamento do jogo de UM perfil. Tem versão: o serviço aceita a versão atual e as
 * anteriores (migradas por `migrarSalvamento`), então um jogo novo nunca perde o progresso de
 * quem salvou antes. Mudou o formato? Crie a próxima versão, escreva a migração da anterior e
 * mantenha os testes.
 */
export const VERSAO_SALVAMENTO = 2

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

/** Os percursos com tempo e estrelas (27/10/2026: só o das copas do Bosque). */
export const PERCURSOS = ['bosque-copas'] as const
export type PercursoId = (typeof PERCURSOS)[number]

/** Uma hora: nenhuma corrida dura tanto (o jogo cancela quem sai do percurso). */
const MELHOR_TEMPO_MAXIMO_MS = 60 * 60 * 1000

/**
 * O melhor de um percurso. Cada estrela vale sozinha e fica para sempre: a de chegar, a do
 * tempo-alvo e a dos vagalumes podem vir de corridas diferentes. O melhor tempo é o menor de
 * todas as corridas que chegaram.
 */
export const ResultadoDoPercursoSchema = z.strictObject({
  estrelas: z.strictObject({ chegada: z.boolean(), tempo: z.boolean(), vagalumes: z.boolean() }),
  melhorTempoMs: z.number().int().min(0).max(MELHOR_TEMPO_MAXIMO_MS),
})
export type ResultadoDoPercurso = z.infer<typeof ResultadoDoPercursoSchema>

/** V2 (27/10/2026): a V1 mais o melhor resultado de cada percurso. */
export const SalvamentoV2Schema = SalvamentoV1Schema.extend({
  versao: z.literal(2),
  percursos: z.partialRecord(z.enum(PERCURSOS), ResultadoDoPercursoSchema),
})
export type SalvamentoV2 = z.infer<typeof SalvamentoV2Schema>

/** Da V1 para a V2: tudo igual, e nenhum percurso corrido ainda. */
export function migrarDaV1(v1: SalvamentoV1): SalvamentoV2 {
  return { ...v1, versao: 2, percursos: {} }
}

/**
 * O formato atual. Aceita também a V1 e já devolve migrada: um salvamento guardado antes e uma
 * aba aberta antes da atualização (que ainda grava V1) continuam valendo, sem perder nada.
 */
export const SalvamentoSchema = z.union([
  SalvamentoV2Schema,
  SalvamentoV1Schema.transform(migrarDaV1),
])
export type Salvamento = SalvamentoV2

/** Teto do documento serializado (o serviço recusa acima disto). */
export const SALVAMENTO_MAX_BYTES = 64 * 1024

export function criarSalvamentoInicial(agora: Date): Salvamento {
  return {
    versao: 2,
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
    percursos: {},
  }
}

/**
 * Lê qualquer versão conhecida e devolve a atual. Entrada inválida ou de versão futura volta
 * `null`: quem chama decide (o jogo começa do zero só se não houver nada guardado).
 */
export function migrarSalvamento(entrada: unknown): Salvamento | null {
  const lido = SalvamentoSchema.safeParse(entrada)
  return lido.success ? lido.data : null
}
