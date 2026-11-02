import type { SceneActivity } from '../index'
import type { SceneState } from '../state'
import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `spawn` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. A ideia é "uma pedra nova a cada tanto tempo": em todo quadro, ou depois de uma
 * espera de alguns quadros. O nome do bloco que cria a pedra e o do bloco que espera ficam para a
 * montagem do Estúdio. Antes do teste, a fala pergunta e diz o que observar; o resultado (a fileira
 * colada, o espaço entre as pedras, a mesma queda) só vem na fala de DEPOIS daquele teste.
 * As chaves das falas começam com `spawn-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-livre/spawn.tsx`): "Em todo quadro",
 * "De 20 em 20 quadros", "De 40 em 40 quadros", "De 80 em 80 quadros" e "Passar 1 segundo".
 */
export const SPAWN_SPEECH = {
  'spawn-start':
    'Neste jogo, as pedras nascem lá em cima e caem. Agora nasce uma pedra nova em todo quadro. Quantas pedras você acha que nascem em um segundo, e como elas ficam na tela? Clique em Passar 1 segundo e observe as pedras e quantas nasceram.',
  'spawn-wait':
    'Agora cada pedra nova espera alguns quadros para nascer. O que você acha que muda na tela? Deixe o tempo passar até nascerem duas pedras e observe onde cada uma aparece.',
  'spawn-wall':
    'Em todo quadro nasceu uma pedra nova: em um segundo foram umas trinta, uma colada na outra, como uma parede. E se cada pedra nova esperar alguns quadros para nascer? Escolha De 40 em 40 quadros e deixe o tempo passar até nascerem duas pedras. Observe as pedras.',
  'spawn-gap':
    'Com a espera, nasceu uma pedra de cada vez, e sobrou espaço entre uma e outra. E se uma pedra nova nascer em todo quadro, sem esperar? Escolha Em todo quadro, clique em Passar 1 segundo e observe as pedras.',
  'spawn-fall':
    'Você viu os dois jeitos: em todo quadro, as pedras saem coladas; com espera, sobra espaço. E a queda? Com mais pedras nascendo, cada pedra cai mais depressa? Escolha De 40 em 40 quadros e deixe passar uns 4 segundos; depois escolha De 20 em 20 quadros e deixe passar uns 3 segundos. Compare quanto a primeira pedra desceu em 60 quadros.',
  'spawn-fall-40':
    'De 40 em 40 quadros, a primeira pedra desceu 180 em 60 quadros. E de 20 em 20, com o dobro de pedras nascendo, quanto ela desce no mesmo tempo? Escolha De 20 em 20 quadros, deixe passar uns 3 segundos e compare.',
  'spawn-fall-20':
    'De 20 em 20 quadros, a primeira pedra desceu 180 em 60 quadros. E de 40 em 40, com a metade das pedras nascendo, quanto ela desce no mesmo tempo? Escolha De 40 em 40 quadros, deixe passar uns 4 segundos e compare.',
  'spawn-same-wall':
    'De 40 em 40 ou de 20 em 20, a primeira pedra desceu 180 em 60 quadros: cada pedra cai do mesmo jeito, o que muda é quantas nascem. Falta um teste: e se uma pedra nova nascer em todo quadro, sem esperar? Escolha Em todo quadro, clique em Passar 1 segundo e observe as pedras.',
  // O caso da Nave (02/11/2026) só pede os dois jeitos de nascer, sem medir a queda.
  'spawn-complete-two':
    'Você comparou os dois jeitos. Em todo quadro, nascem umas trinta pedras por segundo, coladas, como uma parede. Com uma espera de alguns quadros, nasce uma de cada vez, com espaço entre elas. Pode continuar testando quando quiser.',
  'spawn-complete':
    'Você comparou tudo. Em todo quadro, nascem umas trinta pedras por segundo, coladas. Com uma espera de alguns quadros, nasce uma de cada vez, com espaço entre elas, e quanto menor a espera, mais pedras. E cada pedra cai do mesmo jeito, 3 por quadro, nasça quando nascer. Pode continuar testando quando quiser.',
} as const

export type FalaDoNascimento = keyof typeof SPAWN_SPEECH

/**
 * Qual fala vale agora. A ordem sugerida é a da aula (em todo quadro, com espera, a queda), mas cada
 * fala só explica o que a criança JÁ testou: quem começa pela espera é acompanhado nela, e a queda
 * pode ser medida de 20 em 20 antes de 40 em 40.
 */
const METAS = ['every-frame', 'with-timer', 'same-fall'] as const

/**
 * ⚠️ Segue as metas do BLOCO (`metaFeita`): o caso da Nave não pede a queda, e sem isto o Zappy
 * seguia pedindo a medida depois de a experiência fechar.
 */
export function spawnGuidance(
  state: Pick<SceneState, 'crowd'>,
  has: (meta: string) => boolean,
  activity?: SceneActivity,
): FalaDoNascimento {
  const feita = activity ? metaFeita(activity, METAS, has) : has
  // `metaFeita` dá por feita a meta que o bloco não pede: a queda que não é pedida não se mede.
  const pedeQueda = has('same-fall') || !feita('same-fall')
  const parede = feita('every-frame'),
    espera = feita('with-timer'),
    queda = has('same-fall')
  if (!pedeQueda && parede && espera) return 'spawn-complete-two'
  if (parede && espera && queda) return 'spawn-complete'
  if (!parede && !espera) return state.crowd.timer ? 'spawn-wait' : 'spawn-start'
  if (!espera) return 'spawn-wall'
  if (!parede) return queda ? 'spawn-same-wall' : 'spawn-gap'
  const de40 = state.crowd.fallBaseline !== undefined
  const de20 = state.crowd.fallComparison !== undefined
  if (de40 && !de20) return 'spawn-fall-40'
  if (de20 && !de40) return 'spawn-fall-20'
  return 'spawn-fall'
}

export const guia: GuiaLivre = {
  speech: SPAWN_SPEECH,
  guidance: (state, has, activity) => spawnGuidance(state, has, activity),
}
