import {
  aprendaIssoEm,
  CARTAS_LUMI,
  type CartasDoJogador,
  cartaConquistada,
} from '@sistemazero/arquipelago-contracts'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import type { Jogador } from '../domain/jogador'
import { AcessoBloqueadoError } from './erros'
import { type LeiturasDosMembros, publicoDosMembros } from './leituras-dos-membros'

/**
 * Os cartões da rotina dos Lumis de quem joga, pelo posto da Jornada (a proposta: "mais postos,
 * mais cartões"; lacunas de 01/11/2026). Equipe vê todos.
 */
export class ServicoDasCartas {
  constructor(
    private readonly politica: PoliticaDeAcesso,
    private readonly leituras: LeiturasDosMembros,
  ) {}

  async cartas(jogador: Jogador): Promise<CartasDoJogador> {
    const decisao = decidirAcesso(this.politica, jogador)
    if (!decisao.liberado) throw new AcessoBloqueadoError(decisao.motivo)
    const [dados, curriculo] = await Promise.all([
      jogador.equipe ? null : this.leituras.jogador(jogador),
      this.leituras.curriculo(publicoDosMembros(jogador)),
    ])
    const posicao = dados ? dados.posicao : 'todos'
    return {
      cartas: CARTAS_LUMI.map((carta) => {
        const conquistada = cartaConquistada(carta, posicao)
        return {
          id: carta.id,
          nome: carta.nome,
          tipo: carta.tipo,
          efeito: carta.efeito,
          conquistada,
          posto: carta.posto,
          aprendaEm: conquistada || !carta.bloco ? [] : aprendaIssoEm(carta.bloco, curriculo),
        }
      }),
    }
  }
}
