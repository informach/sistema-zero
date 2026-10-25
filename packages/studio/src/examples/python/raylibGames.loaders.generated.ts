// Gerado por scripts/generate-raylib-games.ts. Não edite este arquivo.
// Fonte: src/examples/python/raylibGames.manifest.ts
import type { RaylibGameKey } from './raylibGames.manifest'

/** Literal import() per game, so every bundler keeps one lazy chunk per payload. */
export const RAYLIB_GAME_LOADERS = {
  'ola-raylib': async () => {
    const [{ OLA_RAYLIB_SOURCES }, { OLA_RAYLIB_MEDIA }, { raylibGameAssets }] = await Promise.all([
      import('./olaRaylib.sources.generated'),
      import('./olaRaylib.media.generated'),
      import('./raylibGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: OLA_RAYLIB_SOURCES,
      assets: raylibGameAssets('ola-raylib', OLA_RAYLIB_MEDIA),
    }
  },
  'nave-que-desliza': async () => {
    const [{ NAVE_QUE_DESLIZA_SOURCES }, { NAVE_QUE_DESLIZA_MEDIA }, { raylibGameAssets }] =
      await Promise.all([
        import('./naveQueDesliza.sources.generated'),
        import('./naveQueDesliza.media.generated'),
        import('./raylibGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: NAVE_QUE_DESLIZA_SOURCES,
      assets: raylibGameAssets('nave-que-desliza', NAVE_QUE_DESLIZA_MEDIA),
    }
  },
  encostou: async () => {
    const [{ ENCOSTOU_SOURCES }, { ENCOSTOU_MEDIA }, { raylibGameAssets }] = await Promise.all([
      import('./encostou.sources.generated'),
      import('./encostou.media.generated'),
      import('./raylibGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: ENCOSTOU_SOURCES,
      assets: raylibGameAssets('encostou', ENCOSTOU_MEDIA),
    }
  },
  'camera-que-segue': async () => {
    const [{ CAMERA_QUE_SEGUE_SOURCES }, { CAMERA_QUE_SEGUE_MEDIA }, { raylibGameAssets }] =
      await Promise.all([
        import('./cameraQueSegue.sources.generated'),
        import('./cameraQueSegue.media.generated'),
        import('./raylibGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: CAMERA_QUE_SEGUE_SOURCES,
      assets: raylibGameAssets('camera-que-segue', CAMERA_QUE_SEGUE_MEDIA),
    }
  },
  'sprites-timer-animacao': async () => {
    const [
      { SPRITES_TIMER_ANIMACAO_SOURCES },
      { SPRITES_TIMER_ANIMACAO_MEDIA },
      { raylibGameAssets },
    ] = await Promise.all([
      import('./spritesTimerAnimacao.sources.generated'),
      import('./spritesTimerAnimacao.media.generated'),
      import('./raylibGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: SPRITES_TIMER_ANIMACAO_SOURCES,
      assets: raylibGameAssets('sprites-timer-animacao', SPRITES_TIMER_ANIMACAO_MEDIA),
    }
  },
} satisfies Record<RaylibGameKey, () => Promise<unknown>>
