import { z } from 'zod'
import { POSTOS_DA_VILA, type PostoDaVila } from './salvamento'
import { pedidosDoTurno, TAMANHO_DOS_PEDIDOS } from './turnos'

/** Versão do roteiro guardada no serviço. Nunca reinterpretar um turno antigo com outra regra. */
export const VERSAO_DAS_PROFISSOES = 1
export const MOEDAS_DO_TURNO = 5

const ItensDaBandejaSchema = z
  .record(z.string().min(1).max(60), z.number().int().min(1).max(5))
  .refine((itens) => Object.values(itens).reduce((s, n) => s + n, 0) <= 5, 'Bandeja grande demais')

export const IniciarProfissaoSchema = z.strictObject({ posto: z.enum(POSTOS_DA_VILA) })
export const ConcluirProfissaoSchema = z.strictObject({
  sessao: z.uuid(),
  respostas: z.array(ItensDaBandejaSchema).length(TAMANHO_DOS_PEDIDOS.length),
})
export type ConcluirProfissao = z.infer<typeof ConcluirProfissaoSchema>

export const PagamentoDaProfissaoSchema = z.enum(['aguardando', 'pendente', 'teto', 'creditado'])
export type PagamentoDaProfissao = z.infer<typeof PagamentoDaProfissaoSchema>
export const SessaoDaProfissaoSchema = z
  .strictObject({
    id: z.uuid(),
    versao: z.literal(VERSAO_DAS_PROFISSOES),
    posto: z.enum(POSTOS_DA_VILA),
    dia: z.iso.date(),
    pedidos: z
      .array(z.strictObject({ quem: z.string().min(1).max(60), itens: ItensDaBandejaSchema }))
      .length(TAMANHO_DOS_PEDIDOS.length),
    concluido: z.boolean(),
    moedas: z.number().int().min(0).max(100),
    pagamento: PagamentoDaProfissaoSchema,
  })
  .refine(
    (s) => s.concluido === (s.pagamento !== 'aguardando'),
    'Pagamento incompatível com a conclusão',
  )
export type SessaoDaProfissao = z.infer<typeof SessaoDaProfissaoSchema>

/** O cliente não escolhe prêmio, dia nem pedido. O serviço recria os seis pedidos pelo id salvo. */
export function conferirBandejasDaProfissao(
  sessao: string,
  posto: PostoDaVila,
  respostas: readonly Readonly<Record<string, number>>[],
): boolean {
  const pedidos = pedidosDoTurno(posto, sessao, 0)
  return (
    respostas.length === pedidos.length &&
    pedidos.every((p, i) => {
      const resposta = respostas[i]
      return (
        resposta !== undefined &&
        Object.keys(resposta).length === Object.keys(p.itens).length &&
        Object.entries(p.itens).every(
          ([id, qtd]) => Object.hasOwn(resposta, id) && resposta[id] === qtd,
        )
      )
    })
  )
}
