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
  'pouso-lunar': async () => {
    const [{ POUSO_LUNAR_SOURCES }, { POUSO_LUNAR_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./pousoLunar.sources.generated'),
        import('./pousoLunar.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: POUSO_LUNAR_SOURCES,
      assets: pgzeroGameAssets('pouso-lunar', POUSO_LUNAR_MEDIA),
    }
  },
  'quebra-tijolos': async () => {
    const [{ QUEBRA_TIJOLOS_SOURCES }, { QUEBRA_TIJOLOS_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./quebraTijolos.sources.generated'),
        import('./quebraTijolos.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: QUEBRA_TIJOLOS_SOURCES,
      assets: pgzeroGameAssets('quebra-tijolos', QUEBRA_TIJOLOS_MEDIA),
    }
  },
  'sapo-atravessa': async () => {
    const [{ SAPO_ATRAVESSA_SOURCES }, { SAPO_ATRAVESSA_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./sapoAtravessa.sources.generated'),
        import('./sapoAtravessa.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: SAPO_ATRAVESSA_SOURCES,
      assets: pgzeroGameAssets('sapo-atravessa', SAPO_ATRAVESSA_MEDIA),
    }
  },
  'patrulha-em-camadas': async () => {
    const [{ PATRULHA_EM_CAMADAS_SOURCES }, { PATRULHA_EM_CAMADAS_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./patrulhaEmCamadas.sources.generated'),
        import('./patrulhaEmCamadas.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: PATRULHA_EM_CAMADAS_SOURCES,
      assets: pgzeroGameAssets('patrulha-em-camadas', PATRULHA_EM_CAMADAS_MEDIA),
    }
  },
  'motos-de-luz': async () => {
    const [{ MOTOS_DE_LUZ_SOURCES }, { MOTOS_DE_LUZ_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./motosDeLuz.sources.generated'),
        import('./motosDeLuz.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: MOTOS_DE_LUZ_SOURCES,
      assets: pgzeroGameAssets('motos-de-luz', MOTOS_DE_LUZ_MEDIA),
    }
  },
  'arena-de-dois-comandos': async () => {
    const [
      { ARENA_DE_DOIS_COMANDOS_SOURCES },
      { ARENA_DE_DOIS_COMANDOS_MEDIA },
      { pgzeroGameAssets },
    ] = await Promise.all([
      import('./arenaDeDoisComandos.sources.generated'),
      import('./arenaDeDoisComandos.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: ARENA_DE_DOIS_COMANDOS_SOURCES,
      assets: pgzeroGameAssets('arena-de-dois-comandos', ARENA_DE_DOIS_COMANDOS_MEDIA),
    }
  },
  'bombas-no-labirinto': async () => {
    const [{ BOMBAS_NO_LABIRINTO_SOURCES }, { BOMBAS_NO_LABIRINTO_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./bombasNoLabirinto.sources.generated'),
        import('./bombasNoLabirinto.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: BOMBAS_NO_LABIRINTO_SOURCES,
      assets: pgzeroGameAssets('bombas-no-labirinto', BOMBAS_NO_LABIRINTO_MEDIA),
    }
  },
  'corredor-do-kung-fu': async () => {
    const [{ CORREDOR_DO_KUNG_FU_SOURCES }, { CORREDOR_DO_KUNG_FU_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./corredorDoKungFu.sources.generated'),
        import('./corredorDoKungFu.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: CORREDOR_DO_KUNG_FU_SOURCES,
      assets: pgzeroGameAssets('corredor-do-kung-fu', CORREDOR_DO_KUNG_FU_MEDIA),
    }
  },
  'bolinha-rolante': async () => {
    const [{ BOLINHA_ROLANTE_SOURCES }, { BOLINHA_ROLANTE_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./bolinhaRolante.sources.generated'),
        import('./bolinhaRolante.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: BOLINHA_ROLANTE_SOURCES,
      assets: pgzeroGameAssets('bolinha-rolante', BOLINHA_ROLANTE_MEDIA),
    }
  },
  'bolhas-que-se-dividem': async () => {
    const [
      { BOLHAS_QUE_SE_DIVIDEM_SOURCES },
      { BOLHAS_QUE_SE_DIVIDEM_MEDIA },
      { pgzeroGameAssets },
    ] = await Promise.all([
      import('./bolhasQueSeDividem.sources.generated'),
      import('./bolhasQueSeDividem.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: BOLHAS_QUE_SE_DIVIDEM_SOURCES,
      assets: pgzeroGameAssets('bolhas-que-se-dividem', BOLHAS_QUE_SE_DIVIDEM_MEDIA),
    }
  },
  'masmorra-para-quatro': async () => {
    const [{ MASMORRA_PARA_QUATRO_SOURCES }, { MASMORRA_PARA_QUATRO_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./masmorraParaQuatro.sources.generated'),
        import('./masmorraParaQuatro.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: MASMORRA_PARA_QUATRO_SOURCES,
      assets: pgzeroGameAssets('masmorra-para-quatro', MASMORRA_PARA_QUATRO_MEDIA),
    }
  },
  'duelo-por-turnos': async () => {
    const [{ DUELO_POR_TURNOS_SOURCES }, { DUELO_POR_TURNOS_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./dueloPorTurnos.sources.generated'),
        import('./dueloPorTurnos.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: DUELO_POR_TURNOS_SOURCES,
      assets: pgzeroGameAssets('duelo-por-turnos', DUELO_POR_TURNOS_MEDIA),
    }
  },
  'passarinho-saltitante': async () => {
    const [
      { PASSARINHO_SALTITANTE_SOURCES },
      { PASSARINHO_SALTITANTE_MEDIA },
      { pgzeroGameAssets },
    ] = await Promise.all([
      import('./passarinhoSaltitante.sources.generated'),
      import('./passarinhoSaltitante.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: PASSARINHO_SALTITANTE_SOURCES,
      assets: pgzeroGameAssets('passarinho-saltitante', PASSARINHO_SALTITANTE_MEDIA),
    }
  },
  'placar-dos-campeoes': async () => {
    const [{ PLACAR_DOS_CAMPEOES_SOURCES }, { PLACAR_DOS_CAMPEOES_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./placarDosCampeoes.sources.generated'),
        import('./placarDosCampeoes.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: PLACAR_DOS_CAMPEOES_SOURCES,
      assets: pgzeroGameAssets('placar-dos-campeoes', PLACAR_DOS_CAMPEOES_MEDIA),
    }
  },
  continuar: async () => {
    const [{ CONTINUAR_SOURCES }, { CONTINUAR_MEDIA }, { pgzeroGameAssets }] = await Promise.all([
      import('./continuar.sources.generated'),
      import('./continuar.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: CONTINUAR_SOURCES,
      assets: pgzeroGameAssets('continuar', CONTINUAR_MEDIA),
    }
  },
  'bussola-maluca': async () => {
    const [{ BUSSOLA_MALUCA_SOURCES }, { BUSSOLA_MALUCA_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./bussolaMaluca.sources.generated'),
        import('./bussolaMaluca.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: BUSSOLA_MALUCA_SOURCES,
      assets: pgzeroGameAssets('bussola-maluca', BUSSOLA_MALUCA_MEDIA),
    }
  },
  'cores-e-bolinha': async () => {
    const [{ CORES_E_BOLINHA_SOURCES }, { CORES_E_BOLINHA_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./coresEBolinha.sources.generated'),
        import('./coresEBolinha.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: CORES_E_BOLINHA_SOURCES,
      assets: pgzeroGameAssets('cores-e-bolinha', CORES_E_BOLINHA_MEDIA),
    }
  },
  'piano-maluco': async () => {
    const [{ PIANO_MALUCO_SOURCES }, { PIANO_MALUCO_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./pianoMaluco.sources.generated'),
        import('./pianoMaluco.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: PIANO_MALUCO_SOURCES,
      assets: pgzeroGameAssets('piano-maluco', PIANO_MALUCO_MEDIA),
    }
  },
  'duelo-de-tanques': async () => {
    const [{ DUELO_DE_TANQUES_SOURCES }, { DUELO_DE_TANQUES_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./dueloDeTanques.sources.generated'),
        import('./dueloDeTanques.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: DUELO_DE_TANQUES_SOURCES,
      assets: pgzeroGameAssets('duelo-de-tanques', DUELO_DE_TANQUES_MEDIA),
    }
  },
  'memoria-contra-o-computador': async () => {
    const [
      { MEMORIA_CONTRA_O_COMPUTADOR_SOURCES },
      { MEMORIA_CONTRA_O_COMPUTADOR_MEDIA },
      { pgzeroGameAssets },
    ] = await Promise.all([
      import('./memoriaContraOComputador.sources.generated'),
      import('./memoriaContraOComputador.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: MEMORIA_CONTRA_O_COMPUTADOR_SOURCES,
      assets: pgzeroGameAssets('memoria-contra-o-computador', MEMORIA_CONTRA_O_COMPUTADOR_MEDIA),
    }
  },
  'batalha-naval': async () => {
    const [{ BATALHA_NAVAL_SOURCES }, { BATALHA_NAVAL_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./batalhaNaval.sources.generated'),
        import('./batalhaNaval.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: BATALHA_NAVAL_SOURCES,
      assets: pgzeroGameAssets('batalha-naval', BATALHA_NAVAL_MEDIA),
    }
  },
  'atirador-espacial': async () => {
    const [{ ATIRADOR_ESPACIAL_SOURCES }, { ATIRADOR_ESPACIAL_MEDIA }, { pgzeroGameAssets }] =
      await Promise.all([
        import('./atiradorEspacial.sources.generated'),
        import('./atiradorEspacial.media.generated'),
        import('./pgzeroGameAssets'),
      ])
    return {
      entrypoint: 'main.py',
      files: ATIRADOR_ESPACIAL_SOURCES,
      assets: pgzeroGameAssets('atirador-espacial', ATIRADOR_ESPACIAL_MEDIA),
    }
  },
  boing: async () => {
    const [{ BOING_SOURCES }, { BOING_MEDIA }, { pgzeroGameAssets }] = await Promise.all([
      import('./boing.sources.generated'),
      import('./boing.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: BOING_SOURCES,
      assets: pgzeroGameAssets('boing', BOING_MEDIA),
    }
  },
  centopeia: async () => {
    const [{ CENTOPEIA_SOURCES }, { CENTOPEIA_MEDIA }, { pgzeroGameAssets }] = await Promise.all([
      import('./centopeia.sources.generated'),
      import('./centopeia.media.generated'),
      import('./pgzeroGameAssets'),
    ])
    return {
      entrypoint: 'main.py',
      files: CENTOPEIA_SOURCES,
      assets: pgzeroGameAssets('centopeia', CENTOPEIA_MEDIA),
    }
  },
} satisfies Record<PgzeroGameKey, () => Promise<unknown>>
