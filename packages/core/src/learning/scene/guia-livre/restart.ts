import type { GuiaLivre } from './tipos'

/**
 * A experiência `restart` em exploração livre (Construtor, Nave contra Asteroides, 02/11/2026): só a
 * IDEIA. No fim da partida, o Enter pode só voltar para a tela de início (os asteroides da partida
 * anterior continuam na tela) ou começar tudo de novo (tudo volta ao começo: a tela sem asteroides e a
 * abertura). Nada de bloco, estado escrito como código, regra nem comando: os blocos ficam para a
 * montagem do Estúdio.
 *
 * Antes do teste, a fala pergunta e diz o que observar; o resultado só vem na fala de DEPOIS dele.
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/restart.tsx`): "Apertar Enter", "Só voltar
 * para a tela de início" e "Começar tudo de novo".
 */
export const RESTART_SPEECH = {
  'restart-start':
    'No fim da partida, o Enter pode só voltar para a tela de início ou começar tudo de novo. O que acontece com os asteroides da partida anterior? Escolha um jeito e clique em Apertar Enter para jogar.',
  'restart-screen-only':
    'Só voltando para a tela de início, os asteroides da partida anterior ficaram na tela, e a partida nova acabou na hora. E se o Enter começar tudo de novo? Escolha Começar tudo de novo, jogue até bater e, no fim, clique em Apertar Enter até começar outra partida. Observe os asteroides e a tela.',
  'restart-everything':
    'Começando tudo de novo, os asteroides saíram da tela e o jogo voltou para a tela de início: foi preciso outro Enter para jogar. E se o Enter só voltar para a tela de início? Escolha Só voltar para a tela de início, jogue até bater e, no fim, clique em Apertar Enter até começar outra partida. Observe os asteroides na tela.',
  'restart-complete':
    'Você comparou os dois jeitos. Só voltar para a tela de início troca a tela, mas deixa os asteroides da partida anterior na tela. Começar tudo de novo volta tudo ao começo: os asteroides saem da tela, a abertura volta, e a partida nova começa do zero. Pode continuar testando.',
} as const

export type FalaDoRecomeco = keyof typeof RESTART_SPEECH

export const guia: GuiaLivre = {
  speech: RESTART_SPEECH,
  guidance: (_state, has): FalaDoRecomeco => {
    const tela = has('screen-only'),
      tudo = has('back-to-menu')
    if (tela && tudo) return 'restart-complete'
    if (tela) return 'restart-screen-only'
    if (tudo) return 'restart-everything'
    return 'restart-start'
  },
}
