import type { PythonExampleEntry } from '../pythonCatalog'
import { VISUAL_REFERENCE_GAME_BLOCKS } from './visualReferenceGames.blocks.generated'
import { VISUAL_REFERENCE_GAME_LOADERS } from './visualReferenceGames.loaders.generated'
import { VISUAL_REFERENCE_GAMES } from './visualReferenceGames.manifest'

/** Two presentations of the same authored program, without loading sources or media here. */
export const VISUAL_REFERENCE_GAME_EXAMPLES: readonly PythonExampleEntry[] =
  VISUAL_REFERENCE_GAMES.flatMap((game): PythonExampleEntry[] => {
    const shared = {
      programmingLanguage: 'python' as const,
      emoji: game.emoji,
      description: game.description,
      genre: game.genre,
      concepts: game.concepts,
      experience: game.experience,
      difficulty: game.difficulty,
      extensions: [{ id: 'python-turtle', version: '1.0.0' }],
      requiredProvidedModules: [{ importName: 'sz_audio', version: '1.0.0' }],
      load: VISUAL_REFERENCE_GAME_LOADERS[game.key],
      requiredPythonFeatures: game.requiredPythonFeatures,
    }
    return [
      {
        ...shared,
        key: `python:${game.key}:blocks`,
        name: `${game.name} (Blocos)`,
        kind: 'classic',
        mode: 'blocks',
        requiredBlockIds: VISUAL_REFERENCE_GAME_BLOCKS[game.key].blockIds,
      },
      {
        ...shared,
        key: `python:${game.key}:code`,
        name: `${game.name} (Código)`,
        kind: 'pro',
        mode: 'code',
      },
    ]
  })
