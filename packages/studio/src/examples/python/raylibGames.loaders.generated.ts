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
  'dino-corredor': async () => {
    const [{ DINO_CORREDOR_SOURCES }, { DINO_CORREDOR_MEDIA }, { raylibGameAssets }] =
      await Promise.all([
        import('./dinoCorredor.sources.generated'),
        import('./dinoCorredor.media.generated'),
        import('./raylibGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: DINO_CORREDOR_SOURCES,
      assets: raylibGameAssets('dino-corredor', DINO_CORREDOR_MEDIA),
    }
  },
  'chuva-de-meteoros': async () => {
    const [{ CHUVA_DE_METEOROS_SOURCES }, { CHUVA_DE_METEOROS_MEDIA }, { raylibGameAssets }] =
      await Promise.all([
        import('./chuvaDeMeteoros.sources.generated'),
        import('./chuvaDeMeteoros.media.generated'),
        import('./raylibGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: CHUVA_DE_METEOROS_SOURCES,
      assets: raylibGameAssets('chuva-de-meteoros', CHUVA_DE_METEOROS_MEDIA),
    }
  },
  'batalha-de-monstrinhos': async () => {
    const [
      { BATALHA_DE_MONSTRINHOS_SOURCES },
      { BATALHA_DE_MONSTRINHOS_MEDIA },
      { raylibGameAssets },
    ] = await Promise.all([
      import('./batalhaDeMonstrinhos.sources.generated'),
      import('./batalhaDeMonstrinhos.media.generated'),
      import('./raylibGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: BATALHA_DE_MONSTRINHOS_SOURCES,
      assets: raylibGameAssets('batalha-de-monstrinhos', BATALHA_DE_MONSTRINHOS_MEDIA),
    }
  },
  'aventura-do-heroi': async () => {
    const [{ AVENTURA_DO_HEROI_SOURCES }, { AVENTURA_DO_HEROI_MEDIA }, { raylibGameAssets }] =
      await Promise.all([
        import('./aventuraDoHeroi.sources.generated'),
        import('./aventuraDoHeroi.media.generated'),
        import('./raylibGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: AVENTURA_DO_HEROI_SOURCES,
      assets: raylibGameAssets('aventura-do-heroi', AVENTURA_DO_HEROI_MEDIA),
    }
  },
  'primeira-cena-3d': async () => {
    const [{ PRIMEIRA_CENA3D_SOURCES }, { PRIMEIRA_CENA3D_MEDIA }, { raylibGameAssets }] =
      await Promise.all([
        import('./primeiraCena3d.sources.generated'),
        import('./primeiraCena3d.media.generated'),
        import('./raylibGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: PRIMEIRA_CENA3D_SOURCES,
      assets: raylibGameAssets('primeira-cena-3d', PRIMEIRA_CENA3D_MEDIA),
    }
  },
  'modelos-do-molda': async () => {
    const [{ MODELOS_DO_MOLDA_SOURCES }, { MODELOS_DO_MOLDA_MEDIA }, { raylibGameAssets }] =
      await Promise.all([
        import('./modelosDoMolda.sources.generated'),
        import('./modelosDoMolda.media.generated'),
        import('./raylibGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: MODELOS_DO_MOLDA_SOURCES,
      assets: raylibGameAssets('modelos-do-molda', MODELOS_DO_MOLDA_MEDIA),
    }
  },
  'caixas-que-se-encostam': async () => {
    const [
      { CAIXAS_QUE_SE_ENCOSTAM_SOURCES },
      { CAIXAS_QUE_SE_ENCOSTAM_MEDIA },
      { raylibGameAssets },
    ] = await Promise.all([
      import('./caixasQueSeEncostam.sources.generated'),
      import('./caixasQueSeEncostam.media.generated'),
      import('./raylibGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: CAIXAS_QUE_SE_ENCOSTAM_SOURCES,
      assets: raylibGameAssets('caixas-que-se-encostam', CAIXAS_QUE_SE_ENCOSTAM_MEDIA),
    }
  },
  'clarao-com-shader': async () => {
    const [{ CLARAO_COM_SHADER_SOURCES }, { CLARAO_COM_SHADER_MEDIA }, { raylibGameAssets }] =
      await Promise.all([
        import('./claraoComShader.sources.generated'),
        import('./claraoComShader.media.generated'),
        import('./raylibGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: CLARAO_COM_SHADER_SOURCES,
      assets: raylibGameAssets('clarao-com-shader', CLARAO_COM_SHADER_MEDIA),
    }
  },
  'corrida-infinita': async () => {
    const [{ CORRIDA_INFINITA_SOURCES }, { CORRIDA_INFINITA_MEDIA }, { raylibGameAssets }] =
      await Promise.all([
        import('./corridaInfinita.sources.generated'),
        import('./corridaInfinita.media.generated'),
        import('./raylibGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: CORRIDA_INFINITA_SOURCES,
      assets: raylibGameAssets('corrida-infinita', CORRIDA_INFINITA_MEDIA),
    }
  },
  'patrulha-espacial': async () => {
    const [{ PATRULHA_ESPACIAL_SOURCES }, { PATRULHA_ESPACIAL_MEDIA }, { raylibGameAssets }] =
      await Promise.all([
        import('./patrulhaEspacial.sources.generated'),
        import('./patrulhaEspacial.media.generated'),
        import('./raylibGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: PATRULHA_ESPACIAL_SOURCES,
      assets: raylibGameAssets('patrulha-espacial', PATRULHA_ESPACIAL_MEDIA),
    }
  },
  'labirinto-dos-robos': async () => {
    const [{ LABIRINTO_DOS_ROBOS_SOURCES }, { LABIRINTO_DOS_ROBOS_MEDIA }, { raylibGameAssets }] =
      await Promise.all([
        import('./labirintoDosRobos.sources.generated'),
        import('./labirintoDosRobos.media.generated'),
        import('./raylibGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: LABIRINTO_DOS_ROBOS_SOURCES,
      assets: raylibGameAssets('labirinto-dos-robos', LABIRINTO_DOS_ROBOS_MEDIA),
    }
  },
  'mundo-de-blocos': async () => {
    const [{ MUNDO_DE_BLOCOS_SOURCES }, { MUNDO_DE_BLOCOS_MEDIA }, { raylibGameAssets }] =
      await Promise.all([
        import('./mundoDeBlocos.sources.generated'),
        import('./mundoDeBlocos.media.generated'),
        import('./raylibGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: MUNDO_DE_BLOCOS_SOURCES,
      assets: raylibGameAssets('mundo-de-blocos', MUNDO_DE_BLOCOS_MEDIA),
    }
  },
} satisfies Record<RaylibGameKey, () => Promise<unknown>>
