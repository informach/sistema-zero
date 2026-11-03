import type { SceneAction, SceneId } from '../../../src/learning/scene'

/** Um segundo do relógio do placar (a `score` anda 1 quadro por segundo). */
export const segundo: SceneAction = { type: 'advance', seconds: 1 }
export const tocar: SceneAction = { type: 'start', input: 'tap' }
export const enter: SceneAction = { type: 'start', input: 'key' }
export const inicio: SceneAction = { type: 'home' }
export const escutarTudo = (enabled: boolean): SceneAction => ({
  type: 'connect',
  port: 'touch',
  enabled,
})
/** A distância do cacto e a área do Dino (em porcentagem, como a tela livre oferece). */
export const distancia = (distance: number): SceneAction => ({ type: 'move', distance })
export const area = (pct: number): SceneAction => ({ type: 'resize', width: (pct * 64) / 100 })
/** Aproximar de 10 em 10 a partir da abertura (149) até `ate`. */
export const aproximarAte = (ate: number): SceneAction[] =>
  Array.from({ length: Math.round((149 - ate) / 10) }, (_, i) => distancia(149 - 10 * (i + 1)))
export const ponto = (clock: 'frame' | 'second', guarded: boolean): SceneAction => ({
  type: 'score-place',
  clock,
  guarded,
})
export const somarMenosUm: SceneAction = { type: 'sum-minus-one' }
export const somar = (n: number): SceneAction[] => Array.from({ length: n }, () => somarMenosUm)
export const sinal = (operator: '>' | '=' | '<'): SceneAction => ({ type: 'compare-op', operator })
export const voltar: SceneAction = { type: 'restart-case' }
/** "Passar 5 segundos": o sorteio viaja no gesto (abaixo de 0,5 sai 0; de 0,5 para cima, −1). */
export const cincoSegundos = (unit: number): SceneAction => ({
  type: 'sample',
  kind: 'velocity',
  unit,
  guided: false,
})
export const pergunta = (enabled: boolean): SceneAction => ({
  type: 'connect',
  port: 'limit',
  enabled,
})

/**
 * Um caminho por cena que completa as metas de fábrica das cinco cenas do Corre Dino em exploração
 * livre (frente C, 02/11/2026). A `hitbox` serve às duas experiências (aulas 9 e 10): o caminho
 * passa pelas três metas.
 */
export const CAMINHOS_LIVRES_DINO_C: Partial<Record<SceneId, SceneAction[]>> = {
  controls: [tocar, enter, inicio, escutarTudo(true), tocar],
  hitbox: [...aproximarAte(49), area(80), distancia(39), area(40)],
  score: [
    ponto('frame', false),
    segundo,
    ponto('second', false),
    segundo,
    ponto('second', true),
    segundo,
    enter,
    segundo,
    { type: 'collide' },
    segundo,
  ],
  'number-line': [...somar(3), voltar, sinal('>'), ...somar(4), voltar, sinal('='), ...somar(4)],
  acceleration: [
    ...Array.from({ length: 5 }, () => cincoSegundos(0.1)),
    cincoSegundos(0.9),
    pergunta(false),
    cincoSegundos(0.1),
  ],
}
