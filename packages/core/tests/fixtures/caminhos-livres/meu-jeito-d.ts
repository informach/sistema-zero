import type { SceneAction, SceneId } from '../../../src/learning/scene'

/** O relógio em fatias de até 1 s, como o ▶ da criança manda (`SESSION_LIMITS.advanceSeconds`). */
export const tempo = (seconds: number): SceneAction => ({ type: 'advance', seconds })
export const lupa = (zoom: number): SceneAction => ({ type: 'inspect', kind: 'pixel', zoom })
export const asa: SceneAction = { type: 'trace', piece: 'asa' }
export const espelho = (mode: 'off' | 'x' | 'y' | 'xy'): SceneAction => ({
  type: 'mirror-mode',
  mode,
})
export const balde: SceneAction = { type: 'fill' }
export const sombra = (on: boolean): SceneAction => ({ type: 'shade', on })
export const sol = (side: 'left' | 'right'): SceneAction => ({ type: 'light', side })
export const tinta = (part: 'fill' | 'stroke', on: boolean): SceneAction => ({
  type: 'ink',
  part,
  on,
})
export const quadro = (index: 1 | 2): SceneAction => ({ type: 'frame', index })
export const previa = (on: boolean): SceneAction => ({ type: 'play', on })
export const velocidade = (perSecond: number): SceneAction => ({ type: 'rate', perSecond })
export const iguais = (on: boolean): SceneAction => ({ type: 'same-frames', on })
export const fantasma = (on: boolean): SceneAction => ({ type: 'onion', on })
export const fogo = (offset: number): SceneAction => ({ type: 'shift', offset })
export const cratera = (amount: number): SceneAction => ({
  type: 'nudge',
  piece: 'crater',
  amount,
})
export const pedra = (amount: number): SceneAction => ({ type: 'nudge', piece: 'body', amount })

/**
 * O caminho que a fala do Zappy conduz, em exploração livre, até completar as metas de cada bloco do
 * Meu Jeito. Cada gesto é um botão da tela livre (`scene-livre/<cena>.tsx`).
 */
export const CAMINHOS_LIVRES_MEU_JEITO_D: Partial<Record<SceneId, SceneAction[]>> = {
  'pixel-vector': [lupa(2), lupa(3), lupa(4), lupa(5), lupa(6), lupa(5), lupa(4), lupa(3), lupa(2)],
  symmetry: [asa, espelho('x'), asa, espelho('y'), asa, espelho('x'), balde],
  shading: [sombra(true), sombra(false), sombra(true), sol('right')],
  // ⚠️ Voltar a cor do Contorno (o pedido da segunda fala) já é ver as duas partes juntas de novo:
  // `both` cai ali, antes da fala dele.
  'fill-stroke': [tinta('stroke', false), tinta('stroke', true), tinta('fill', false)],
  frames: [
    quadro(2),
    velocidade(8),
    previa(true),
    tempo(0.5),
    previa(false),
    velocidade(2),
    previa(true),
    tempo(1),
    iguais(true),
    velocidade(8),
    tempo(0.5),
  ],
  'onion-skin': [quadro(2), fogo(36), fantasma(true), fogo(32), fogo(28)],
  'motion-amount': [previa(true), tempo(0.5), cratera(4), tempo(0.5), pedra(10), tempo(0.5)],
}
