import type { GuiaLivre } from './tipos'

/**
 * A experiência `game-state` em exploração livre (Construtor, Nave contra Asteroides, 02/11/2026):
 * só a IDEIA. A cada toque do relógio, o jogo pode fazer uma pergunta antes de criar um asteroide:
 * a partida já começou? Sim, cria; não, espera. É a pergunta da porta do Farol, agora sobre o
 * estado do jogo (tela de início ou jogando). Nada de bloco, Se, então, senão nem código: os blocos
 * ficam para a montagem do Estúdio.
 *
 * Antes do teste, a fala pergunta e diz o que observar; o resultado só vem na fala de DEPOIS dele.
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/game-state.tsx`): "Ligar a pergunta",
 * "Desligar a pergunta", "Deixar o tempo passar", "Começar a partida" e "Voltar à tela de início".
 * ⚠️ "uns 4 segundos" é o caso da Nave (`pedra-40-quadros`, o único curso que usa a cena livre).
 */
export const GAME_STATE_SPEECH = {
  'game-state-start':
    'A nave está na tela de início, e a partida ainda não começou. Os asteroides já nascem agora? Clique em Deixar o tempo passar e observe o contador de asteroides criados.',
  'game-state-start-question':
    'A pergunta está ligada: a cada toque do relógio, o jogo pergunta se a partida já começou. Na tela de início, o que acontece com os asteroides? Deixe o tempo passar uns 4 segundos e observe o contador de asteroides criados.',
  'game-state-outside':
    'Sem a pergunta, os asteroides nasceram na tela de início, antes de a partida começar. E se, a cada toque do relógio, o jogo perguntar: a partida já começou? Clique em Ligar a pergunta e deixe o tempo passar uns 4 segundos na tela de início. Observe o contador.',
  'game-state-waiting':
    'Na tela de início, a resposta foi não: o relógio tocou, e nenhum asteroide nasceu. E quando a partida começar, qual vai ser a resposta? Clique em Começar a partida, deixe o tempo passar e observe o contador.',
  'game-state-playing-first':
    'Jogando, a resposta foi sim: os asteroides nasceram. E na tela de início, com a mesma pergunta ligada, o que acontece? Clique em Voltar à tela de início e deixe o tempo passar uns 4 segundos. Observe o contador.',
  'game-state-without':
    'Com a pergunta ligada, a tela de início esperou, e a partida criou asteroides. E sem a pergunta, o que acontece na tela de início? Clique em Desligar a pergunta e, se precisar, em Voltar à tela de início; depois, deixe o tempo passar. Observe o contador.',
  'game-state-complete':
    'Você comparou os três casos. Sem a pergunta, os asteroides nascem até na tela de início. Com a pergunta, a cada toque do relógio o jogo confere o estado: se a partida já começou, a resposta é sim, e nasce um asteroide; se ainda não começou, a resposta é não, e nada nasce. Pode continuar testando.',
} as const

export type FalaDoEstado = keyof typeof GAME_STATE_SPEECH

export const guia: GuiaLivre = {
  speech: GAME_STATE_SPEECH,
  /**
   * A ordem sugerida é a do curso (sem a pergunta, com a pergunta no início, jogando), mas cada fala
   * só explica o que a criança JÁ testou: quem liga a pergunta primeiro compara depois sem ela.
   */
  guidance: (state, has): FalaDoEstado => {
    const sem = has('outside'),
      espera = has('waiting'),
      jogando = has('playing')
    if (sem && espera && jogando) return 'game-state-complete'
    if (!sem && !espera && !jogando)
      return state.match.guarded ? 'game-state-start-question' : 'game-state-start'
    if (!espera) return jogando ? 'game-state-playing-first' : 'game-state-outside'
    if (!jogando) return 'game-state-waiting'
    return 'game-state-without'
  },
}
