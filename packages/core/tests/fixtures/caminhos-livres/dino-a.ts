import type { SceneAction, SceneId } from '../../../src/learning/scene'
import { quadros } from './nave-a'

export const segundo: SceneAction = { type: 'advance', seconds: 1 }
export const segundos = (n: number): SceneAction[] => Array.from({ length: n }, () => segundo)
/** Um quadro da `velocity` (o "Avançar 1 quadro" da tela). */
export const quadroDaVelocidade: SceneAction = { type: 'advance', seconds: 0.2 }
export const lado = (vx: number): SceneAction => ({ type: 'velocity', vx, vy: 0 })
export const tocar: SceneAction = { type: 'start', input: 'tap' }
export const comecarDeNovo = (enabled: boolean): SceneAction => ({
  type: 'connect',
  port: 'restart',
  enabled,
})
export const sortearLugar = (unit: number): SceneAction => ({
  type: 'sample',
  kind: 'position',
  unit,
  guided: false,
})
export const sortearVelocidade = (unit: number): SceneAction => ({
  type: 'sample',
  kind: 'velocity',
  unit,
  guided: false,
})

/**
 * ⭐ Um caminho de sucesso por cena do Corre Dino (frente A, 02/11/2026): as 12 experiências que usam
 * as cenas da Nave, na ordem que o Zappy sugere, sem `advance` acima de 1 s por ação. Cada caminho
 * começa por um gesto que não depende de onde a cena estava: a fixture compartilhada
 * (`free-exploration-paths.ts`) os põe DEPOIS dos caminhos da Nave da mesma cena
 * (`comOsCaminhosDoDino`), e o mesmo caminho precisa servir aos blocos dos dois cursos.
 */
export const CAMINHOS_LIVRES_DINO_A: Partial<Record<SceneId, SceneAction[]>> = {
  'once-vs-always': [
    // O Dino que anda (Aula 1): uma vez, no começo; depois sempre, em todo quadro.
    { type: 'place-in-area', card: 'move', area: 'outside' },
    { type: 'place-in-area', card: 'move', area: 'start' },
    ...quadros(3),
    { type: 'place-in-area', card: 'move', area: 'loop' },
    ...quadros(24),
    // O som do pulo (Aula 4): esperando a tecla, e a tecla.
    { type: 'place-in-area', card: 'event', area: 'outside' },
    { type: 'place-in-area', card: 'event', area: 'event' },
    ...quadros(5),
    { type: 'trigger' },
  ],
  // O Dino abre em x 110, y 150, numa tela de 480 × 270; o primeiro lugar arruma o y.
  coordinates: [
    { type: 'place', x: 0, y: 150 },
    { type: 'place', x: 200, y: 150 },
    { type: 'place', x: 200, y: 200 },
    { type: 'place', x: 0, y: 200 },
    { type: 'place', x: 0, y: 0 },
  ],
  world: [
    { type: 'create' },
    { type: 'connect', port: 'draw', enabled: true },
    { type: 'connect', port: 'draw', enabled: false },
  ],
  'draw-loop': [
    { type: 'loop', on: false },
    { type: 'erase', on: false },
    { type: 'advance', seconds: 0.25 },
    { type: 'loop', on: true },
    { type: 'advance', seconds: 0.25 },
    { type: 'erase', on: true },
    { type: 'advance', seconds: 0.25 },
  ],
  layers: [
    { type: 'layer', front: true },
    { type: 'layer', front: false },
    { type: 'layer', front: true },
  ],
  // Em todo quadro por 1 s; depois o relógio de 1,4 s até nascerem dois cactos.
  spawn: [
    { type: 'connect', port: 'timer', enabled: false },
    segundo,
    { type: 'connect', port: 'timer', enabled: true },
    { type: 'interval', seconds: 1.4 },
    ...segundos(3),
  ],
  // 5 por três quadros, −5 por três quadros, e o 0.
  velocity: [
    lado(5),
    quadroDaVelocidade,
    quadroDaVelocidade,
    quadroDaVelocidade,
    lado(-5),
    quadroDaVelocidade,
    quadroDaVelocidade,
    quadroDaVelocidade,
    lado(0),
    quadroDaVelocidade,
  ],
  // O caso abre com três cactos na pista: em 2 s, dois saem pela esquerda.
  cleanup: [
    { type: 'connect', port: 'cleanup', enabled: false },
    ...segundos(2),
    { type: 'connect', port: 'cleanup', enabled: true },
    ...segundos(2),
  ],
  'game-state': [
    { type: 'home' },
    { type: 'connect', port: 'condition', enabled: false },
    segundo,
    { type: 'connect', port: 'condition', enabled: true },
    ...segundos(3),
    tocar,
    segundo,
  ],
  // Só voltar: a partida nova começa com os cactos e acaba na hora. Depois, começar tudo de novo.
  restart: [
    comecarDeNovo(false),
    tocar,
    tocar,
    tocar,
    ...segundos(3),
    tocar,
    tocar,
    comecarDeNovo(true),
    tocar,
    tocar,
  ],
  variable: [
    { type: 'show', on: false },
    { type: 'store', value: 0 },
    { type: 'change', by: 1 },
    { type: 'show', on: true },
  ],
  // Sete lugares na régua: 0,1 e 0,12 caem no mesmo (500); 0,5 cai em 530.
  random: [
    sortearLugar(0.1),
    sortearLugar(0.5),
    sortearLugar(0.12),
    sortearVelocidade(0.1),
    sortearVelocidade(0.9),
  ],
}

/**
 * Os caminhos de uma fixture com os do Dino acrescentados no FIM da mesma cena: um caminho só serve
 * aos blocos da Nave e aos do Corre Dino (as metas guardadas não saem com os gestos seguintes).
 */
export function comOsCaminhosDoDino(
  base: Partial<Record<SceneId, SceneAction[]>>,
): Partial<Record<SceneId, SceneAction[]>> {
  return Object.fromEntries(
    Object.entries(CAMINHOS_LIVRES_DINO_A).map(([cena, dino]) => [
      cena,
      [...(base[cena as SceneId] ?? []), ...(dino ?? [])],
    ]),
  )
}
