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
} satisfies Record<RaylibGameKey, () => Promise<unknown>>
