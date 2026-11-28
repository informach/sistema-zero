import type { SceneAction, SceneId } from '../../../src/learning/scene'

export const disparar: SceneAction = { type: 'boss-fire' }
export const guarda = (on: boolean): SceneAction => ({ type: 'boss-guard', on })
export const umQuadro: SceneAction = { type: 'boss-frame' }
export const recomecar: SceneAction = { type: 'boss-restart' }
export const lasers = (n: number): SceneAction[] => Array.from({ length: n }, () => disparar)

/**
 * ⭐ O chefão com resistência (Poder "Chefão com resistência" do Construtor, 28/11/2026), na ordem
 * que o Zappy sugere: um laser (a vida em 4), mais dois (a vida em 2), até o 0 (o chefão cai e o
 * placar ganha 10), e a comparação do prêmio: a guarda ligada (o placar fica) e, depois de recomeçar
 * com a guarda desligada, o placar que sobe a cada quadro.
 */
export const CAMINHOS_LIVRES_NAVE_CHEFAO: Partial<Record<SceneId, SceneAction[]>> = {
  'boss-health': [
    guarda(true),
    disparar,
    ...lasers(2),
    ...lasers(2),
    umQuadro,
    umQuadro,
    guarda(false),
    ...lasers(5),
    umQuadro,
  ],
}
