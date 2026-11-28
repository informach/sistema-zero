/**
 * Os Poderes do Construtor no executor de verdade (`poderes-objetivos-navegador.ts`): como montar o
 * projeto de uma etapa, os objetivos dela e as mutações, cada uma com os objetivos de JOGO que ela
 * precisa derrubar (os de blocos ficam com o teste de cada Poder).
 */

import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
import type { StudioAuthoringProject } from '../../../packages/core/src/studio/authoring-project'
import { armaChecks } from './arma-criterios'
import { type ArmaEtapa, montarProjetoArma } from './arma-projeto'
import { chefaoChecks } from './chefao-criterios'
import { type ChefaoEtapa, montarProjetoChefao } from './chefao-projeto'
import type { PoderDimensaoConstrutor } from './construtor-poderes-base'
import { escudoChecks } from './escudo-criterios'
import { type EscudoEtapa, montarProjetoEscudo } from './escudo-projeto'
import { inimigoChecks } from './inimigo-criterios'
import { type InimigoEtapa, montarProjetoInimigo } from './inimigo-projeto'
import { triploChecks } from './triplo-criterios'
import { montarProjetoTriplo, type TriploEtapa } from './triplo-projeto'

export type Mutacao = { aplicar: (js: string) => string; derruba: string[] }
export interface CasoDoPoder {
  etapaFinal: string
  montar: (d: PoderDimensaoConstrutor, etapa: string) => StudioAuthoringProject
  checks: (d: PoderDimensaoConstrutor, etapa: string) => SectionProjectCheck[]
  mutacoes: (d: PoderDimensaoConstrutor) => Record<string, Mutacao>
}

const trocar = (de: RegExp, para: string) => (js: string) => js.replace(de, para)
const correto: Mutacao = { aplicar: (js) => js, derruba: [] }

export const PODERES_NAVEGADOR: Record<string, CasoDoPoder> = {
  escudo: {
    etapaFinal: 'acaba',
    montar: (d, etapa) => montarProjetoEscudo(d, etapa as EscudoEtapa),
    checks: (d, etapa) => escudoChecks(d, etapa as EscudoEtapa),
    mutacoes: (d) => ({
      correto,
      'sem-guarda': {
        aplicar: trocar(
          d === '2d'
            ? /(everySeconds\("cada2", [\d.]+\)\) \{\n\s*)if \(SZGame2D\.sceneIs\("jogando"\)\)/
            : /(everySecondsLoop\(4, \(\) => \{\n\s*)if \(estado === "jogando"\)/,
          '$1if (true)',
        ),
        derruba: ['item-so-na-partida'],
      },
      // o item continua no grupo: o encontro repete o 5 e o escudo liga do mesmo jeito; quem
      // reprova é o objetivo dos blocos (`item-liga-cinco`)
      'sem-retirada': {
        aplicar: trocar(/\n\s*SZGame[23]D\.removeFromGroup\(itensEscudo, itemPego\);/, ''),
        derruba: [],
      },
      'sem-cinco': {
        aplicar: trocar(/\n\s*tempoDoEscudo = 5;/, ''),
        derruba: ['pegar-liga-o-escudo', 'escudo-conta-para-tras'],
      },
      'sem-contagem': {
        aplicar: trocar(/\n\s*tempoDoEscudo = tempoDoEscudo - 1;/, ''),
        derruba: ['escudo-conta-para-tras'],
      },
      // sem a guarda, o tempo passa do zero desde o começo: o "zero antes da partida" do item cai
      // junto, e no 3D (que espera os modelos antes do Enter) também o "zero antes de pegar"
      'sem-guarda-da-contagem': {
        aplicar: trocar(
          d === '2d'
            ? /(everySeconds\("cada3", 1\)\) \{\n\s*)if \(tempoDoEscudo > 0\)/
            : /(everySecondsLoop\(1, \(\) => \{\n\s*)if \(tempoDoEscudo > 0\)/,
          '$1if (true)',
        ),
        derruba: [
          'item-so-na-partida',
          ...(d === '3d' ? ['pegar-liga-o-escudo'] : []),
          'escudo-conta-para-tras',
        ],
      },
    }),
  },
  triplo: {
    etapaFinal: 'volta',
    montar: (d, etapa) => montarProjetoTriplo(d, etapa as TriploEtapa),
    checks: (d, etapa) => triploChecks(d, etapa as TriploEtapa),
    mutacoes: (d) => ({
      correto,
      'sem-guarda': {
        aplicar: trocar(
          d === '2d'
            ? /(everySeconds\("cada2", [\d.]+\)\) \{\n\s*)if \(SZGame2D\.sceneIs\("jogando"\)\)/
            : /(everySecondsLoop\(4, \(\) => \{\n\s*)if \(estado === "jogando"\)/,
          '$1if (true)',
        ),
        derruba: ['item-so-na-partida'],
      },
      // sem o 5, o triplo nunca liga: o Espaço segue com um laser e não há o que acabar
      'sem-cinco': {
        aplicar: trocar(/\n\s*tempoTriplo = 5;/, ''),
        derruba: ['tres-lasers-de-uma-vez', ...(d === '2d' ? ['triplo-acaba'] : [])],
      },
      // um laser só no então: o triplo liga, mas o Espaço cria um
      'um-laser-so': {
        aplicar: (js) => {
          const linha =
            d === '2d'
              ? /\n(\s*)SZGame2D\.spawn\(tiros, [^\n]*vx: -2[^\n]*\n\s*SZGame2D\.spawn\(tiros, [^\n]*vx: 0[^\n]*/
              : /\n(\s*)SZGame3D\.spawnCopy\(tirosEsquerda, [^\n]*\n\s*SZGame3D\.spawnCopy\(tiros, [^\n]*/
          return js.replace(linha, '')
        },
        derruba: ['tres-lasers-de-uma-vez'],
      },
      // no 3D o fim do triplo é dos blocos (`contagem-com-guarda`)
      'sem-contagem': {
        aplicar: trocar(/\n\s*tempoTriplo = tempoTriplo - 1;/, ''),
        derruba: d === '2d' ? ['triplo-acaba'] : [],
      },
      'sem-guarda-da-contagem': {
        aplicar: trocar(
          d === '2d'
            ? /(everySeconds\("cada3", 1\)\) \{\n\s*)if \(tempoTriplo > 0\)/
            : /(everySecondsLoop\(1, \(\) => \{\n\s*)if \(tempoTriplo > 0\)/,
          '$1if (true)',
        ),
        derruba: ['item-so-na-partida', ...(d === '2d' ? ['triplo-acaba'] : [])],
      },
    }),
  },
  inimigo: {
    etapaFinal: 'limpeza',
    montar: (d, etapa) => montarProjetoInimigo(d, etapa as InimigoEtapa),
    checks: (d, etapa) => inimigoChecks(d, etapa as InimigoEtapa),
    mutacoes: (d) => ({
      correto,
      'sem-guarda': {
        aplicar: trocar(
          d === '2d'
            ? /(everySeconds\("cada2", [\d.]+\)\) \{\n\s*)if \(SZGame2D\.sceneIs\("jogando"\)\)/
            : /(everySecondsLoop\(1\.5, \(\) => \{\n\s*)if \(estado === "jogando"\)\s*\{\n(\s*)SZGame3D\.spawnCopy\(tirosInimigos/,
          d === '2d' ? '$1if (true)' : '$1if (true) {\n$2SZGame3D.spawnCopy(tirosInimigos',
        ),
        derruba: ['tiros-so-na-partida'],
      },
      'sem-limpeza': {
        aplicar: trocar(
          d === '2d'
            ? /\n\s*SZGame2D\.pruneOffscreen\(ctx, tirosInimigos, 40, \(foraDaTela\) => \{\n\s*\n\s*\}\);/
            : /\n\s*SZGame3D\.pruneArea\(tirosInimigos, "z", -36, 6\);/,
          '',
        ),
        derruba: ['tiros-saem-da-tela'],
      },
      // o tiro que fica no grupo depois de acertar não muda a contagem do grupo o bastante:
      // quem reprova é o objetivo dos blocos (`tiro-machuca`)
      'sem-retirada': {
        aplicar: trocar(/\n\s*SZGame[23]D\.removeFromGroup\(tirosInimigos, tiroQueAcertou\);/, ''),
        derruba: [],
      },
    }),
  },
  chefao: {
    etapaFinal: 'uma-vez',
    montar: (d, etapa) => montarProjetoChefao(d, etapa as ChefaoEtapa),
    checks: (d, etapa) => chefaoChecks(d, etapa as ChefaoEtapa),
    mutacoes: (d) => ({
      correto,
      // 2D: o laser continua encostando e um tiro só tira várias vidas. No 3D o encontro só dispara
      // na entrada do contato: o laser atravessa e tira 1 (quem reprova é o objetivo de blocos).
      'sem-retirada': {
        aplicar: trocar(
          /\n\s*SZGame[23]D\.removeFromGroup\(tiros, tiroNoChefao\);\n(\s*)vidaDoChefao/,
          '\n$1vidaDoChefao',
        ),
        derruba: d === '2d' ? ['um-laser-tira-um'] : [],
      },
      // sem a guarda, o prêmio soma a cada quadro e o placar dispara até a meta (no 3D a vitória
      // recomeça o jogo na hora, e o chefão volta ao lugar)
      'sem-guarda': {
        aplicar: trocar(/if \(chefaoDerrotado === false\) \{/, 'if (true) {'),
        derruba: d === '3d' ? ['chefao-sai-no-zero', 'premio-uma-vez'] : ['premio-uma-vez'],
      },
      'sem-saida': {
        aplicar: trocar(/\n\s*SZGame[23]D\.setPosition\(chefao, [^\n]*-[24]00\);/, ''),
        derruba: ['chefao-sai-no-zero'],
      },
    }),
  },
  arma: {
    etapaFinal: 'disparo',
    montar: (d, etapa) => montarProjetoArma(d, etapa as ArmaEtapa),
    checks: (d, etapa) => armaChecks(d, etapa as ArmaEtapa),
    mutacoes: (d) => ({
      correto,
      'sem-guarda': {
        aplicar: trocar(
          d === '2d'
            ? /(everySeconds\("cada2", [\d.]+\)\) \{\n\s*)if \(SZGame2D\.sceneIs\("jogando"\)\)/
            : /(everySecondsLoop\(4, \(\) => \{\n\s*)if \(estado === "jogando"\)/,
          '$1if (true)',
        ),
        derruba: ['item-so-na-partida'],
      },
      // o plasma nunca é liberado: a troca não acontece e o Espaço segue com o laser
      'sem-liberar': {
        aplicar: trocar(/\n\s*plasmaLiberado = true;/, ''),
        derruba: ['tecla-e-troca', 'espaco-pergunta-a-arma'],
      },
      // sem a guarda, o primeiro E troca antes do plasma
      'troca-sem-guarda': {
        aplicar: trocar(/if \(plasmaLiberado === true\) \{/, 'if (true) {'),
        derruba: ['tecla-e-troca'],
      },
      // o plasma criado no grupo dos lasers
      'plasma-no-grupo-errado': {
        aplicar: trocar(
          d === '2d' ? /SZGame2D\.spawn\(tirosPlasma, /g : /SZGame3D\.spawnCopy\(tirosPlasma, /g,
          d === '2d' ? 'SZGame2D.spawn(tiros, ' : 'SZGame3D.spawnCopy(tiros, ',
        ),
        derruba: ['espaco-pergunta-a-arma'],
      },
    }),
  },
}
