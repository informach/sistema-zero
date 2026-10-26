import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from '../../runtime/python/raylib/contract'
import type { PythonExampleEntry } from '../pythonCatalog'
import { RAYLIB_GAME_BLOCKS } from './raylibGames.blocks.generated'
import { RAYLIB_GAME_LOADERS } from './raylibGames.loaders.generated'
import { RAYLIB_GAMES, type RaylibGame } from './raylibGames.manifest'

const RAYLIB_EXTENSION_OF = { '2d': RAYLIB_2D_EXTENSION, '3d': RAYLIB_3D_EXTENSION } as const

/** Two presentations of the same Raylib program, without loading sources or media here. */
export const RAYLIB_GAME_EXAMPLES: readonly PythonExampleEntry[] = RAYLIB_GAMES.flatMap(
  (game): PythonExampleEntry[] => {
    const extension = RAYLIB_EXTENSION_OF[(game as RaylibGame).extension]
    const shared = {
      programmingLanguage: 'python' as const,
      emoji: game.emoji,
      description: game.description,
      genre: game.genre,
      concepts: game.concepts,
      experience: game.experience,
      difficulty: game.difficulty,
      extensions: [{ id: extension.id, version: extension.version }],
      load: RAYLIB_GAME_LOADERS[game.key],
    }
    return [
      {
        ...shared,
        key: `python:${game.key}:blocks`,
        name: `${game.name} (Blocos)`,
        kind: 'classic',
        mode: 'blocks',
        requiredBlockIds: RAYLIB_GAME_BLOCKS[game.key].blockIds,
      },
      {
        ...shared,
        key: `python:${game.key}:code`,
        name: `${game.name} (Código)`,
        kind: 'pro',
        mode: 'code',
      },
    ]
  },
)
