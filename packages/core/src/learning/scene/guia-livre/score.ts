import { falaDaSequencia, type PassoDaSequencia } from './dino-sequencia'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `score` em exploração livre (Corre Dino, aula 11, 02/11/2026): só a IDEIA. O ponto
 * pode somar a cada quadro ou a cada segundo, e a qualquer hora ou só quando o jogo pergunta
 * "estamos jogando agora?" e a resposta é sim. Nada de "Somar ponto", "A cada quadro do jogo", Se nem
 * "o estado do jogo é jogando": os blocos ficam para a montagem do Estúdio.
 *
 * Antes do teste, a fala pergunta e diz o que observar; o resultado só vem na fala de DEPOIS dele.
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/score.tsx`): "A cada quadro", "A cada
 * segundo", "Ligar a pergunta", "Desligar a pergunta", "Passar 1 segundo", "Começar a partida",
 * "Terminar a partida" e "Voltar à tela de início".
 * ⚠️ Trocar o lugar do ponto ou ligar a pergunta zera o placar (o motor recomeça a fileira).
 */
export const SCORE_SPEECH = {
  'score-start':
    'O placar está em 0, na tela de início. E se o ponto somar a cada quadro: quantos pontos entram em um segundo? Com a pergunta desligada, clique em A cada quadro e depois em Passar 1 segundo. Observe o placar.',
  'score-solto':
    'Em um segundo passam 60 quadros, e entraram 60 pontos: a cada quadro, o placar dispara. E a cada segundo, sem a pergunta, o que acontece na tela de início, antes de a partida começar? Clique em A cada segundo e, com a pergunta desligada e na tela de início, clique em Passar 1 segundo. Observe o placar.',
  'score-solto-first':
    'E a cada segundo, sem a pergunta, o que acontece na tela de início, antes de a partida começar? Clique em A cada segundo e, com a pergunta desligada e na tela de início, clique em Passar 1 segundo. Observe o placar.',
  'score-espera':
    'Sem a pergunta, o placar cresceu na tela de início, antes de alguém jogar. E se, a cada segundo, o jogo perguntar: estamos jogando agora? Clique em Ligar a pergunta e, ainda na tela de início, clique em Passar 1 segundo. Observe o placar.',
  'score-jogando':
    'Com a pergunta, na tela de início a resposta foi não, e o placar esperou. E durante a partida, qual vai ser a resposta? Com a pergunta ligada, clique em Começar a partida e depois em Passar 1 segundo. Observe o placar. Caso a partida já tenha terminado, clique antes em Voltar à tela de início.',
  'score-jogando-first':
    'Com a pergunta ligada, o que acontece com o placar durante a partida? Clique em Começar a partida e depois em Passar 1 segundo. Observe o placar. Caso a partida já tenha terminado, clique antes em Voltar à tela de início.',
  'score-fim':
    'Jogando, a resposta foi sim, e o placar cresceu um ponto a cada segundo. E quando a partida termina, o que acontece com o placar? Com a pergunta ligada, clique em Terminar a partida e depois em Passar 1 segundo. Observe o placar.',
  'score-complete':
    'Você comparou os jeitos de somar. A cada quadro, o placar dispara: 60 pontos por segundo. A cada segundo e sem a pergunta, ele cresce até na tela de início. Com a pergunta, a cada segundo o jogo confere se estamos jogando: no início e no fim a resposta é não, e o placar espera; jogando, a resposta é sim, e entra um ponto por segundo. Pode continuar testando.',
  'score-complete-parcial':
    'Você fez os testes que esta experiência pede. Pode continuar testando: troque quando o ponto soma, ligue e desligue a pergunta e passe pelas três telas.',
} as const

export type FalaDoPlacar = keyof typeof SCORE_SPEECH

/** Os testes na ordem do curso. Os apelidos de caso (`score-waiting`, `score-kept`) contam no passo deles. */
export const PASSOS_DO_PLACAR: readonly PassoDaSequencia[] = [
  { chave: 'start', metas: ['score-runaway'] },
  { chave: 'solto', metas: ['score-idle-wrong'] },
  // O início que espera é COMPARAÇÃO: só cai depois de ver o placar solto crescer no início.
  // ⚠️ Por isso não há `score-espera-first`, como não há `score-fim-first`.
  { chave: 'espera', metas: ['score-start', 'score-waiting'], requer: 'solto' },
  { chave: 'jogando', metas: ['score-playing'] },
  // O fim parado também é comparação: só depois de ver os pontos crescerem jogando.
  { chave: 'fim', metas: ['score-end', 'score-kept'], requer: 'jogando' },
]

export const guia: GuiaLivre = {
  speech: SCORE_SPEECH,
  guidance: (_state, has, activity) =>
    falaDaSequencia({
      cena: 'score',
      activity,
      has,
      passos: PASSOS_DO_PLACAR,
      fabrica: ['score-runaway', 'score-idle-wrong', 'score-start', 'score-playing', 'score-end'],
      fimParcial: () => 'score-complete-parcial',
    }) as FalaDoPlacar,
}
