import {
  type EntregarPedido,
  EntregarPedidoSchema,
  ILHA_DO_PEDIDO,
  ilhaAberta,
  ResultadoDoPedidoSchema,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import type { Logger } from '@sistemazero/core/logging'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import type { Jogador } from '../domain/jogador'
import { MoedasIndisponiveisError, type PortaDasMoedas } from '../domain/moedas.port'
import { PedidoRecusadoError, type RepositorioDosPedidos } from '../domain/pedidos.port'
import {
  AcessoBloqueadoError,
  DesafioBloqueadoError,
  PlataformaIndisponivelError,
  SomenteLeituraError,
} from './erros'
import { type LeiturasDosMembros, publicoDosMembros } from './leituras-dos-membros'

export class ServicoDosPedidos {
  constructor(
    private readonly deps: {
      repo: RepositorioDosPedidos
      moedas: PortaDasMoedas | null
      leituras: Pick<LeiturasDosMembros, 'jogador'>
      politica: PoliticaDeAcesso
      logger: Logger
      agora?: () => Date
    },
  ) {}

  async pendentes(jogador: Jogador) {
    this.exigirEscrita(jogador)
    const r = await this.deps.repo.pendente(this.dono(jogador))
    return { versao: 1 as const, pedidos: r ? [r.comando] : [] }
  }

  async entregar(jogador: Jogador, bruto: EntregarPedido) {
    this.exigirEscrita(jogador)
    const comando = EntregarPedidoSchema.parse(bruto)
    const dono = this.dono(jogador)
    const anterior = await this.deps.repo.ler(dono, comando.chave)
    if (!anterior) {
      if (!this.deps.moedas) throw new PlataformaIndisponivelError()
      if (
        !jogador.equipe &&
        !ilhaAberta(
          ILHA_DO_PEDIDO[comando.morador],
          (await this.deps.leituras.jogador(jogador)).posicao,
        )
      )
        throw new DesafioBloqueadoError('ilha-fechada')
    }
    await this.deps.repo.entregar(dono, comando, this.deps.agora?.() ?? new Date())
    const moedas = this.deps.moedas
    if (moedas) {
      try {
        await this.deps.repo.confirmarPagamento(dono, comando.chave, async (r) => {
          const pago = await moedas.creditar({
            userId: dono.jogadorId,
            accountId: dono.contaId,
            audience: publicoDosMembros(jogador),
            key: r.pagamentoId,
            amount: r.moedas,
          })
          if (pago.situacao === 'recusado')
            this.deps.logger.error('arquipelago.pedido.credito_recusado', { codigo: pago.codigo })
          return pago.situacao
        })
      } catch (erro) {
        if (!(erro instanceof MoedasIndisponiveisError)) throw erro
        // A entrega já foi confirmada antes da carteira. Nunca voltar a consumir os itens.
        this.deps.logger.warn('arquipelago.pedido.credito_pendente', { erro: erro.name })
      }
    }
    const r = await this.deps.repo.ler(dono, comando.chave)
    if (!r) throw new PedidoRecusadoError('incompativel')
    return ResultadoDoPedidoSchema.parse({
      versao: 1,
      pedido: r.entrega.comando,
      pagamento: r.entrega.pagamento,
      moedas: r.entrega.moedas,
      guardado: {
        revisao: r.guardado.revisao,
        salvamento: SalvamentoSchema.parse(r.guardado.dados),
        atualizadoEm: r.guardado.atualizadoEm.toISOString(),
      },
    })
  }
  private exigirEscrita(jogador: Jogador) {
    const d = decidirAcesso(this.deps.politica, jogador)
    if (!d.liberado) throw new AcessoBloqueadoError(d.motivo)
    if (jogador.somenteLeitura) throw new SomenteLeituraError()
  }
  private dono(j: Jogador) {
    return { jogadorId: j.id, contaId: j.contaId ?? j.id, publico: j.publico }
  }
}
