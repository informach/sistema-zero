import { z } from 'zod'

/**
 * A revisão humana do projeto autoral da Lenda (lacunas, 01/11/2026). A Jornada pede "uma revisão
 * humana por projeto final, com retorno acionável e nova tentativa". Aprovado pelos critérios, o
 * projeto entra na fila da Sala do Professor (`aguardando`); a pessoa da equipe joga o projeto e
 * responde com um retorno: `conferido` (está bom) ou `nova-tentativa` (vale melhorar e enviar de
 * novo). Um novo envio volta a `aguardando`, com o retorno anterior guardado até a resposta nova.
 * O acesso ao jogo e às criações continua durante a revisão.
 */
export const ESTADOS_DA_REVISAO_HUMANA = ['aguardando', 'conferido', 'nova-tentativa'] as const
export type EstadoDaRevisaoHumana = (typeof ESTADOS_DA_REVISAO_HUMANA)[number]
export const LIMITE_DO_RETORNO = 1000

/** O que a pessoa vê no painel do desafio. */
export const RevisaoHumanaSchema = z.strictObject({
  estado: z.enum(ESTADOS_DA_REVISAO_HUMANA),
  /** O número do envio que está na fila ou que foi respondido. */
  envio: z.number().int().min(1),
  enviadoEm: z.iso.datetime(),
  retorno: z.string().min(1).max(LIMITE_DO_RETORNO).optional(),
  revisadoEm: z.iso.datetime().optional(),
})
export type RevisaoHumana = z.infer<typeof RevisaoHumanaSchema>

/** Um item da fila da Sala do Professor. */
export const ItemDaFilaDeRevisaoSchema = RevisaoHumanaSchema.extend({
  jogadorId: z.uuid(),
  desafioId: z.uuid(),
  // Os públicos do desafio (sem importar `desafios.ts`, que lê este arquivo).
  publico: z.enum(['kids', 'adulto']),
  titulo: z.string().min(1).max(200),
})
export type ItemDaFilaDeRevisao = z.infer<typeof ItemDaFilaDeRevisaoSchema>

/** A resposta da equipe. `envio` é a trava: responder a um envio que já foi trocado é 409. */
export const ResponderRevisaoSchema = z.strictObject({
  envio: z.number().int().min(1),
  estado: z.enum(['conferido', 'nova-tentativa']),
  retorno: z.string().trim().min(1).max(LIMITE_DO_RETORNO),
})
export type ResponderRevisao = z.infer<typeof ResponderRevisaoSchema>

/** `GET /arquipelago/admin/revisoes`: a fila. */
export const FilaDeRevisaoSchema = z.strictObject({ revisoes: z.array(ItemDaFilaDeRevisaoSchema) })
/** `GET /arquipelago/admin/revisoes/:jogador/:desafio`: o item e a cópia aprovada do jogo. */
export const RevisaoAbertaSchema = z.strictObject({
  revisao: ItemDaFilaDeRevisaoSchema,
  projeto: z.unknown(),
})
