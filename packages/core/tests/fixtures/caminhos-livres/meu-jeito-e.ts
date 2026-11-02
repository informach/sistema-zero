import type { SceneAction, SceneId } from '../../../src/learning/scene'

/** O tempo da criança vai em fatias de no máximo 1 s (`SESSION_LIMITS.advanceSeconds`). */
export const tempo = (segundos: number): SceneAction[] => {
  const fatias: SceneAction[] = []
  for (let resto = segundos; resto > 1e-9; resto -= 1)
    fatias.push({ type: 'advance', seconds: Math.min(1, Number(resto.toFixed(3))) })
  return fatias
}

/**
 * Um caminho de exploração livre que completa as metas de cada cena (os gestos da tela livre). Para o
 * conjunto das cenas do Construtor.
 */
export const CAMINHOS_LIVRES_MEU_JEITO_E: Partial<Record<SceneId, SceneAction[]>> = {
  'copy-vs-original': [
    { type: 'export-file' },
    { type: 'import-file' },
    { type: 'recolor', side: 'studio', color: 'rosa' },
  ],
  'published-copy': [
    { type: 'publish' },
    { type: 'recolor', side: 'project', color: 'rosa' },
    { type: 'publish' },
  ],
  'same-rules-new-skin': [
    { type: 'skin', theme: 'road' },
    { type: 'skin', theme: 'sea' },
    { type: 'rule-toggle', enabled: false },
    { type: 'play-shoot' },
    ...tempo(1.2),
  ],
  'sheet-vs-sprite': [
    { type: 'crop', width: 64 },
    { type: 'crop', width: 16 },
    { type: 'crop', width: 32 },
    { type: 'sprite', size: 88 },
  ],
  'two-clocks': [
    ...tempo(4.2),
    { type: 'birth-every', frames: 20 },
    { type: 'restart-case' },
    ...tempo(2.2),
    { type: 'birth-every', frames: 40 },
    { type: 'rate', perSecond: 16 },
    { type: 'restart-case' },
    ...tempo(3),
  ],
  'unique-names': [
    { type: 'toggle-block', present: false },
    { type: 'toggle-block', present: true },
    { type: 'name-field', name: 'nave' },
    { type: 'name-field', name: 'folha-nave' },
  ],
}
