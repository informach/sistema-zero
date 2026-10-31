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
import { semanaDeSaoPaulo } from '../domain/desafios'
import type { Jogador } from '../domain/jogador'
import { MoedasIndisponiveisError, type PortaDasMoedas } from '../domain/moedas.port'
import {
  type PedidoEntregue,
  PedidoRecusadoError,
  type RepositorioDosPedidos,
} from '../domain/pedidos.port'
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
    await this.cobrarOTeto(jogador)
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
        await this.deps.repo.confirmarPagamento(dono, comando.chave, this.semana(), (r) =>
          this.creditar(jogador, moedas, r),
        )
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

  /**
   * O que bateu no teto numa semana anterior volta a ser creditado (§6.28, A32), um por abertura,
   * com a mesma chave: repetir é seguro. Falha não atrapalha a pessoa; tenta de novo na próxima.
   */
  private async cobrarOTeto(jogador: Jogador) {
    const moedas = this.deps.moedas
    if (!moedas) return
    const dono = this.dono(jogador)
    const semana = this.semana()
    for (const r of await this.deps.repo.esperandoOTeto(dono, semana, 1)) {
      try {
        await this.deps.repo.confirmarPagamento(dono, r.comando.chave, semana, (x) =>
          this.creditar(jogador, moedas, x),
        )
      } catch (erro) {
        this.deps.logger.warn('arquipelago.pedido.teto_pendente', {
          erro: erro instanceof Error ? erro.name : 'desconhecido',
        })
        return
      }
    }
  }
  private async creditar(jogador: Jogador, moedas: PortaDasMoedas, r: PedidoEntregue) {
    const pago = await moedas.creditar({
      userId: r.dono.jogadorId,
      accountId: r.dono.contaId,
      audience: publicoDosMembros(jogador),
      key: r.pagamentoId,
      amount: r.moedas,
    })
    if (pago.situacao === 'recusado')
      this.deps.logger.error('arquipelago.pedido.credito_recusado', { codigo: pago.codigo })
    return pago.situacao
  }
  private semana() {
    return semanaDeSaoPaulo(this.deps.agora?.() ?? new Date())
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
