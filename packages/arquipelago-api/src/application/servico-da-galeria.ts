import {
  type CompraNaGaleria,
  GALERIA,
  type GaleriaDoJogador,
  type IdDaGaleria,
} from '@sistemazero/arquipelago-contracts'
import type { Logger } from '@sistemazero/core/logging'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import type { RepositorioDaGaleria } from '../domain/galeria.port'
import type { Jogador } from '../domain/jogador'
import { MoedasIndisponiveisError, type PortaDoDebito } from '../domain/moedas.port'
import {
  AcessoBloqueadoError,
  PlataformaIndisponivelError,
  SaldoInsuficienteError,
  SomenteLeituraError,
} from './erros'
import { type LeiturasDosMembros, publicoDosMembros } from './leituras-dos-membros'

/** As aparências da galeria já pagas por este jogador (a pendente ainda não vale). */
export async function aparenciasPagas(
  galeria: Pick<RepositorioDaGaleria, 'compras'>,
  jogadorId: string,
): Promise<ReadonlySet<IdDaGaleria>> {
  const compras = await galeria.compras(jogadorId)
  return new Set(compras.filter((c) => c.situacao === 'paga').map((c) => c.aparencia))
}

/**
 * A galeria (fase1-13, 29/10/2026): comprar a aparência pronta de um objeto da casa com moedas
 * Zappy. A compra nasce `pendente` com uma chave e só vale (`paga`) depois que o Members confirma o
 * débito; a mesma chave nunca cobra duas vezes. A equipe compra sem gastar (como na loja do
 * quarto). Quem grava a aparência no salvamento é o jogo, e o serviço só aceita a da galeria que
 * foi paga (`aparenciasPagas`, usada pelo `ServicoDoJogo`).
 */
export class ServicoDaGaleria {
  private readonly agora: () => Date

  constructor(
    private readonly deps: {
      galeria: RepositorioDaGaleria
      /** A porta de moedas do Members; sem ela, comprar fica indisponível (424). */
      debito: PortaDoDebito | null
      leituras: LeiturasDosMembros
      politica: PoliticaDeAcesso
      logger: Logger
      agora?: () => Date
    },
  ) {
    this.agora = deps.agora ?? (() => new Date())
  }

  aparenciasPagas(jogadorId: string): Promise<ReadonlySet<IdDaGaleria>> {
    return aparenciasPagas(this.deps.galeria, jogadorId)
  }

  async ler(jogador: Jogador, saldoConhecido?: number): Promise<GaleriaDoJogador> {
    this.exigirLiberado(jogador)
    const possuidas = [...(await this.aparenciasPagas(jogador.id))]
    if (jogador.equipe) return { possuidas, saldo: null, ilimitado: true }
    return { possuidas, saldo: saldoConhecido ?? (await this.saldo(jogador)), ilimitado: false }
  }

  async comprar(jogador: Jogador, pedido: CompraNaGaleria): Promise<GaleriaDoJogador> {
    this.exigirLiberado(jogador)
    if (jogador.somenteLeitura) throw new SomenteLeituraError()
    const item = GALERIA[pedido.aparencia]
    const agora = this.agora()
    const compra = await this.deps.galeria.reservar({
      jogadorId: jogador.id,
      aparencia: item.id,
      objeto: item.objeto,
      // A equipe compra sem gastar: a compra dela guarda 0 moedas.
      moedas: jogador.equipe ? 0 : item.preco,
      chave: pedido.chave,
      agora,
    })
    if (compra.situacao === 'paga') return this.ler(jogador)
    if (compra.moedas === 0) {
      await this.deps.galeria.marcarPaga(jogador.id, item.id, agora)
      return this.ler(jogador)
    }
    if (!this.deps.debito) throw new PlataformaIndisponivelError()
    let r: Awaited<ReturnType<PortaDoDebito['debitar']>>
    try {
      r = await this.deps.debito.debitar({
        userId: jogador.id,
        accountId: jogador.contaId ?? jogador.id,
        audience: publicoDosMembros(jogador),
        // A chave e o preço guardados: repetir nunca cobra de novo, nem com outro valor.
        key: compra.chave,
        amount: compra.moedas,
      })
    } catch (erro) {
      // Não se sabe se cobrou: a compra fica pendente e o próximo pedido repete a mesma chave.
      if (erro instanceof MoedasIndisponiveisError) throw new PlataformaIndisponivelError(erro)
      throw erro
    }
    if (r.situacao === 'debitado') {
      await this.deps.galeria.marcarPaga(jogador.id, item.id, this.agora())
      return this.ler(jogador, r.saldo)
    }
    if (r.situacao === 'saldo-insuficiente') {
      await this.deps.galeria.desistir(jogador.id, item.id, compra.chave)
      throw new SaldoInsuficienteError(compra.moedas, await this.saldo(jogador))
    }
    this.deps.logger.error('arquipelago.galeria.debito_recusado', {
      aparencia: item.id,
      codigo: r.codigo,
    })
    throw new PlataformaIndisponivelError()
  }

  private async saldo(jogador: Jogador): Promise<number | null> {
    if (!this.deps.leituras.ligadas()) return null
    try {
      return await this.deps.leituras.saldo(jogador)
    } catch (erro) {
      this.deps.logger.warn('arquipelago.galeria.saldo_indisponivel', {
        erro: erro instanceof Error ? erro.name : 'desconhecido',
      })
      return null
    }
  }

  private exigirLiberado(jogador: Jogador): void {
    const decisao = decidirAcesso(this.deps.politica, jogador)
    if (!decisao.liberado) throw new AcessoBloqueadoError(decisao.motivo)
  }
}
