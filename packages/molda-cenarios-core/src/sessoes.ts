import { z } from 'zod'
import { ComandoDeCenarioSchema } from './comandos'
import { VetorSchema } from './documento'

const revisao = z.number().int().nonnegative(),
  ids = z.array(z.string().min(1).max(260)).max(1000)
export const CriarSessaoSchema = z.object({ projetoId: z.uuid() }).strict()
export const EstadoDeSessaoSchema = z
  .object({
    revisao,
    revisaoPronta: z.number().int().min(-1),
    gesto: z.boolean(),
    ocupado: z.boolean(),
    modo: z.enum(['editando', 'testando']),
    selecionados: ids,
  })
  .strict()
export const AcaoDeViewportSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('camera'), posicao: VetorSchema, alvo: VetorSchema }).strict(),
  z
    .object({
      tipo: z.literal('editar'),
      comandos: z.array(ComandoDeCenarioSchema).min(1).max(500),
    })
    .strict(),
  z.object({ tipo: z.literal('selecionar'), ids }).strict(),
  z.object({ tipo: z.literal('enquadrar'), ids }).strict(),
  z.object({ tipo: z.literal('capturar') }).strict(),
  z.object({ tipo: z.literal('estado') }).strict(),
  z.object({ tipo: z.literal('testar'), ativo: z.boolean() }).strict(),
  z.object({ tipo: z.literal('desfazer') }).strict(),
  z.object({ tipo: z.literal('refazer') }).strict(),
  z
    .object({
      tipo: z.literal('ferramenta'),
      ferramenta: z.enum(['selecionar', 'mover', 'girar', 'escala', 'terreno', 'caminho', 'agua']),
    })
    .strict(),
  z.object({ tipo: z.literal('vista'), vista: z.enum(['perspectiva', 'superior']) }).strict(),
])
export const PedidoDeViewportSchema = z
  .object({ id: z.uuid(), revisaoEsperada: revisao, acao: AcaoDeViewportSchema })
  .strict()
export const ResultadoDeViewportSchema = z
  .object({
    ok: z.boolean(),
    revisao,
    dados: z.record(z.string(), z.json()).optional(),
    erro: z.string().max(2000).optional(),
  })
  .strict()
export type EstadoDeSessao = z.infer<typeof EstadoDeSessaoSchema>
export type PedidoDeViewport = z.infer<typeof PedidoDeViewportSchema>
export type ResultadoDeViewport = z.infer<typeof ResultadoDeViewportSchema>
export interface SessaoDeCenario {
  id: string
  projetoId: string
  autorId: string
  estado: EstadoDeSessao
  expiraEm: string
}
export interface TarefaDeViewport {
  id: string
  sessaoId: string
  autorId: string
  pedido: PedidoDeViewport
  estado: 'pendente' | 'executando' | 'concluido'
  resultado: ResultadoDeViewport | null
  expiraEm: string
}
