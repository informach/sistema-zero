import { falaDaSequencia, type PassoDaSequencia } from './dino-sequencia'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `controls` em exploração livre (Corre Dino, aula 8, 02/11/2026): só a IDEIA. O jogo
 * fica ESCUTANDO alguma coisa para começar a partida: só o Enter, ou qualquer tecla ou toque. Nada de
 * bloco, evento, "Quando apertar a tecla" nem Se: os blocos ficam para a montagem do Estúdio.
 *
 * Antes do teste, a fala pergunta e diz o que observar; o resultado só vem na fala de DEPOIS dele.
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/controls.tsx`): "Só o Enter", "Qualquer
 * tecla ou toque", "Tocar na tela", "Apertar Enter" e "Voltar à tela de início".
 * ⚠️ O Enter começa a partida dos dois jeitos (`start-key` cai com ou sem o toque): é "qualquer tecla".
 */
export const CONTROLS_SPEECH = {
  'controls-start':
    'A tela de início convida a começar com um toque na tela ou com o Enter. Para começar a partida, o jogo pode escutar só o Enter, ou qualquer tecla ou toque. Escutando só o Enter, o que acontece quando você toca na tela? Na tela de início, com Só o Enter escolhido, clique em Tocar na tela e observe.',
  'controls-enter':
    'Você tocou, e nada aconteceu: escutando só o Enter, o jogo não ouve o toque. E o Enter, começa a partida? Clique em Apertar Enter e observe a tela. Caso a partida já tenha começado, clique antes em Voltar à tela de início.',
  'controls-enter-first':
    'E o Enter, começa a partida? Na tela de início, clique em Apertar Enter e observe a tela. Caso a partida já tenha começado, clique antes em Voltar à tela de início.',
  'controls-toque':
    'Com o Enter, a partida começou. Mas quem joga no celular não tem teclado. E se o jogo escutar qualquer tecla ou toque, o que o toque faz? Clique em Voltar à tela de início, depois em Qualquer tecla ou toque e, por fim, em Tocar na tela. Observe a tela.',
  'controls-toque-first':
    'E se o jogo escutar qualquer tecla ou toque, o que o toque faz? Na tela de início, clique em Qualquer tecla ou toque e depois em Tocar na tela. Observe a tela. Caso a partida já tenha começado, clique antes em Voltar à tela de início.',
  'controls-complete':
    'Você comparou os dois jeitos. Escutando só o Enter, o toque não fez nada, e o Enter começou a partida. Escutando qualquer tecla ou toque, o toque também começa a partida, e quem joga no celular, sem teclado, consegue jogar. Pode continuar testando: e o Enter, escutando qualquer tecla ou toque?',
  'controls-complete-parcial':
    'Você fez os testes que esta experiência pede. Pode continuar testando o toque e o Enter, escutando só o Enter ou qualquer tecla ou toque.',
} as const

export type FalaDosControles = keyof typeof CONTROLS_SPEECH

/** Os testes na ordem do curso: o toque escutando só o Enter, o Enter, o toque escutando tudo. */
export const PASSOS_DOS_CONTROLES: readonly PassoDaSequencia[] = [
  { chave: 'start', metas: ['missing-touch'] },
  { chave: 'enter', metas: ['start-key'] },
  { chave: 'toque', metas: ['start-tap'] },
]

export const guia: GuiaLivre = {
  speech: CONTROLS_SPEECH,
  guidance: (_state, has, activity) =>
    falaDaSequencia({
      cena: 'controls',
      activity,
      has,
      passos: PASSOS_DOS_CONTROLES,
      fabrica: ['missing-touch', 'start-tap', 'start-key'],
      fimParcial: () => 'controls-complete-parcial',
    }) as FalaDosControles,
}
