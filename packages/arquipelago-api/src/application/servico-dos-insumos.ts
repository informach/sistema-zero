import {
  type CompraDeInsumos,
  CompraDeInsumosSchema,
  ResultadoDaCompraDeInsumosSchema,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import type { RepositorioDosInsumos } from '../domain/insumos.port'
import type { Jogador } from '../domain/jogador'
import { MoedasIndisponiveisError, type PortaDoDebito } from '../domain/moedas.port'
import { AcessoBloqueadoError, PlataformaIndisponivelError, SomenteLeituraError } from './erros'
import { publicoDosMembros } from './leituras-dos-membros'

export class ServicoDosInsumos {
  constructor(
    private readonly deps: {
      repo: RepositorioDosInsumos
      debito: PortaDoDebito | null
      politica: PoliticaDeAcesso
      agora?: () => Date
    },
  ) {}

  async pendente(jogador: Jogador) {
    this.exigirEscrita(jogador)
    const r = await this.deps.repo.pendente(this.dono(jogador))
    return { versao: 1 as const, pedido: r?.pedido ?? null }
  }

  async comprar(jogador: Jogador, bruto: CompraDeInsumos) {
    this.exigirEscrita(jogador)
    const pedido = CompraDeInsumosSchema.parse(bruto)
    const debito = this.deps.debito
    if (!debito) throw new PlataformaIndisponivelError()
    const dono = this.dono(jogador)
    await this.deps.repo.reservar(dono, pedido, this.agora())
    try {
      const r = await this.deps.repo.concluir(
        dono,
        pedido.chave,
        (compra) =>
          debito.debitar({
            userId: dono.jogadorId,
            accountId: dono.contaId,
            audience: publicoDosMembros(jogador),
            key: compra.pedido.chave,
            amount: compra.moedas,
          }),
        this.agora(),
      )
      return ResultadoDaCompraDeInsumosSchema.parse({
        versao: 1,
        pedido: r.compra.pedido,
        situacao: r.compra.situacao,
        moedas: r.compra.moedas,
        saldo: r.compra.saldo,
        guardado: {
          revisao: r.guardado.revisao,
          salvamento: SalvamentoSchema.parse(r.guardado.dados),
          atualizadoEm: r.guardado.atualizadoEm.toISOString(),
        },
      })
    } catch (erro) {
      // A reserva não some quando a carteira não respondeu. GET pendente permite retomar
      // em outro aparelho sem precisar adivinhar se houve débito.
      if (erro instanceof MoedasIndisponiveisError) throw new PlataformaIndisponivelError(erro)
      throw erro
    }
  }

  private exigirEscrita(j: Jogador) {
    const acesso = decidirAcesso(this.deps.politica, j)
    if (!acesso.liberado) throw new AcessoBloqueadoError(acesso.motivo)
    if (j.somenteLeitura) throw new SomenteLeituraError()
  }
  private dono(j: Jogador) {
    return { jogadorId: j.id, contaId: j.contaId ?? j.id, publico: j.publico }
  }
  private agora() {
    return this.deps.agora?.() ?? new Date()
  }
}
