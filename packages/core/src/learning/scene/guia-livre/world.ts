import type { SceneState } from '../state'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `world` em exploração livre (Construtor, 02/11/2026): só a IDEIA ("existir no jogo" ×
 * "aparecer na tela", os bastidores e o palco) e o convite à investigação. Antes do teste, a fala
 * pergunta e diz o que observar; o resultado só vem depois. As chaves das falas começam com `world-`.
 * Nada de nome de bloco, regra, Se, então nem senão.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/world.tsx`): "Criar a nave nos bastidores",
 * "Mostrar a nave na tela" e "Tirar a nave da tela". As falas são estáticas e falam da nave, o elenco
 * da Primeira nave.
 */
const speech = {
  'world-start':
    'Os bastidores e a tela do jogo estão vazios. O que você acha que acontece na tela quando a nave passa a existir no jogo? Clique em Criar a nave nos bastidores e compare os dois lados.',
  'world-created':
    'A nave passou a existir nos bastidores, com nome e lugar, e a tela do jogo continuou vazia: existir no jogo não é o mesmo que aparecer na tela. E para aparecer, o que muda? Clique em Mostrar a nave na tela e compare os dois lados.',
  'world-shown':
    'A mesma nave que já existia nos bastidores agora aparece na tela do jogo, no mesmo lugar. E se você tirar a nave da tela, ela deixa de existir? Clique em Tirar a nave da tela e observe os bastidores.',
  'world-complete':
    'A nave saiu da tela e continuou nos bastidores: ela existe no jogo mesmo sem aparecer. Existir é estar nos bastidores; aparecer é estar no palco, a tela do jogo. Pode mostrar e tirar a nave quantas vezes quiser.',
} as const

export type FalaDoMundo = keyof typeof speech

function guidance(state: SceneState, has: (meta: string) => boolean): FalaDoMundo {
  const { created, drawn } = state.world
  if (!created) return 'world-start'
  if (!has('visible')) return 'world-created'
  return drawn ? 'world-shown' : 'world-complete'
}

export const guia: GuiaLivre = { speech, guidance }
