import type { SceneAction, SceneId } from '../../../src/learning/scene'

export const tiroTriplo = (on: boolean): SceneAction => ({ type: 'spread-triple', on })
export const desvio = (deviation: 0 | 1 | 2): SceneAction => ({
  type: 'spread-deviation',
  deviation,
})
export const disparar: SceneAction = { type: 'spread-fire' }
export const chegarem: SceneAction = { type: 'spread-arrive' }
export const voltarAoComeco: SceneAction = { type: 'restart-case' }

/**
 * ⭐ O tiro triplo (Poder "Tiro triplo" do Construtor, 28/11/2026), na ordem que o Zappy sugere: o
 * tiro simples, o triplo com desvio 0, o leque com desvio 2 e o desvio 1 que passa entre as pedras.
 * No meio, um "Voltar ao começo" (as escolhas e as descobertas ficam).
 */
export const CAMINHOS_LIVRES_NAVE_TRIPLO: Partial<Record<SceneId, SceneAction[]>> = {
  'spread-shot': [
    disparar,
    chegarem,
    tiroTriplo(true),
    disparar,
    chegarem,
    voltarAoComeco,
    desvio(2),
    disparar,
    chegarem,
    desvio(1),
    disparar,
    chegarem,
  ],
}
