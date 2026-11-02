import type { SceneState } from '../state'
import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `jump-sound` em exploração livre (Corre Dino, Aula 4, 02/11/2026): só a IDEIA. O som
 * do pulo pode tocar em dois momentos: quando a tecla Espaço é apertada, ou quando o Dino pula. Os
 * nomes dos blocos (o efeito e os dois acontecimentos) ficam para a montagem do Estúdio. Antes de cada
 * teste a fala pergunta quantos sons e quantos pulos; o resultado (som sem pulo, pulo sem som, um som
 * em cada pulo) só vem na fala de DEPOIS. As chaves começam com `jump-sound-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-livre/jump-sound.tsx`): "Quando a tecla
 * Espaço é apertada", "Quando o Dino pula", "Apertar Espaço" e "Tocar para pular".
 */
export const JUMP_SOUND_SPEECH = {
  'jump-sound-key-mode':
    'Agora o som toca quando a tecla Espaço é apertada. Num pulo só, quantos sons tocam? Clique em Apertar Espaço e, com o Dino ainda no ar, clique em Apertar Espaço de novo. Conte os sons e os pulos na linha do tempo.',
  'jump-sound-in-air':
    'O Dino está no ar. Clique em Apertar Espaço de novo, antes de o Dino voltar ao chão, e conte os sons e os pulos na linha do tempo.',
  'jump-sound-false':
    'Com o som na tecla, cada aperto em Espaço tocou um som, mesmo com o Dino no ar: foram dois sons para um pulo só. E um pulo que não vem da tecla? Depois que o Dino voltar ao chão, clique em Tocar para pular e conte os sons.',
  'jump-sound-silent':
    'Com o som na tecla, o pulo pelo toque não tocou som nenhum: esse pulo não veio da tecla Espaço. E se a tecla for apertada duas vezes no mesmo pulo? Clique em Apertar Espaço e, com o Dino ainda no ar, clique de novo. Conte os sons e os pulos.',
  'jump-sound-key-done':
    'Com o som na tecla, apareceu som sem pulo e pulo sem som. E se o som tocar quando o Dino pula? Clique em Quando o Dino pula e repita os testes: Apertar Espaço duas vezes no mesmo pulo, e depois Tocar para pular. Conte os sons e os pulos.',
  'jump-sound-jump-mode':
    'Agora o som toca quando o Dino pula. Quantos sons em cada pulo? Clique em Apertar Espaço duas vezes no mesmo pulo e, depois que o Dino voltar ao chão, clique em Tocar para pular. Conte os sons e os pulos.',
  'jump-sound-key-sound':
    'Com o som no pulo, o pulo pela tecla Espaço veio com som. E o pulo pelo toque? Depois que o Dino voltar ao chão, clique em Tocar para pular e conte os sons.',
  'jump-sound-tap-sound':
    'Com o som no pulo, o pulo pelo toque veio com som. E o pulo pela tecla? Clique em Apertar Espaço duas vezes no mesmo pulo e conte os sons e os pulos.',
  'jump-sound-back-to-key':
    'Com o som no pulo, cada pulo teve o seu som, pela tecla e pelo toque. E se o som tocar quando a tecla Espaço é apertada? Clique em Quando a tecla Espaço é apertada e teste de novo: Apertar Espaço duas vezes no mesmo pulo, e depois Tocar para pular.',
  'jump-sound-settle':
    'Você já viu os dois momentos do som. No jogo, o som fica no pulo, para tocar uma vez em cada pulo. Clique em Quando o Dino pula para deixar assim.',
  'jump-sound-complete':
    'Você comparou os dois momentos do som. Na tecla, o som toca a cada aperto, até com o Dino no ar, e o pulo pelo toque fica sem som. No pulo, o som toca uma vez em cada pulo, venha da tecla ou do toque. Pode continuar testando.',
} as const

export type FalaDoSom = keyof typeof JUMP_SOUND_SPEECH

const METAS = ['false-sound', 'silent-jump', 'every-jump'] as const

/**
 * Qual fala vale agora. A ordem sugerida começa com o som na tecla (o caso da aula), mas quem leva o
 * som para o pulo primeiro é acompanhado, e o convite volta para a tecla depois. Com tudo visto, a
 * conclusão pede o som no pulo (`settled` do `evaluate`, quando a atividade cobra `every-jump`).
 */
export function jumpSoundGuidance(
  state: Pick<SceneState, 'flight' | 'sound'>,
  has: (meta: string) => boolean,
  feita: (meta: string) => boolean,
  cobraOPulo: boolean,
): FalaDoSom {
  const naTecla = !state.sound.onJump
  const noAr = state.flight.time !== null
  const teclaFeita = feita('false-sound') && feita('silent-jump')
  if (teclaFeita && feita('every-jump'))
    return naTecla && cobraOPulo ? 'jump-sound-settle' : 'jump-sound-complete'
  if (naTecla) {
    if (teclaFeita) return 'jump-sound-key-done'
    if (has('false-sound')) return 'jump-sound-false'
    if (noAr) return 'jump-sound-in-air'
    if (has('silent-jump')) return 'jump-sound-silent'
    return 'jump-sound-key-mode'
  }
  if (feita('every-jump')) return 'jump-sound-back-to-key'
  if (has('key-sound')) return 'jump-sound-key-sound'
  if (has('tap-sound')) return 'jump-sound-tap-sound'
  return 'jump-sound-jump-mode'
}

export const guia: GuiaLivre = {
  speech: JUMP_SOUND_SPEECH,
  guidance: (state, has, activity) => {
    const metas = activity.setup?.goals
    const cobraOPulo =
      !metas?.length || ['key-sound', 'tap-sound', 'every-jump'].some((m) => metas.includes(m))
    return jumpSoundGuidance(state, has, metaFeita(activity, METAS, has), cobraOPulo)
  },
}
