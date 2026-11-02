import type { GuiaLivre } from './tipos'

/**
 * A experiência `cleanup` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. A ideia é "tirar do jogo os tiros que saíram da tela"; o grupo aparece como ideia (a
 * lista de tiros que o jogo guarda e move). O nome do bloco fica para a montagem do Estúdio. Antes do
 * teste, a fala pergunta e diz o que observar; o resultado (o tiro continua no grupo, ou sai dele) só
 * vem na fala de DEPOIS daquele teste. As chaves das falas começam com `cleanup-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-livre/cleanup.tsx`): "Passar 1 segundo",
 * "Tirar do jogo quem sai da tela" e "Parar de tirar do jogo quem sai da tela".
 */
export const CLEANUP_SPEECH = {
  'cleanup-start':
    'Os tiros sobem e saem pela borda de cima da tela. Quando um tiro sai da tela, ele sai também do jogo? Clique em Passar 1 segundo até dois tiros saírem. Observe a tela, os bastidores e o número de tiros no grupo, que é a lista de tiros que o jogo guarda.',
  'cleanup-on-first':
    'Agora o jogo tira quem sai da tela. O que você acha que acontece nos bastidores quando um tiro passa da borda de cima? Clique em Passar 1 segundo até dois tiros saírem e observe os bastidores e o número de tiros no grupo.',
  'cleanup-stored':
    'Os tiros sumiram da tela, mas continuaram no grupo: o jogo ainda guarda e move cada um, mesmo sem ninguém ver. E se o jogo tirar do grupo quem sai da tela? Clique em Tirar do jogo quem sai da tela e passe o tempo até mais dois tiros saírem. Compare os bastidores.',
  'cleanup-removed':
    'Tirando quem sai da tela, cada tiro que passou da borda de cima saiu do grupo e foi para os removidos. E sem isso, o que acontece com o tiro que sai da tela? Clique em Parar de tirar do jogo quem sai da tela e passe o tempo até dois tiros saírem. Observe os bastidores.',
  'cleanup-complete':
    'Você comparou os dois jeitos. Sair da tela não tira o tiro do jogo: ele continua no grupo, e o jogo segue cuidando dele à toa. Quem tira é o próprio jogo, quando está combinado tirar os tiros que passam da borda. Pode continuar testando quando quiser.',
} as const

export type FalaDaLimpeza = keyof typeof CLEANUP_SPEECH

/**
 * Qual fala vale agora. A ordem sugerida é a da aula (primeiro sem tirar ninguém), mas cada fala só
 * explica o que a criança JÁ testou: quem liga a limpeza antes é acompanhado nela.
 */
export function cleanupGuidance(
  state: { crowd: { cleanup: boolean } },
  has: (meta: string) => boolean,
): FalaDaLimpeza {
  const guardou = has('invisible-stored'),
    tirou = has('rule-removes')
  if (guardou && tirou) return 'cleanup-complete'
  if (guardou) return 'cleanup-stored'
  if (tirou) return 'cleanup-removed'
  return state.crowd.cleanup ? 'cleanup-on-first' : 'cleanup-start'
}

export const guia: GuiaLivre = {
  speech: CLEANUP_SPEECH,
  guidance: (state, has) => cleanupGuidance(state, has),
}
