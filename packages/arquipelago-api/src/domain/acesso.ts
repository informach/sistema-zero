import type { MotivoDeBloqueio, PublicoJogo } from '@sistemazero/arquipelago-contracts'
import type { Jogador } from './jogador'

export type ModoDeAcesso = 'desligado' | 'lista' | 'aberto'

export interface PoliticaDeAcesso {
  modo: ModoDeAcesso
  publicos: ReadonlySet<PublicoJogo>
  /** Ids de perfil ou de conta (minúsculos). */
  lista: ReadonlySet<string>
}

export type Decisao =
  | { liberado: true; motivo: null }
  | { liberado: false; motivo: MotivoDeBloqueio }

/**
 * Quem vê o jogo. Desligado vale para todos (pausar o jogo é imediato). Com o jogo ligado, a
 * equipe sempre entra para testar; os demais precisam do público ligado e, no modo lista, do
 * próprio id ou do id da conta da família na lista.
 */
export function decidirAcesso(politica: PoliticaDeAcesso, jogador: Jogador): Decisao {
  if (politica.modo === 'desligado') return { liberado: false, motivo: 'desligado' }
  if (jogador.equipe) return { liberado: true, motivo: null }
  if (!politica.publicos.has(jogador.publico))
    return { liberado: false, motivo: 'publico-desligado' }
  if (politica.modo === 'lista') {
    const naLista =
      politica.lista.has(jogador.id) ||
      (jogador.contaId !== null && politica.lista.has(jogador.contaId))
    if (!naLista) return { liberado: false, motivo: 'fora-da-lista' }
  }
  return { liberado: true, motivo: null }
}
