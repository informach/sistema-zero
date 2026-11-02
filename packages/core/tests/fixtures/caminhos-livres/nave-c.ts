import type { SceneAction, SceneId } from '../../../src/learning/scene'

export const segundo: SceneAction = { type: 'advance', seconds: 1 }
export const segundos = (n: number): SceneAction[] => Array.from({ length: n }, () => segundo)
export const enter: SceneAction = { type: 'start', input: 'key' }
export const atirar: SceneAction = { type: 'shoot' }
export const lugar = (x: number): SceneAction => ({ type: 'place', x, y: 0 })
export const pergunta = (enabled: boolean): SceneAction => ({
  type: 'connect',
  port: 'condition',
  enabled,
})
export const tudoDeNovo = (enabled: boolean): SceneAction => ({
  type: 'connect',
  port: 'restart',
  enabled,
})

/**
 * Um caminho por cena que completa as metas da Nave na exploração livre (nenhum `advance` passa de
 * 1 s, o teto do comando da criança).
 */
export const CAMINHOS_LIVRES_NAVE_C: Partial<Record<SceneId, SceneAction[]>> = {
  variable: [
    { type: 'store', value: 0 },
    { type: 'change', by: 1 },
    { type: 'show', on: true },
  ],
  'fixed-vs-read': [
    atirar,
    lugar(600),
    atirar,
    { type: 'value-source', source: 'read' },
    atirar,
    lugar(200),
    atirar,
    { type: 'box-marks', on: true },
    atirar,
  ],
  'game-state': [
    ...segundos(2),
    pergunta(true),
    ...segundos(4),
    { type: 'start', input: 'tap' },
    ...segundos(2),
  ],
  // Jogar até bater, voltar à tela de início, começar com os asteroides herdados; depois, começar tudo de
  // novo no fim e apertar o Enter da abertura.
  restart: [enter, ...segundos(3), enter, enter, tudoDeNovo(true), enter, enter],
}
