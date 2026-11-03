import type { SceneAction, SceneId } from '../../../src/learning/scene'

export const segundo: SceneAction = { type: 'advance', seconds: 1 }
export const segundos = (n: number): SceneAction[] => Array.from({ length: n }, () => segundo)
export const borda = (visible: boolean): SceneAction => ({ type: 'border', visible })
export const tela = (width: number, height: number): SceneAction => ({
  type: 'stage',
  width,
  height,
})
export const ouvir: SceneAction = { type: 'listen' }
export const escrever = (text: string): SceneAction => ({ type: 'describe', text })
export const FRASE = 'Corra com o dino e pule os cactos apertando espaço'
export const pular: SceneAction = { type: 'jump', input: 'tap' }
export const espaco: SceneAction = { type: 'jump', input: 'key' }
export const gravidade = (enabled: boolean): SceneAction => ({
  type: 'connect',
  port: 'gravity',
  enabled,
})
export const impulso = (force: number): SceneAction => ({ type: 'impulse', force })
export const somNoPulo = (enabled: boolean): SceneAction => ({
  type: 'connect',
  port: 'sound',
  enabled,
})
/** Um instante com o Dino no ar, para o segundo Espaço cair no mesmo pulo. */
export const instante: SceneAction = { type: 'advance', seconds: 0.2 }

/**
 * ⭐ Um caminho de sucesso por cena do Corre Dino (frente B, 02/11/2026), na ordem que o Zappy
 * sugere, sem `advance` acima de 1 s por ação (`SESSION_LIMITS`). Os testes do core e do
 * member-shell importam daqui.
 */
export const CAMINHOS_LIVRES_DINO_B: Partial<Record<SceneId, SceneAction[]>> = {
  'stage-size': [borda(true), tela(600, 480), tela(480, 480), tela(480, 270)],
  'screen-reader': [ouvir, escrever(FRASE), ouvir],
  // Sem gravidade o Dino passa de 360 em 1,33 s; ligada no ar, ele volta em 2 s.
  gravity: [pular, ...segundos(2), gravidade(true), ...segundos(3)],
  // O salto de 9 dura 1 s e o de 14, 1,56 s.
  impulse: [pular, ...segundos(2), impulso(14), pular, ...segundos(2)],
  'jump-sound': [
    espaco,
    instante,
    espaco,
    ...segundos(2),
    pular,
    ...segundos(2),
    somNoPulo(true),
    espaco,
    ...segundos(2),
    pular,
    ...segundos(2),
  ],
}
