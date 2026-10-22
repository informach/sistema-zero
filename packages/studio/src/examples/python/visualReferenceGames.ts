import type { StudioPythonRuntimeFeature } from '@sistemazero/core/studio/python-runtime-features'
import type { PythonExampleEntry } from '../pythonCatalog'
import { VISUAL_REFERENCE_GAME_BLOCKS } from './visualReferenceGames.blocks.generated'

/** Two presentations of the same authored program, without loading sources or media here. */
function presentations(
  key: keyof typeof VISUAL_REFERENCE_GAME_BLOCKS,
  name: string,
  emoji: string,
  description: string,
  genre: string,
  concepts: readonly string[],
  load: PythonExampleEntry['load'],
  requiredPythonFeatures: readonly StudioPythonRuntimeFeature[] = [],
): readonly PythonExampleEntry[] {
  const shared = {
    programmingLanguage: 'python' as const,
    emoji,
    description,
    genre,
    concepts,
    experience: 'game' as const,
    difficulty: 'advanced' as const,
    extensions: [{ id: 'python-turtle', version: '1.0.0' }],
    requiredProvidedModules: [{ importName: 'sz_audio', version: '1.0.0' }],
    load,
    requiredPythonFeatures,
  }
  return [
    {
      ...shared,
      key: `python:${key}:blocks`,
      name: `${name} (Blocos)`,
      kind: 'classic',
      mode: 'blocks',
      requiredBlockIds: VISUAL_REFERENCE_GAME_BLOCKS[key].blockIds,
    },
    { ...shared, key: `python:${key}:code`, name: `${name} (Código)`, kind: 'pro', mode: 'code' },
  ]
}

export const VISUAL_REFERENCE_GAME_EXAMPLES: readonly PythonExampleEntry[] = [
  ...presentations(
    'pacman-visual',
    'Pac-Man',
    '🟡',
    'Explore o labirinto, recolha pontos e escape de sete fantasmas. Programa inteiro editável.',
    'Labirinto',
    ['Blocos', 'Ponte', 'Código', 'Funções', 'Listas', 'Colisões', 'Eventos', 'Som'],
    async () => (await import('./pacmanVisualPayload')).pacmanVisualPayload,
    ['turtle-compound-shapes'],
  ),
  ...presentations(
    'space-arena-visual',
    'Space Arena',
    '🚀',
    'Pilote com inércia, enfrente inimigos e explore a arena com câmera e radar. Programa inteiro editável.',
    'Nave espacial',
    ['Blocos', 'Ponte', 'Código', 'Funções', 'Física', 'Partículas', 'Câmera', 'Som'],
    async () => (await import('./spaceArenaVisualPayload')).spaceArenaVisualPayload,
  ),
]
