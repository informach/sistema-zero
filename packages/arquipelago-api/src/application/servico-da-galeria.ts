import {
  type CompraNaGaleria,
  GALERIA,
  type GaleriaDoJogador,
  type IdDaGaleria,
} from '@sistemazero/arquipelago-contracts'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import type { Jogador } from '../domain/jogador'
import { type PortaDaPosse, PosseIndisponivelError } from '../domain/posse.port'
import {
  AcessoBloqueadoError,
  PlataformaIndisponivelError,
  SaldoInsuficienteError,
  SomenteLeituraError,
} from './erros'
import { publicoDosMembros } from './leituras-dos-membros'

const dono = (jogador: Jogador) => ({
  userId: jogador.id,
  accountId: jogador.contaId ?? jogador.id,
  audience: publicoDosMembros(jogador),
})

/** A tabela histórica do jogo não participa da leitura nem de novas compras. */
export class ServicoDaGaleria {
  constructor(private readonly deps: { posse: PortaDaPosse | null; politica: PoliticaDeAcesso }) {}

  async aparenciasPagas(jogador: Jogador): Promise<ReadonlySet<IdDaGaleria>> {
    return new Set((await this.ler(jogador)).possuidas)
  }

  async ler(jogador: Jogador): Promise<GaleriaDoJogador> {
    this.exigirLiberado(jogador)
    const posse = await this.executar((porta) => porta.ler(dono(jogador)))
    return {
      possuidas: posse.possuidas,
      saldo: jogador.equipe ? null : posse.saldo,
      ilimitado: jogador.equipe,
    }
  }

  async comprar(jogador: Jogador, pedido: CompraNaGaleria): Promise<GaleriaDoJogador> {
    this.exigirLiberado(jogador)
    if (jogador.somenteLeitura) throw new SomenteLeituraError()
    // A chave pública permanece no contrato, mas a idempotência é por item no Members.
    const r = await this.executar((porta) =>
      porta.comprar({ ...dono(jogador), aparencia: pedido.aparencia, equipe: jogador.equipe }),
    )
    if (!r.ok) {
      if (r.codigo === 'SALDO_INSUFICIENTE') {
        const saldo = await this.executar((porta) => porta.ler(dono(jogador)))
        throw new SaldoInsuficienteError(GALERIA[pedido.aparencia].preco, saldo.saldo)
      }
      throw new PlataformaIndisponivelError()
    }
    return {
      possuidas: r.posse.possuidas,
      saldo: jogador.equipe ? null : r.posse.saldo,
      ilimitado: jogador.equipe,
    }
  }

  private async executar<T>(operacao: (porta: PortaDaPosse) => Promise<T>): Promise<T> {
    if (!this.deps.posse) throw new PlataformaIndisponivelError()
    try {
      return await operacao(this.deps.posse)
    } catch (erro) {
      if (erro instanceof PosseIndisponivelError) throw new PlataformaIndisponivelError(erro)
      throw erro
    }
  }
  private exigirLiberado(jogador: Jogador): void {
    const decisao = decidirAcesso(this.deps.politica, jogador)
    if (!decisao.liberado) throw new AcessoBloqueadoError(decisao.motivo)
  }
}
