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
 * Os cartões da rotina dos Lumis de quem joga: os do jogo sempre, os de controle pelos blocos que a
 * pessoa conquistou nos cursos (a mesma régua dos desafios). Equipe vê todos.
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
    const blocos = dados ? new Set(dados.blocos) : 'todos'
    return {
      cartas: CARTAS_LUMI.map((carta) => {
        const conquistada = cartaConquistada(carta, blocos)
        return {
          id: carta.id,
          nome: carta.nome,
          tipo: carta.tipo,
          efeito: carta.efeito,
          conquistada,
          aprendaEm: conquistada || !carta.bloco ? [] : aprendaIssoEm(carta.bloco, curriculo),
        }
      }),
    }
  }
}
