import { z } from 'zod'
import { SalvamentoSchema } from './salvamento'

/**
 * Respostas do serviço do jogo (`/arquipelago/*` no gateway). A plataforma só repassa; quem lê
 * é o jogo (e, no Kids, a área dos pais para o limite diário).
 */
export const MotivoDeBloqueioSchema = z.enum(['desligado', 'publico-desligado', 'fora-da-lista'])
export type MotivoDeBloqueio = z.infer<typeof MotivoDeBloqueioSchema>

export const AcessoSchema = z.strictObject({
  liberado: z.boolean(),
  motivo: MotivoDeBloqueioSchema.nullable(),
  /** Minutos de tempo livre por dia (Kids). `null` = sem limite (adulto). */
  limiteDiarioMinutos: z.number().int().positive().nullable(),
  usadoHojeSegundos: z.number().int().min(0),
})
export type Acesso = z.infer<typeof AcessoSchema>

/** A revisão mora numa coluna `integer` do Postgres: acima disto o banco recusaria (500). */
export const REVISAO_MAXIMA = 2_147_483_647
const revisao = z.number().int().min(0).max(REVISAO_MAXIMA)

export const SalvamentoGuardadoSchema = z.strictObject({
  /** 0 = nada guardado ainda. */
  revisao,
  salvamento: SalvamentoSchema.nullable(),
  atualizadoEm: z.iso.datetime({ offset: true }).nullable(),
})
export type SalvamentoGuardado = z.infer<typeof SalvamentoGuardadoSchema>

export const GravarSalvamentoSchema = z.strictObject({
  revisaoBase: revisao,
  salvamento: SalvamentoSchema,
})
export type GravarSalvamento = z.infer<typeof GravarSalvamentoSchema>

/** 409: outro aparelho salvou antes. Vem a versão guardada para o jogo decidir. */
export const CODIGO_SALVAMENTO_DESATUALIZADO = 'SALVAMENTO_DESATUALIZADO'

/** Corpo do 409: o envelope de erro do monorepo mais o que está guardado agora. */
export const ConflitoDeSalvamentoSchema = z.object({
  error: z.object({ code: z.literal(CODIGO_SALVAMENTO_DESATUALIZADO), message: z.string() }),
  atual: SalvamentoGuardadoSchema,
})
export type ConflitoDeSalvamento = z.infer<typeof ConflitoDeSalvamentoSchema>

export const RegistrarTempoSchema = z.strictObject({
  eventoId: z.uuid(),
  dia: z.iso.date(),
  /** Segundos jogados desde o último aviso (o jogo avisa a cada minuto). */
  segundos: z.number().int().min(1).max(120),
})
export const TempoRegistradoSchema = z.strictObject({
  usadoHojeSegundos: z.number().int().min(0),
  limiteDiarioMinutos: z.number().int().positive().nullable(),
  acabou: z.boolean(),
})
export type TempoRegistrado = z.infer<typeof TempoRegistradoSchema>

export const LimiteDaFamiliaSchema = z.strictObject({
  limiteDiarioMinutos: z.number().int().positive(),
})
export type LimiteDaFamilia = z.infer<typeof LimiteDaFamiliaSchema>

/** `GET /arquipelago/cartas`: os cartões da rotina dos Lumis e onde aprender os que faltam. */
export const CartasDoJogadorSchema = z.strictObject({
  cartas: z.array(
    z.strictObject({
      id: z.string().min(1).max(60),
      nome: z.string().min(1).max(80),
      tipo: z.enum(['quando', 'acao', 'controle']),
      efeito: z.string().max(200),
      conquistada: z.boolean(),
      /** Só nos que faltam: os cursos que liberam o bloco do cartão. */
      aprendaEm: z.array(
        z.strictObject({
          courseId: z.uuid(),
          titulo: z.string().min(1).max(200),
          slug: z.string().min(1).max(200),
          posto: z.string().min(1).max(40).nullable(),
        }),
      ),
    }),
  ),
})
export type CartasDoJogador = z.infer<typeof CartasDoJogadorSchema>
