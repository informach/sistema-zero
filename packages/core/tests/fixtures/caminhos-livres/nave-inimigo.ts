import type {
  EnemyFireOrigin,
  EnemyFireShipX,
  SceneAction,
  SceneId,
} from '../../../src/learning/scene'

export const origem = (origin: EnemyFireOrigin): SceneAction => ({ type: 'enemy-origin', origin })
export const nave = (x: EnemyFireShipX): SceneAction => ({ type: 'enemy-ship', x })
export const meioSegundo: SceneAction = { type: 'enemy-tick' }
export const proximoTiro: SceneAction = { type: 'enemy-next-shot' }
export const recomecar: SceneAction = { type: 'enemy-restart' }

/**
 * ⭐ O inimigo que atira (Poder "Inimigo que atira" do Construtor, 28/11/2026), na ordem que o Zappy
 * sugere: dois tiros com a origem No meio (a inimiga em 600 e em 300), dois com a origem Na inimiga
 * (400 e 500), meio segundo a mais (os tiros do meio já encostaram na nave do meio) e, com tiros no
 * ar, Recomeçar a partida.
 */
export const CAMINHOS_LIVRES_NAVE_INIMIGO: Partial<Record<SceneId, SceneAction[]>> = {
  'enemy-fire': [
    proximoTiro,
    proximoTiro,
    origem('enemy'),
    proximoTiro,
    proximoTiro,
    meioSegundo,
    recomecar,
  ],
}
