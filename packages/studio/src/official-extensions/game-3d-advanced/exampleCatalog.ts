import {
  aLendaDoHeroiProfissionalExample,
  arenaDosCristaisExample,
  atravesseProfissionalExample,
  cacaEstelarProfissionalExample,
  cercoNaBaseProfissionalExample,
  chefaoDasSombrasExample,
  corridaInfinitaProfissionalExample,
  defesaDaTorreExample,
  guardiaoDoPortalExample,
  heroiDoMoldaExample,
  labirintoDosRobosProfissionalExample,
  minaDeCristaisProfissionalExample,
  mundoDeBlocosProfissionalExample,
  noiteDasFogueirasExample,
  parkourDoVulcaoExample,
  patrulhaEspacialProfissionalExample,
  quadraMalucaExample,
  reunirRebanhoProfissionalExample,
  saltoNasNuvensExample,
  tiroAoAlvoExample,
} from './examples'

/**
 * Ordem da vitrine (review 3D, lote 12): do mais simples ao mais conceitual. Primeiro os
 * jogos curtos de uma ideia só (clicar, andar relativo à câmera, defender, pular, parkour,
 * chefão), depois o primeiro jogo COMPLETO e curto ("Arena dos Cristais": patrulha, mochila,
 * fases e recorde), o modelo animado do Molda, a "Noite das Fogueiras" (os ARQUIVOS do
 * projeto: céu de foto, música e sons) e por fim os jogos grandes "Profissional".
 * O `exampleProgression.test.ts` trava as seções e a régua do degrau, e o
 * `exampleCoverage.test.ts` exige que todo bloco da paleta apareça em algum exemplo.
 */
export const GAME_KIT_THREE_D_EXAMPLE_SECTIONS = {
  primeiros: [
    tiroAoAlvoExample,
    quadraMalucaExample,
    guardiaoDoPortalExample,
    saltoNasNuvensExample,
    parkourDoVulcaoExample,
    chefaoDasSombrasExample,
  ],
  completos: [arenaDosCristaisExample, heroiDoMoldaExample, noiteDasFogueirasExample],
  profissionais: [
    defesaDaTorreExample,
    corridaInfinitaProfissionalExample,
    labirintoDosRobosProfissionalExample,
    mundoDeBlocosProfissionalExample,
    patrulhaEspacialProfissionalExample,
    atravesseProfissionalExample,
    reunirRebanhoProfissionalExample,
    aLendaDoHeroiProfissionalExample,
    cacaEstelarProfissionalExample,
    cercoNaBaseProfissionalExample,
    minaDeCristaisProfissionalExample,
  ],
} as const

export const gameKit3DExamples = [
  ...GAME_KIT_THREE_D_EXAMPLE_SECTIONS.primeiros,
  ...GAME_KIT_THREE_D_EXAMPLE_SECTIONS.completos,
  ...GAME_KIT_THREE_D_EXAMPLE_SECTIONS.profissionais,
] as const
