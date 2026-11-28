import type { SceneAction, SceneId } from '../../../src/learning/scene'

export const pegar: SceneAction = { type: 'pick-shield' }
export const umSegundo: SceneAction = { type: 'tick-second' }
export const proximaPedra: SceneAction = { type: 'next-rock' }
export const voltarAoComeco: SceneAction = { type: 'restart-case' }

/**
 * ⭐ O escudo temporário (Poder "Escudo temporário" do Construtor, 28/11/2026), na ordem que o Zappy
 * sugere: a pedra do segundo 2 sem escudo, a pegada e a pedra do 5 com o Escudo em 2, o Escudo que
 * chega a 0 antes da pedra do 8, e a pegada de novo com o Escudo em 4.
 */
export const CAMINHOS_LIVRES_NAVE_ESCUDO: Partial<Record<SceneId, SceneAction[]>> = {
  'timed-shield': [
    proximaPedra,
    pegar,
    proximaPedra,
    umSegundo,
    umSegundo,
    proximaPedra,
    pegar,
    umSegundo,
    pegar,
  ],
}
