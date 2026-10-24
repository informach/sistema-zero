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
  'rastro-de-ajudantes': async () => {
    const [{ RASTRO_DE_AJUDANTES_SOURCES }, { RASTRO_DE_AJUDANTES_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./rastroDeAjudantes.sources.generated'),
        import('./rastroDeAjudantes.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: RASTRO_DE_AJUDANTES_SOURCES,
      assets: pgzeroGameAssets('rastro-de-ajudantes', RASTRO_DE_AJUDANTES_MEDIA),
    }
  },
  'helicoptero-bombardeiro': async () => {
    const [
      { HELICOPTERO_BOMBARDEIRO_SOURCES },
      { HELICOPTERO_BOMBARDEIRO_MEDIA },
      { pgzeroGameAssets },
    ] = await Promise.all([
      import('./helicopteroBombardeiro.sources.generated'),
      import('./helicopteroBombardeiro.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: HELICOPTERO_BOMBARDEIRO_SOURCES,
      assets: pgzeroGameAssets('helicoptero-bombardeiro', HELICOPTERO_BOMBARDEIRO_MEDIA),
    }
  },
  'cauda-espacial': async () => {
    const [{ CAUDA_ESPACIAL_SOURCES }, { CAUDA_ESPACIAL_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./caudaEspacial.sources.generated'),
        import('./caudaEspacial.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: CAUDA_ESPACIAL_SOURCES,
      assets: pgzeroGameAssets('cauda-espacial', CAUDA_ESPACIAL_MEDIA),
    }
  },
  'mochila-a-jato': async () => {
    const [{ MOCHILA_A_JATO_SOURCES }, { MOCHILA_A_JATO_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./mochilaAJato.sources.generated'),
        import('./mochilaAJato.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: MOCHILA_A_JATO_SOURCES,
      assets: pgzeroGameAssets('mochila-a-jato', MOCHILA_A_JATO_MEDIA),
    }
  },
  'propulsor-no-espaco': async () => {
    const [{ PROPULSOR_NO_ESPACO_SOURCES }, { PROPULSOR_NO_ESPACO_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./propulsorNoEspaco.sources.generated'),
        import('./propulsorNoEspaco.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: PROPULSOR_NO_ESPACO_SOURCES,
      assets: pgzeroGameAssets('propulsor-no-espaco', PROPULSOR_NO_ESPACO_MEDIA),
    }
  },
  'encanamento-apressado': async () => {
    const [
      { ENCANAMENTO_APRESSADO_SOURCES },
      { ENCANAMENTO_APRESSADO_MEDIA },
      { pgzeroGameAssets },
    ] = await Promise.all([
      import('./encanamentoApressado.sources.generated'),
      import('./encanamentoApressado.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: ENCANAMENTO_APRESSADO_SOURCES,
      assets: pgzeroGameAssets('encanamento-apressado', ENCANAMENTO_APRESSADO_MEDIA),
    }
  },
  'troca-de-joias': async () => {
    const [{ TROCA_DE_JOIAS_SOURCES }, { TROCA_DE_JOIAS_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./trocaDeJoias.sources.generated'),
        import('./trocaDeJoias.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: TROCA_DE_JOIAS_SOURCES,
      assets: pgzeroGameAssets('troca-de-joias', TROCA_DE_JOIAS_MEDIA),
    }
  },
  'bichinhos-em-fila': async () => {
    const [{ BICHINHOS_EM_FILA_SOURCES }, { BICHINHOS_EM_FILA_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./bichinhosEmFila.sources.generated'),
        import('./bichinhosEmFila.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: BICHINHOS_EM_FILA_SOURCES,
      assets: pgzeroGameAssets('bichinhos-em-fila', BICHINHOS_EM_FILA_MEDIA),
    }
  },
  'cavando-por-gemas': async () => {
    const [{ CAVANDO_POR_GEMAS_SOURCES }, { CAVANDO_POR_GEMAS_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./cavandoPorGemas.sources.generated'),
        import('./cavandoPorGemas.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: CAVANDO_POR_GEMAS_SOURCES,
      assets: pgzeroGameAssets('cavando-por-gemas', CAVANDO_POR_GEMAS_MEDIA),
    }
  },
  'editor-de-cavernas': async () => {
    const [{ EDITOR_DE_CAVERNAS_SOURCES }, { EDITOR_DE_CAVERNAS_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./editorDeCavernas.sources.generated'),
        import('./editorDeCavernas.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: EDITOR_DE_CAVERNAS_SOURCES,
      assets: pgzeroGameAssets('editor-de-cavernas', EDITOR_DE_CAVERNAS_MEDIA),
    }
  },
  'corrida-vista-de-cima': async () => {
    const [
      { CORRIDA_VISTA_DE_CIMA_SOURCES },
      { CORRIDA_VISTA_DE_CIMA_MEDIA },
      { pgzeroGameAssets },
    ] = await Promise.all([
      import('./corridaVistaDeCima.sources.generated'),
      import('./corridaVistaDeCima.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: CORRIDA_VISTA_DE_CIMA_SOURCES,
      assets: pgzeroGameAssets('corrida-vista-de-cima', CORRIDA_VISTA_DE_CIMA_MEDIA),
    }
  },
  sinuca: async () => {
    const [{ SINUCA_SOURCES }, { SINUCA_MEDIA }, { pgzeroGameAssets }] = await Promise.all([
      import('./sinuca.sources.generated'),
      import('./sinuca.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: SINUCA_SOURCES,
      assets: pgzeroGameAssets('sinuca', SINUCA_MEDIA),
    }
  },
  fliperama: async () => {
    const [{ FLIPERAMA_SOURCES }, { FLIPERAMA_MEDIA }, { pgzeroGameAssets }] = await Promise.all([
      import('./fliperama.sources.generated'),
      import('./fliperama.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: FLIPERAMA_SOURCES,
      assets: pgzeroGameAssets('fliperama', FLIPERAMA_MEDIA),
    }
  },
  'minigolfe-maluco': async () => {
    const [{ MINIGOLFE_MALUCO_SOURCES }, { MINIGOLFE_MALUCO_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./minigolfeMaluco.sources.generated'),
        import('./minigolfeMaluco.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: MINIGOLFE_MALUCO_SOURCES,
      assets: pgzeroGameAssets('minigolfe-maluco', MINIGOLFE_MALUCO_MEDIA),
    }
  },
  'tiro-ao-prato': async () => {
    const [{ TIRO_AO_PRATO_SOURCES }, { TIRO_AO_PRATO_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./tiroAoPrato.sources.generated'),
        import('./tiroAoPrato.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: TIRO_AO_PRATO_SOURCES,
      assets: pgzeroGameAssets('tiro-ao-prato', TIRO_AO_PRATO_MEDIA),
    }
  },
  'rali-com-minimapa': async () => {
    const [{ RALI_COM_MINIMAPA_SOURCES }, { RALI_COM_MINIMAPA_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./raliComMinimapa.sources.generated'),
        import('./raliComMinimapa.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: RALI_COM_MINIMAPA_SOURCES,
      assets: pgzeroGameAssets('rali-com-minimapa', RALI_COM_MINIMAPA_MEDIA),
    }
  },
} satisfies Record<PgzeroGameKey, () => Promise<unknown>>
