// Gerado por scripts/generate-pgzero-games.ts. Não edite este arquivo.
// Fonte: src/examples/python/pgzeroGames.manifest.ts
import type { PgzeroGameKey } from './pgzeroGames.manifest'

/** Literal import() per game, so every bundler keeps one lazy chunk per payload. */
export const PGZERO_GAME_LOADERS = {
  'ola-pgzero': async () => {
    const [{ OLA_PGZERO_SOURCES }, { OLA_PGZERO_MEDIA }, { pgzeroGameAssets }] = await Promise.all([
      import('./olaPgzero.sources.generated'),
      import('./olaPgzero.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: OLA_PGZERO_SOURCES,
      assets: pgzeroGameAssets('ola-pgzero', OLA_PGZERO_MEDIA),
    }
  },
  'acerte-a-maca': async () => {
    const [{ ACERTE_A_MACA_SOURCES }, { ACERTE_A_MACA_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./acerteAMaca.sources.generated'),
        import('./acerteAMaca.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: ACERTE_A_MACA_SOURCES,
      assets: pgzeroGameAssets('acerte-a-maca', ACERTE_A_MACA_MEDIA),
    }
  },
  'raposa-moedas': async () => {
    const [{ RAPOSA_MOEDAS_SOURCES }, { RAPOSA_MOEDAS_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./raposaMoedas.sources.generated'),
        import('./raposaMoedas.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: RAPOSA_MOEDAS_SOURCES,
      assets: pgzeroGameAssets('raposa-moedas', RAPOSA_MOEDAS_MEDIA),
    }
  },
  'ligue-os-pontos': async () => {
    const [{ LIGUE_OS_PONTOS_SOURCES }, { LIGUE_OS_PONTOS_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./ligueOsPontos.sources.generated'),
        import('./ligueOsPontos.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: LIGUE_OS_PONTOS_SOURCES,
      assets: pgzeroGameAssets('ligue-os-pontos', LIGUE_OS_PONTOS_MEDIA),
    }
  },
  'estrela-vermelha': async () => {
    const [{ ESTRELA_VERMELHA_SOURCES }, { ESTRELA_VERMELHA_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./estrelaVermelha.sources.generated'),
        import('./estrelaVermelha.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: ESTRELA_VERMELHA_SOURCES,
      assets: pgzeroGameAssets('estrela-vermelha', ESTRELA_VERMELHA_MEDIA),
    }
  },
  'quiz-relampago': async () => {
    const [{ QUIZ_RELAMPAGO_SOURCES }, { QUIZ_RELAMPAGO_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./quizRelampago.sources.generated'),
        import('./quizRelampago.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: QUIZ_RELAMPAGO_SOURCES,
      assets: pgzeroGameAssets('quiz-relampago', QUIZ_RELAMPAGO_MEDIA),
    }
  },
  'voo-de-balao': async () => {
    const [{ VOO_DE_BALAO_SOURCES }, { VOO_DE_BALAO_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./vooDeBalao.sources.generated'),
        import('./vooDeBalao.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: VOO_DE_BALAO_SOURCES,
      assets: pgzeroGameAssets('voo-de-balao', VOO_DE_BALAO_MEDIA),
    }
  },
  'desafio-da-danca': async () => {
    const [{ DESAFIO_DA_DANCA_SOURCES }, { DESAFIO_DA_DANCA_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./desafioDaDanca.sources.generated'),
        import('./desafioDaDanca.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: DESAFIO_DA_DANCA_SOURCES,
      assets: pgzeroGameAssets('desafio-da-danca', DESAFIO_DA_DANCA_MEDIA),
    }
  },
  'jardim-feliz': async () => {
    const [{ JARDIM_FELIZ_SOURCES }, { JARDIM_FELIZ_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./jardimFeliz.sources.generated'),
        import('./jardimFeliz.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: JARDIM_FELIZ_SOURCES,
      assets: pgzeroGameAssets('jardim-feliz', JARDIM_FELIZ_MEDIA),
    }
  },
  'dragoes-dorminhocos': async () => {
    const [{ DRAGOES_DORMINHOCOS_SOURCES }, { DRAGOES_DORMINHOCOS_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./dragoesDorminhocos.sources.generated'),
        import('./dragoesDorminhocos.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: DRAGOES_DORMINHOCOS_SOURCES,
      assets: pgzeroGameAssets('dragoes-dorminhocos', DRAGOES_DORMINHOCOS_MEDIA),
    }
  },
  'barris-na-rampa': async () => {
    const [{ BARRIS_NA_RAMPA_SOURCES }, { BARRIS_NA_RAMPA_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./barrisNaRampa.sources.generated'),
        import('./barrisNaRampa.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: BARRIS_NA_RAMPA_SOURCES,
      assets: pgzeroGameAssets('barris-na-rampa', BARRIS_NA_RAMPA_MEDIA),
    }
  },
  'salto-nas-plataformas': async () => {
    const [
      { SALTO_NAS_PLATAFORMAS_SOURCES },
      { SALTO_NAS_PLATAFORMAS_MEDIA },
      { pgzeroGameAssets },
    ] = await Promise.all([
      import('./saltoNasPlataformas.sources.generated'),
      import('./saltoNasPlataformas.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: SALTO_NAS_PLATAFORMAS_SOURCES,
      assets: pgzeroGameAssets('salto-nas-plataformas', SALTO_NAS_PLATAFORMAS_MEDIA),
    }
  },
  'piramide-de-cubos': async () => {
    const [{ PIRAMIDE_DE_CUBOS_SOURCES }, { PIRAMIDE_DE_CUBOS_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./piramideDeCubos.sources.generated'),
        import('./piramideDeCubos.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: PIRAMIDE_DE_CUBOS_SOURCES,
      assets: pgzeroGameAssets('piramide-de-cubos', PIRAMIDE_DE_CUBOS_MEDIA),
    }
  },
  'cipo-sobre-o-poco': async () => {
    const [{ CIPO_SOBRE_O_POCO_SOURCES }, { CIPO_SOBRE_O_POCO_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./cipoSobreOPoco.sources.generated'),
        import('./cipoSobreOPoco.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: CIPO_SOBRE_O_POCO_SOURCES,
      assets: pgzeroGameAssets('cipo-sobre-o-poco', CIPO_SOBRE_O_POCO_MEDIA),
    }
  },
  'mina-que-desmorona': async () => {
    const [{ MINA_QUE_DESMORONA_SOURCES }, { MINA_QUE_DESMORONA_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./minaQueDesmorona.sources.generated'),
        import('./minaQueDesmorona.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: MINA_QUE_DESMORONA_SOURCES,
      assets: pgzeroGameAssets('mina-que-desmorona', MINA_QUE_DESMORONA_MEDIA),
    }
  },
  'escudos-contra-invasores': async () => {
    const [
      { ESCUDOS_CONTRA_INVASORES_SOURCES },
      { ESCUDOS_CONTRA_INVASORES_MEDIA },
      { pgzeroGameAssets },
    ] = await Promise.all([
      import('./escudosContraInvasores.sources.generated'),
      import('./escudosContraInvasores.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: ESCUDOS_CONTRA_INVASORES_SOURCES,
      assets: pgzeroGameAssets('escudos-contra-invasores', ESCUDOS_CONTRA_INVASORES_MEDIA),
    }
  },
  'mergulho-alienigena': async () => {
    const [{ MERGULHO_ALIENIGENA_SOURCES }, { MERGULHO_ALIENIGENA_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./mergulhoAlienigena.sources.generated'),
        import('./mergulhoAlienigena.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: MERGULHO_ALIENIGENA_SOURCES,
      assets: pgzeroGameAssets('mergulho-alienigena', MERGULHO_ALIENIGENA_MEDIA),
    }
  },
  'nave-mae': async () => {
    const [{ NAVE_MAE_SOURCES }, { NAVE_MAE_MEDIA }, { pgzeroGameAssets }] = await Promise.all([
      import('./naveMae.sources.generated'),
      import('./naveMae.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: NAVE_MAE_SOURCES,
      assets: pgzeroGameAssets('nave-mae', NAVE_MAE_MEDIA),
    }
  },
} satisfies Record<PgzeroGameKey, () => Promise<unknown>>
