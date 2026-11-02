import { metaFeita } from '../atelie-metas'
import type { GuiaLivre } from '../tipos'

/**
 * A `restart` do Corre Dino em exploração livre (Aula 9, 02/11/2026): só a IDEIA. No fim da partida,
 * o toque na tela pode só voltar para a tela de início (os cactos da partida anterior continuam na
 * pista) ou começar tudo de novo (a pista vazia e a abertura de volta). Nada de bloco, de estado
 * escrito como código, regra nem comando: os blocos ficam para a montagem do Estúdio. A comparação
 * do fim é a do roteiro (arrumar as peças do tabuleiro antes de jogar de novo).
 *
 * As metas no modo livre: `screen-only` (a partida nova começou com os cactos da anterior) e
 * `clean-track` (o "começar tudo de novo" tirou os cactos e a partida nova começou limpa), em
 * qualquer ordem (o motor, `tocarNaTela`). `ended` só é cobrada se o bloco pedir.
 *
 * ⚠️ Os rótulos citados são os da tela livre do Dino (`scene-livre/dino/restart.tsx`): "Tocar na
 * tela", "Só voltar para a tela de início" e "Começar tudo de novo". Chaves `restart-dino-`.
 */
const speech = {
  'restart-dino-start':
    'No fim da partida, o toque pode só voltar para a tela de início ou começar tudo de novo. O que acontece com os cactos da partida anterior? Escolha um jeito e clique em Tocar na tela para jogar.',
  'restart-dino-screen-only':
    'Só voltando para a tela de início, os cactos da partida anterior ficaram na pista, e a partida nova acabou na hora, com uma batida. E se o toque começar tudo de novo? Escolha Começar tudo de novo, jogue até bater e, no fim, clique em Tocar na tela até começar outra partida. Observe a pista.',
  'restart-dino-everything':
    'Começando tudo de novo, os cactos saíram da pista, a abertura voltou, e a partida nova começou limpa. E se o toque só voltar para a tela de início? Escolha Só voltar para a tela de início, jogue até bater e, no fim, clique em Tocar na tela até começar outra partida. Observe os cactos na pista.',
  'restart-dino-complete':
    'Você comparou os dois jeitos. Só voltar para a tela de início troca a tela, mas deixa os cactos da partida anterior na pista, e a partida nova acaba na hora. Começar tudo de novo arruma tudo outra vez: a pista fica vazia, a abertura volta, e a partida nova começa do zero, como arrumar as peças de um jogo de tabuleiro antes de jogar de novo. Pode continuar testando.',
} as const

export type FalaDoRecomecoDino = keyof typeof speech

const METAS = ['ended', 'screen-only', 'clean-track'] as const

/**
 * A ordem sugerida é a do roteiro (só voltar, depois começar tudo de novo), mas cada fala só explica o
 * que a criança JÁ testou: quem começa tudo de novo primeiro compara depois com só voltar.
 */
function guidance(...[, has, activity]: Parameters<GuiaLivre['guidance']>) {
  const feita = metaFeita(activity, METAS, has)
  const tela = has('screen-only'),
    tudo = has('clean-track')
  if (feita('ended') && feita('screen-only') && feita('clean-track')) return 'restart-dino-complete'
  if (tela && !tudo) return 'restart-dino-screen-only'
  if (tudo && !tela) return 'restart-dino-everything'
  return 'restart-dino-start'
}

export const guia: GuiaLivre = { speech, guidance }
