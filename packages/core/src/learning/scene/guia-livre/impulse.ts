import type { SceneState } from '../state'
import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `impulse` em exploração livre (Corre Dino, Aula 3, 02/11/2026): só a IDEIA. O impulso
 * é a força que começa o pulo; a gravidade é a mesma em todos os saltos. O campo do bloco que guarda a
 * força do pulo fica para a montagem do Estúdio. Antes de cada salto a fala pergunta e diz o que
 * observar (a marca da altura); se a marca fica mais alta ou mais baixa só vem na fala de DEPOIS.
 * As chaves começam com `impulse-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-livre/impulse.tsx`): "Impulso 5",
 * "Impulso 9", "Impulso 14" e "Pular". A marca de antes (azul) e a deste salto (laranja) ficam no palco.
 */
export const IMPULSE_SPEECH = {
  'impulse-start':
    'O impulso é a força que começa o pulo, e agora o impulso escolhido é o número aceso. Até onde o Dino chega com esse impulso? Clique em Pular, espere o salto terminar e observe a marca da altura.',
  'impulse-flying':
    'O salto está acontecendo. Espere o Dino voltar ao chão e observe onde a marca da altura fica.',
  'impulse-first':
    'O Dino subiu, parou no alto e voltou ao chão, e a marca guardou a altura desse salto. E com outro impulso, a marca muda? Clique em Impulso 14 e depois em Pular, e compare a marca nova com a de antes.',
  'impulse-first-14':
    'O Dino subiu, parou no alto e voltou ao chão, e a marca guardou a altura desse salto. E com outro impulso, a marca muda? Clique em Impulso 9 e depois em Pular, e compare a marca nova com a de antes.',
  'impulse-chosen':
    'O próximo salto vai ter outro impulso. A gravidade continua a mesma. Clique em Pular, espere o salto terminar e compare a marca nova com a marca de antes.',
  'impulse-same':
    'Com o mesmo impulso, a marca nova ficou na mesma altura da marca de antes. Para comparar, escolha outro impulso: clique em Impulso 14 e depois em Pular.',
  'impulse-same-14':
    'Com o mesmo impulso, a marca nova ficou na mesma altura da marca de antes. Para comparar, escolha outro impulso: clique em Impulso 9 e depois em Pular.',
  'impulse-small':
    'As duas marcas ficaram em alturas diferentes: trocar o impulso mudou a altura do salto. E com o impulso mais forte que a tela oferece? Clique em Impulso 14, depois em Pular, e compare as marcas.',
  'impulse-complete':
    'Você comparou duas marcas. Com mais impulso, o Dino começa o pulo com mais força, e a marca fica bem mais alta: com 14, a marca subiu bem acima da marca de antes. A gravidade foi a mesma nos dois saltos; o que mudou foi a força do começo do pulo. É como pular numa cama elástica. Pode continuar testando.',
} as const

export type FalaDoImpulso = keyof typeof IMPULSE_SPEECH

const METAS = ['first-height', 'other-height'] as const

/**
 * Qual fala vale agora. A ordem sugerida é 9 e depois 14, mas quem começa pelo 14 é convidado ao 9, e
 * quem compara 5 com 9 vê as marcas diferentes e é convidado ao 14 (a marca que a meta compara).
 */
export function impulseGuidance(
  state: Pick<SceneState, 'flight'>,
  feita: (meta: string) => boolean,
): FalaDoImpulso {
  const f = state.flight
  if (METAS.every(feita)) return 'impulse-complete'
  if (f.time !== null) return 'impulse-flying'
  if (!feita('first-height')) return 'impulse-start'
  if (f.force !== f.atForce) return 'impulse-chosen'
  const forte = f.atForce >= 14
  if (f.before > 0 && Math.abs(f.beforeForce - f.atForce) < 1)
    return forte ? 'impulse-same-14' : 'impulse-same'
  if (f.before > 0) return 'impulse-small'
  return forte ? 'impulse-first-14' : 'impulse-first'
}

export const guia: GuiaLivre = {
  speech: IMPULSE_SPEECH,
  guidance: (state, has, activity) => impulseGuidance(state, metaFeita(activity, METAS, has)),
}
