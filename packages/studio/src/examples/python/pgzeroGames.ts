import { PGZERO_EXTENSION } from '../../runtime/python/pgzero/contract'
import type { PythonExampleEntry } from '../pythonCatalog'
import { PGZERO_GAME_BLOCKS } from './pgzeroGames.blocks.generated'
import { PGZERO_GAME_LOADERS } from './pgzeroGames.loaders.generated'
import { PGZERO_GAMES } from './pgzeroGames.manifest'

/** Two presentations of the same Pygame Zero program, without loading sources or media here. */
export const PGZERO_GAME_EXAMPLES: readonly PythonExampleEntry[] = PGZERO_GAMES.flatMap(
  (game): PythonExampleEntry[] => {
    const shared = {
      programmingLanguage: 'python' as const,
      emoji: game.emoji,
      description: game.description,
      genre: game.genre,
      concepts: game.concepts,
      experience: game.experience,
      difficulty: game.difficulty,
      extensions: [{ id: PGZERO_EXTENSION.id, version: PGZERO_EXTENSION.version }],
      load: PGZERO_GAME_LOADERS[game.key],
    }
    return [
      {
        ...shared,
        key: `python:${game.key}:blocks`,
        name: `${game.name} (Blocos)`,
        kind: 'classic',
        mode: 'blocks',
        requiredBlockIds: PGZERO_GAME_BLOCKS[game.key].blockIds,
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
