import { z } from 'zod'
import { ILHA_IDS } from './ilhas'

/**
 * O salvamento do jogo de UM perfil. Tem versão: o serviço aceita a versão atual e as
 * anteriores (migradas por `migrarSalvamento`), então um jogo novo nunca perde o progresso de
 * quem salvou antes. Mudou o formato? Crie a próxima versão, escreva a migração da anterior e
 * mantenha os testes.
 */
export const VERSAO_SALVAMENTO = 3

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

/** Uma hora: o jogo desiste da corrida que passa disto (nada acima vai para o salvamento). */
export const MELHOR_TEMPO_MAXIMO_MS = 60 * 60 * 1000

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

/** Os bichos do Bosque que se esconderam no Cinza e que a criança pode adotar. */
export const BICHOS_DO_BOSQUE = ['cachorro', 'gato', 'coelho', 'porquinho'] as const
export type BichoDoBosque = (typeof BICHOS_DO_BOSQUE)[number]

/** Um dia do calendário no horário do aparelho (`AAAA-MM-DD`): o "hoje" da Capi e dos bichos. */
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Até onde vai a amizade com um morador (5 corações de 100). */
export const AMIZADE_MAXIMA = 500

/** O que a criança construiu com a Capi (`sistemas/moradores.ts` tem as regras). */
export const CapiSchema = z.strictObject({
  amizade: z.number().int().min(0).max(AMIZADE_MAXIMA),
  /** O último dia em que conversaram (a primeira conversa do dia é a que conta). */
  conversaEm: dia.nullable(),
  /** O último dia em que ela ganhou presente (só o primeiro do dia conta). */
  presenteEm: dia.nullable(),
  /** O pedido do dia, guardado para não mudar no meio do dia. */
  pedido: z.strictObject({ dia, id: z.string().min(1).max(40), entregue: z.boolean() }).nullable(),
})
export type Capi = z.infer<typeof CapiSchema>

/** O bicho adotado (`sistemas/bichos.ts` tem as regras de cuidar, ensinar e crescer). */
export const BichoAdotadoSchema = z.strictObject({
  id: z.enum(BICHOS_DO_BOSQUE),
  nome: z.string().trim().min(1).max(16),
  fase: z.enum(['filhote', 'adulto']),
  fome: nivel,
  limpeza: nivel,
  carinho: nivel,
  /** Dias em que foi bem cuidado (as três medidas passaram de 60 em algum momento). */
  diasCuidados: z.number().int().min(0).max(999),
  /** O último dia que já contou em `diasCuidados`. */
  diaCuidadoEm: dia.nullable(),
  truque: z.strictObject({
    sessoes: z.number().int().min(0).max(99),
    ultimaEm: dia.nullable(),
    aprendido: z.boolean(),
  }),
})
export type BichoAdotado = z.infer<typeof BichoAdotadoSchema>

/** V3 (28/10/2026): a V2 mais a Capi e os bichos do Bosque (achados e o adotado). */
export const SalvamentoV3Schema = SalvamentoV2Schema.extend({
  versao: z.literal(3),
  moradores: z.strictObject({ capi: CapiSchema }),
  bichos: z.strictObject({
    achados: z
      .array(z.enum(BICHOS_DO_BOSQUE))
      .max(BICHOS_DO_BOSQUE.length)
      .refine((lista) => new Set(lista).size === lista.length, 'bicho achado repetido'),
    adotado: BichoAdotadoSchema.nullable(),
  }),
})
export type SalvamentoV3 = z.infer<typeof SalvamentoV3Schema>

/** Da V2 para a V3: tudo igual, a Capi sem amizade ainda e nenhum bicho achado. */
export function migrarDaV2(v2: SalvamentoV2): SalvamentoV3 {
  return {
    ...v2,
    versao: 3,
    moradores: { capi: { amizade: 0, conversaEm: null, presenteEm: null, pedido: null } },
    bichos: { achados: [], adotado: null },
  }
}

/**
 * O formato atual. Aceita também a V1 e a V2 e já devolve migradas: um salvamento guardado antes
 * continua valendo, e a gravação antiga de uma aba aberta antes da atualização é guardada já
 * migrada. Essa aba antiga, porém, não lê a resposta (V3): a primeira gravação dela fica, e as
 * seguintes falham até a página recarregar.
 */
export const SalvamentoSchema = z.union([
  SalvamentoV3Schema,
  SalvamentoV2Schema.transform(migrarDaV2),
  SalvamentoV1Schema.transform((v1) => migrarDaV2(migrarDaV1(v1))),
])
export type Salvamento = SalvamentoV3

/** Teto do documento serializado (o serviço recusa acima disto). */
export const SALVAMENTO_MAX_BYTES = 64 * 1024

export function criarSalvamentoInicial(agora: Date): Salvamento {
  return {
    versao: 3,
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
    moradores: { capi: { amizade: 0, conversaEm: null, presenteEm: null, pedido: null } },
    bichos: { achados: [], adotado: null },
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
