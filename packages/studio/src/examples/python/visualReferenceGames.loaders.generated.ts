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
  'pong-visual': async () => {
    const [{ PONG_VISUAL_SOURCES }, { PONG_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./pongVisual.sources.generated'),
        import('./pongVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: PONG_VISUAL_SOURCES,
      assets: referenceGameAssets('pong-visual', PONG_VISUAL_AUDIO),
    }
  },
  'tron-visual': async () => {
    const [{ TRON_VISUAL_SOURCES }, { TRON_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./tronVisual.sources.generated'),
        import('./tronVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: TRON_VISUAL_SOURCES,
      assets: referenceGameAssets('tron-visual', TRON_VISUAL_AUDIO),
    }
  },
  'flappy-visual': async () => {
    const [{ FLAPPY_VISUAL_SOURCES }, { FLAPPY_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./flappyVisual.sources.generated'),
        import('./flappyVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: FLAPPY_VISUAL_SOURCES,
      assets: referenceGameAssets('flappy-visual', FLAPPY_VISUAL_AUDIO),
    }
  },
  'spinner-visual': async () => {
    const [{ SPINNER_VISUAL_SOURCES }, { SPINNER_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./spinnerVisual.sources.generated'),
        import('./spinnerVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: SPINNER_VISUAL_SOURCES,
      assets: referenceGameAssets('spinner-visual', SPINNER_VISUAL_AUDIO),
    }
  },
  'tictactoe-visual': async () => {
    const [{ TICTACTOE_VISUAL_SOURCES }, { TICTACTOE_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./tictactoeVisual.sources.generated'),
        import('./tictactoeVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: TICTACTOE_VISUAL_SOURCES,
      assets: referenceGameAssets('tictactoe-visual', TICTACTOE_VISUAL_AUDIO),
    }
  },
  'connect-four-visual': async () => {
    const [
      { CONNECT_FOUR_VISUAL_SOURCES },
      { CONNECT_FOUR_VISUAL_AUDIO },
      { referenceGameAssets },
    ] = await Promise.all([
      import('./connectFourVisual.sources.generated'),
      import('./connectFourVisual.audio.generated'),
      import('./referenceGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: CONNECT_FOUR_VISUAL_SOURCES,
      assets: referenceGameAssets('connect-four-visual', CONNECT_FOUR_VISUAL_AUDIO),
    }
  },
  'tiles-visual': async () => {
    const [{ TILES_VISUAL_SOURCES }, { TILES_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./tilesVisual.sources.generated'),
        import('./tilesVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: TILES_VISUAL_SOURCES,
      assets: referenceGameAssets('tiles-visual', TILES_VISUAL_AUDIO),
    }
  },
  'memory-visual': async () => {
    const [{ MEMORY_VISUAL_SOURCES }, { MEMORY_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./memoryVisual.sources.generated'),
        import('./memoryVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: MEMORY_VISUAL_SOURCES,
      assets: referenceGameAssets('memory-visual', MEMORY_VISUAL_AUDIO),
    }
  },
  'simon-visual': async () => {
    const [{ SIMON_VISUAL_SOURCES }, { SIMON_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./simonVisual.sources.generated'),
        import('./simonVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: SIMON_VISUAL_SOURCES,
      assets: referenceGameAssets('simon-visual', SIMON_VISUAL_AUDIO),
    }
  },
  'bubbles-visual': async () => {
    const [{ BUBBLES_VISUAL_SOURCES }, { BUBBLES_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./bubblesVisual.sources.generated'),
        import('./bubblesVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: BUBBLES_VISUAL_SOURCES,
      assets: referenceGameAssets('bubbles-visual', BUBBLES_VISUAL_AUDIO),
    }
  },
  'egg-catcher-visual': async () => {
    const [{ EGG_CATCHER_VISUAL_SOURCES }, { EGG_CATCHER_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./eggCatcherVisual.sources.generated'),
        import('./eggCatcherVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: EGG_CATCHER_VISUAL_SOURCES,
      assets: referenceGameAssets('egg-catcher-visual', EGG_CATCHER_VISUAL_AUDIO),
    }
  },
  'monkey-visual': async () => {
    const [{ MONKEY_VISUAL_SOURCES }, { MONKEY_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./monkeyVisual.sources.generated'),
        import('./monkeyVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: MONKEY_VISUAL_SOURCES,
      assets: referenceGameAssets('monkey-visual', MONKEY_VISUAL_AUDIO),
    }
  },
  'cannon-visual': async () => {
    const [{ CANNON_VISUAL_SOURCES }, { CANNON_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./cannonVisual.sources.generated'),
        import('./cannonVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: CANNON_VISUAL_SOURCES,
      assets: referenceGameAssets('cannon-visual', CANNON_VISUAL_AUDIO),
    }
  },
  'life-visual': async () => {
    const [{ LIFE_VISUAL_SOURCES }, { LIFE_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./lifeVisual.sources.generated'),
        import('./lifeVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: LIFE_VISUAL_SOURCES,
      assets: referenceGameAssets('life-visual', LIFE_VISUAL_AUDIO),
    }
  },
  'starry-visual': async () => {
    const [{ STARRY_VISUAL_SOURCES }, { STARRY_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./starryVisual.sources.generated'),
        import('./starryVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: STARRY_VISUAL_SOURCES,
      assets: referenceGameAssets('starry-visual', STARRY_VISUAL_AUDIO),
    }
  },
  'fortune-visual': async () => {
    const [{ FORTUNE_VISUAL_SOURCES }, { FORTUNE_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./fortuneVisual.sources.generated'),
        import('./fortuneVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: FORTUNE_VISUAL_SOURCES,
      assets: referenceGameAssets('fortune-visual', FORTUNE_VISUAL_AUDIO),
    }
  },
  'turtle-bet-visual': async () => {
    const [{ TURTLE_BET_VISUAL_SOURCES }, { TURTLE_BET_VISUAL_AUDIO }, { referenceGameAssets }] =
      await Promise.all([
        import('./turtleBetVisual.sources.generated'),
        import('./turtleBetVisual.audio.generated'),
        import('./referenceGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: TURTLE_BET_VISUAL_SOURCES,
      assets: referenceGameAssets('turtle-bet-visual', TURTLE_BET_VISUAL_AUDIO),
    }
  },
} satisfies Record<VisualReferenceGameKey, () => Promise<unknown>>
