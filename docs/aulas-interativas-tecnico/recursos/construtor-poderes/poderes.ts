/**
 * Os Poderes do Construtor para os recursos (caderno e capas): a fonte editorial, as etapas e os
 * projetos de cada um, e os textos da capa do caderno.
 */

import { armaAulas, armaExperiencia } from '../../qa/arma-conteudo'
import { ARMA_ETAPAS, montarProjetoArma } from '../../qa/arma-projeto'
import { chefaoAulas, chefaoExperiencia } from '../../qa/chefao-conteudo'
import { CHEFAO_ETAPAS, montarProjetoChefao } from '../../qa/chefao-projeto'
import type { PoderDimensaoConstrutor } from '../../qa/construtor-poderes-base'
import type { MontagemPoder } from '../../qa/construtor-poderes-conteudo'
import { escudoAulas, escudoExperiencia } from '../../qa/escudo-conteudo'
import { ESCUDO_ETAPAS, montarProjetoEscudo } from '../../qa/escudo-projeto'
import { inimigoAulas, inimigoExperiencia } from '../../qa/inimigo-conteudo'
import { INIMIGO_ETAPAS, montarProjetoInimigo } from '../../qa/inimigo-projeto'
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
  inimigo: {
    curso: 'poder-inimigo-que-atira',
    titulo: 'Inimigo que atira',
    linha1: 'Inimigo',
    linha2: 'que atira',
    frase: 'Uma nave inimiga com tiros próprios, em 2D e na patrulha 3D.',
    jogoPronto: {
      '2d': 'Clique no jogo e aperte Enter. A nave inimiga patrulha o alto e atira a cada um segundo e meio: desvie dos tiros dela e acerte os asteroides.',
      '3d': 'Clique no jogo e aperte Enter. A inimiga anda lá na frente e atira na direção da nave: desvie dos tiros.',
    },
    resumo: {
      '2d': 'Na Nave Contra Asteroides: o relógio dos tiros, a origem na inimiga, o dano na nave e a limpeza dos tiros.',
      '3d': 'A mesma inimiga na Patrulha Espacial: as cópias do tiro, a posição x da inimiga, o encontro e a limpeza.',
    },
    programou:
      'Um relógio que cria os tiros só na partida, a origem que lê a posição da inimiga, o encontro que tira a vida e a limpeza de quem sai da tela. Uma partida nova começa sem tiros.',
    experiencia: inimigoExperiencia,
    frases: {
      'aula-1': [
        'Jogue contra a nave inimiga e conheça o seu Poder.',
        'O seu Passo a passo, para consultar quando quiser.',
        'De onde sai cada tiro da inimiga?',
        'Um relógio cria os tiros, só na partida.',
        'O tiro nasce embaixo da inimiga.',
        'O tiro que encosta na nave tira uma vida.',
        'Os tiros que saem da tela saem do grupo.',
        'Pense na inimiga antes de seguir.',
      ],
      'aula-2': [
        'A inimiga chegou à patrulha em três dimensões.',
        'Um relógio cria as cópias do tiro.',
        'O tiro sai da frente da inimiga.',
        'O tiro inimigo machuca a nave.',
        'A limpeza dos tiros. Envie o seu projeto.',
        'Pense na inimiga da patrulha.',
      ],
    },
    etapas: INIMIGO_ETAPAS,
    aulas: inimigoAulas as () => PoderAula<string>[],
    montar: (d, etapa) => montarProjetoInimigo(d, etapa as (typeof INIMIGO_ETAPAS)[number]),
  },
  chefao: {
    curso: 'poder-chefao-com-resistencia',
    titulo: 'Chefão com resistência',
    linha1: 'Chefão com',
    linha2: 'resistência',
    frase:
      'Um chefão que aguenta cinco lasers e um prêmio que vale uma vez, em 2D e na patrulha 3D.',
    jogoPronto: {
      '2d': 'Clique no jogo e aperte Enter. O chefão espera no alto, com a barra de vida embaixo. Deixe a nave no meio, dispare e conte quantos lasers ele aguenta. Depois olhe o placar.',
      '3d': 'Clique no jogo e aperte Enter. O chefão espera lá na frente, e o texto Chefão, no alto à esquerda, mostra a vida dele. Dispare com a nave no meio.',
    },
    resumo: {
      '2d': 'Na Nave Contra Asteroides: a vida do chefão na barra, o laser que tira 1, o fim no zero e a guarda que faz o prêmio valer uma vez.',
      '3d': 'O mesmo chefão na Patrulha Espacial: a vida no texto, o encontro do chefão com os lasers, o fim no zero e a guarda.',
    },
    programou:
      'Uma variável com a vida do chefão, o encontro que tira o laser e 1 da vida, o Se que derruba o chefão no zero e a guarda que faz o prêmio valer uma vez só. As mesmas ideias nas duas dimensões.',
    experiencia: chefaoExperiencia,
    frases: {
      'aula-1': [
        'Enfrente o chefão e conheça o seu Poder.',
        'O seu Passo a passo, para consultar quando quiser.',
        'Quantos lasers o chefão aguenta?',
        'A vida do chefão numa variável, com a barra.',
        'Cada laser que acerta sai e tira 1.',
        'No zero, o chefão cai e dá o prêmio.',
        'A guarda faz o prêmio valer uma vez.',
        'Pense no chefão antes de seguir.',
      ],
      'aula-2': [
        'O chefão chegou à patrulha em três dimensões.',
        'A vida do chefão no alto, à esquerda.',
        'O chefão encosta num laser: a vida perde 1.',
        'No zero, o chefão sai e dá o prêmio.',
        'O prêmio vale uma vez. Envie o seu projeto.',
        'Pense no chefão da patrulha.',
      ],
    },
    etapas: CHEFAO_ETAPAS,
    aulas: chefaoAulas as () => PoderAula<string>[],
    montar: (d, etapa) => montarProjetoChefao(d, etapa as (typeof CHEFAO_ETAPAS)[number]),
  },
  arma: {
    curso: 'poder-troca-de-arma',
    titulo: 'Troca de arma',
    linha1: 'Troca',
    linha2: 'de arma',
    frase: 'Duas armas para a nave, laser e plasma, em 2D e na patrulha 3D.',
    jogoPronto: {
      '2d': 'Clique no jogo e aperte Enter. A placa mostra a arma. Deixe a nave no meio para pegar o item roxo, aperte E e dispare: o plasma é grande e lento.',
      '3d': 'Clique no jogo e aperte Enter. O item vem pela esquerda: pegue, aperte E e olhe o texto Arma, no alto à esquerda. Dispare com as duas armas.',
    },
    resumo: {
      '2d': 'Na Nave Contra Asteroides: o item que libera o plasma, a tecla E que troca, a placa da arma e o Espaço que pergunta.',
      '3d': 'A mesma troca na Patrulha Espacial: o item pela esquerda, a tecla E, o texto escrito de novo e o Espaço que pergunta.',
    },
    programou:
      'Um relógio que solta o item só na partida, o encontro que libera o plasma, a tecla E que só troca com o plasma liberado, a placa da arma e o Espaço que pergunta qual arma está na mão. Uma partida nova volta ao laser.',
    experiencia: armaExperiencia,
    frases: {
      'aula-1': [
        'Troque de arma e conheça o seu Poder.',
        'O seu Passo a passo, para consultar quando quiser.',
        'O que a tecla E faz antes do item?',
        'O item cai pelo meio e libera o plasma.',
        'A tecla E troca, mas só com o plasma liberado.',
        'A placa mostra qual é a arma.',
        'O Espaço pergunta a arma antes de atirar.',
        'Pense na troca de arma antes de seguir.',
      ],
      'aula-2': [
        'A troca de arma chegou à patrulha em três dimensões.',
        'O item vem pela esquerda e libera o plasma.',
        'A tecla E troca a arma na patrulha.',
        'O texto da arma é escrito de novo a cada troca.',
        'O Espaço pergunta a arma. Envie o seu projeto.',
        'Pense na troca de arma da patrulha.',
      ],
    },
    etapas: ARMA_ETAPAS,
    divisoes: {
      '2d:disparo': [
        { titulo: 'O Se da arma, com o laser no senão', depois: 'disparo-senao' },
        { titulo: 'O plasma no então', depois: 'disparo' },
      ],
    },
    aulas: armaAulas as () => PoderAula<string>[],
    montar: (d, etapa) =>
      etapa === 'disparo-senao'
        ? montarProjetoArma(d, 'disparo', true)
        : montarProjetoArma(d, etapa as (typeof ARMA_ETAPAS)[number]),
  },
}

export const montagens = (aula: PoderAula<string>) =>
  aula.trechos.filter((t): t is MontagemPoder<string> => 'steps' in t)
