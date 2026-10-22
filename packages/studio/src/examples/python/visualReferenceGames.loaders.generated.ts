// Gerado por scripts/gen-python-text-sources.ts. Não edite este arquivo.
// Fonte: src/examples/python/visualReferenceGames.manifest.ts
import type { VisualReferenceGameKey } from './visualReferenceGames.manifest'

export const VISUAL_REFERENCE_GAME_LOADERS = {
  'pacman-visual': async () => {
    const [{ PACMAN_VISUAL_SOURCES }, { PACMAN_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./pacmanVisual.sources.generated'),
        import('./pacmanVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: PACMAN_VISUAL_SOURCES,
      assets: referenceGameAssets('pacman-visual', PACMAN_VISUAL_AUDIO),
    }
  },
  'space-arena-visual': async () => {
    const [{ SPACE_ARENA_VISUAL_SOURCES }, { SPACE_ARENA_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./spaceArenaVisual.sources.generated'),
        import('./spaceArenaVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: SPACE_ARENA_VISUAL_SOURCES,
      assets: referenceGameAssets('space-arena-visual', SPACE_ARENA_VISUAL_AUDIO),
    }
  },
  'snake-visual': async () => {
    const [{ SNAKE_VISUAL_SOURCES }, { SNAKE_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./snakeVisual.sources.generated'),
        import('./snakeVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: SNAKE_VISUAL_SOURCES,
      assets: referenceGameAssets('snake-visual', SNAKE_VISUAL_AUDIO),
    }
  },
} satisfies Record<VisualReferenceGameKey, () => Promise<unknown>>
