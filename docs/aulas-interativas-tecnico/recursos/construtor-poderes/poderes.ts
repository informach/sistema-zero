/**
 * Os Poderes do Construtor para os recursos (caderno e capas): a fonte editorial, as etapas e os
 * projetos de cada um, e os textos da capa do caderno.
 */

import type { PoderDimensaoConstrutor } from '../../qa/construtor-poderes-base'
import type { MontagemPoder } from '../../qa/construtor-poderes-conteudo'
import { escudoAulas, escudoExperiencia } from '../../qa/escudo-conteudo'
import { ESCUDO_ETAPAS, montarProjetoEscudo } from '../../qa/escudo-projeto'
import type { PoderAula } from '../../qa/poder-gerador'
import { triploAulas, triploExperiencia } from '../../qa/triplo-conteudo'
import { montarProjetoTriplo, TRIPLO_ETAPAS } from '../../qa/triplo-projeto'

export interface PoderDoCaderno {
  /** A pasta do curso em docs/aulas-interativas/construtor. */
  curso: string
  titulo: string
  linha1: string
  linha2: string
  frase: string
  /** O que a criança vê no jogo pronto (a primeira folha de cada aula). */
  jogoPronto: Record<PoderDimensaoConstrutor, string>
  /** A frase do índice de cada aula. */
  resumo: Record<PoderDimensaoConstrutor, string>
  /** O que a criança programou (a última folha). */
  programou: string
  experiencia: { title: string; idea: string; goals: string[]; observe: string }
  /** Uma frase curta por parte de cada aula, para as capas das partes (a ordem das aulas). */
  frases: Record<string, string[]>
  etapas: readonly string[]
  /**
   * Os desenhos dos encaixes de uma etapa, quando não cabem numa folha só: os projetos
   * intermediários (o `montar` os entende pelo nome) e o título de cada desenho.
   */
  divisoes?: Partial<Record<string, { titulo: string; depois: string }[]>>
  aulas: () => PoderAula<string>[]
  montar: (d: PoderDimensaoConstrutor, etapa: string) => unknown
}

export const PODERES_DO_CADERNO: Record<string, PoderDoCaderno> = {
  escudo: {
    curso: 'poder-escudo-temporario',
    titulo: 'Escudo temporário',
    linha1: 'Escudo',
    linha2: 'temporário',
    frase: 'Um escudo com prazo para a nave, em 2D e na patrulha 3D.',
    jogoPronto: {
      '2d': 'Clique no jogo e aperte Enter. Deixe a nave no meio e pegue o item que cai: o Escudo vira 5 e a nave pisca. Deixe uma pedra bater com o escudo ligado e veja o que acontece quando ele chega a 0.',
      '3d': 'Clique no jogo e aperte Enter. O item vem pelo meio: com a nave parada, ela pega o item, e o Escudo, no alto à esquerda, vira 5.',
    },
    resumo: {
      '2d': 'Na Nave Contra Asteroides: o item que cai pelo meio, o escudo que liga, a pedra que só sai com o escudo ligado e o tempo que acaba.',
      '3d': 'O mesmo escudo na Patrulha Espacial: o item que vem pelo meio, o encontro que liga, a batida que pergunta e o prazo.',
    },
    programou:
      'Um relógio que solta o item só na partida, o encontro que liga o escudo, a batida que pergunta se ainda há tempo e um relógio que faz o escudo acabar, sem passar do zero. As mesmas ideias nas duas dimensões.',
    experiencia: escudoExperiencia,
    frases: {
      'aula-1': [
        'Jogue a nave com escudo e conheça o seu Poder.',
        'O seu Passo a passo, para consultar quando quiser.',
        'Quando a pedra tira vida, e quando o escudo segura?',
        'Um relógio solta o item pelo meio, só na partida.',
        'Pegar o item liga o escudo: tempoDoEscudo vira 5.',
        'Com escudo, a pedra só sai. Sem escudo, tira vida.',
        'A cada segundo, o escudo perde 1 e para no zero.',
        'Pense no escudo antes de seguir.',
      ],
      'aula-2': [
        'O escudo chegou à patrulha em três dimensões.',
        'O item vem pelo meio, a cada 4 segundos.',
        'O encontro com o item liga o escudo e escreve o número.',
        'A batida pergunta: o escudo ainda tem tempo?',
        'O prazo do escudo na patrulha. Envie o seu projeto.',
        'Pense no escudo da patrulha.',
      ],
    },
    etapas: ESCUDO_ETAPAS,
    aulas: escudoAulas as () => PoderAula<string>[],
    montar: (d, etapa) => montarProjetoEscudo(d, etapa as (typeof ESCUDO_ETAPAS)[number]),
  },
  triplo: {
    curso: 'poder-tiro-triplo',
    titulo: 'Tiro triplo',
    linha1: 'Tiro',
    linha2: 'triplo',
    frase: 'Três lasers de uma vez, cada um no seu caminho, em 2D e na patrulha 3D.',
    jogoPronto: {
      '2d': 'Clique no jogo e aperte Enter. Deixe a nave no meio e pegue o item que cai: o Triplo vira 5. Dispare e veja os três lasers; espere o Triplo chegar a 0 e dispare de novo.',
      '3d': 'Clique no jogo e aperte Enter. Leve a nave para a borda da esquerda: o item vem por ali, e o Triplo, no alto à esquerda, vira 5. Dispare e veja o leque.',
    },
    resumo: {
      '2d': 'Na Nave Contra Asteroides: o item do tiro triplo, o Espaço que pergunta, o vx de cada laser e o tempo que acaba.',
      '3d': 'O mesmo tiro triplo na Patrulha Espacial: o item pela esquerda, as três cópias, um grupo para cada lado e o prazo.',
    },
    programou:
      'Um relógio que solta o item só na partida, o encontro que liga o tiro triplo, o Espaço que pergunta se ele está ligado e cria três lasers em direções diferentes, e um relógio que faz o tiro triplo acabar, sem passar do zero.',
    experiencia: triploExperiencia,
    frases: {
      'aula-1': [
        'Jogue a nave com o tiro triplo e conheça o seu Poder.',
        'O seu Passo a passo, para consultar quando quiser.',
        'Quantos lasers saem, e onde cada um chega?',
        'O item cai pelo meio e liga o tiro triplo.',
        'Com o Triplo ligado, o Espaço cria três lasers.',
        'O vx de cada laser abre o leque.',
        'A cada segundo, o Triplo perde 1 e para no zero.',
        'Pense no tiro triplo antes de seguir.',
      ],
      'aula-2': [
        'O tiro triplo chegou à patrulha em três dimensões.',
        'O item vem pela esquerda e liga o tiro triplo.',
        'Com o Triplo ligado, três cópias do laser.',
        'Um grupo para cada lado abre o leque.',
        'O prazo do tiro triplo na patrulha. Envie o seu projeto.',
        'Pense no leque da patrulha.',
      ],
    },
    etapas: TRIPLO_ETAPAS,
    divisoes: {
      '2d:tres': [
        { titulo: 'O senão, com o tiro de sempre', depois: 'tres-0' },
        { titulo: 'O primeiro laser no então', depois: 'tres-1' },
        { titulo: 'O segundo laser', depois: 'tres-2' },
        { titulo: 'O terceiro laser e o som', depois: 'tres' },
      ],
      '2d:direcoes': [
        { titulo: 'O laser da esquerda', depois: 'direcoes-4' },
        { titulo: 'O laser da direita', depois: 'direcoes' },
      ],
      '3d:tres': [
        { titulo: 'O senão, com o tiro de sempre', depois: 'tres-0' },
        { titulo: 'A primeira cópia no então', depois: 'tres-1' },
        { titulo: 'As outras duas cópias e a nota', depois: 'tres' },
      ],
      '3d:direcoes': [
        { titulo: 'A cópia da esquerda', depois: 'direcoes-4' },
        { titulo: 'A cópia da direita', depois: 'direcoes' },
      ],
    },
    aulas: triploAulas as () => PoderAula<string>[],
    montar: (d, etapa) =>
      /^(tres|direcoes)-\d$/.test(etapa)
        ? montarProjetoTriplo(
            d,
            etapa.split('-')[0] as (typeof TRIPLO_ETAPAS)[number],
            Number(etapa.slice(-1)),
          )
        : montarProjetoTriplo(d, etapa as (typeof TRIPLO_ETAPAS)[number]),
  },
}

export const montagens = (aula: PoderAula<string>) =>
  aula.trechos.filter((t): t is MontagemPoder<string> => 'steps' in t)
