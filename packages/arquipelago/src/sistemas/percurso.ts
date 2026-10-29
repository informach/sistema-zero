/**
 * Um percurso com tempo e estrelas (regras puras, sem three nem física): o das copas do Bosque, a
 * entrega pelos telhados da Vila Doce e a subida ao cume do Pico Gelado. Largada perto do chão, um
 * ponto de volta em cada parada (deque, telhado ou trecho da trilha), coisas para pegar pelo
 * caminho (vagalumes, confeitos ou flocos de neve) e a chegada. Nada aqui aloca por quadro.
 */
import {
  MELHOR_TEMPO_MAXIMO_MS,
  type PercursoId,
  type ResultadoDoPercurso,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import type { Ponto } from './cipo'
import { receberPatins } from './patins'

/** O que muda de um percurso para outro (as contas são as mesmas). */
export interface ConfigDoPercurso {
  id: PercursoId
  /** O título da tela de resultado e o nome do cronômetro. */
  nome: string
  /** O texto do botão na largada. */
  rotuloDaLargada: string
  /** O que o Zappy diz ao começar e quando o percurso para sem chegar. */
  falaDoComeco: string
  falaDoFim: string
  /** A fala das três estrelas. */
  falaDasTresEstrelas: string
  /** Abaixo disto ganha a estrela do tempo. */
  tempoAlvoMs: number
  /** Quantas coisas estão espalhadas (pegar todas é a terceira estrela). */
  vagalumes: number
  /** O nome delas (a estrela, o cronômetro e o resultado) e o símbolo do cronômetro. */
  coletavel: { varios: string; Varios: string; simbolo: string }
  /** A coisa é pega a esta distância do centro do corpo. */
  raioDoVagalume: number
  /** Chegou: a esta distância (no chão) da chegada. */
  raioDaChegada: number
  /** Uma parada conta quando o corpo está em cima dela (o pé até isto abaixo do piso). */
  folgaDoDeque: number
  /** Antes da primeira parada, andar mais que isto (no chão) para longe da largada desiste. */
  distanciaParaDesistir: number
  /** Milissegundos do corte suave de volta à parada (escurece, leva e clareia). */
  corteSaiMs: number
  corteVoltaMs: number
  /** O que a chegada dá (os patins da entrega), com a fala; `null` quando não há nada a dar. */
  premio?: (s: Salvamento) => { salvamento: Salvamento; fala: string } | null
}

export const PERCURSO_DAS_COPAS = {
  id: 'bosque-copas',
  nome: 'Percurso nas copas',
  rotuloDaLargada: 'Começar o percurso nas copas',
  falaDoComeco: 'Valendo. Suba a escada e siga pelas copas até o escorregador.',
  falaDoFim: 'O percurso parou. A placa ao pé da escada começa de novo quando você quiser.',
  falaDasTresEstrelas: 'Três estrelas. Você voou pelas copas.',
  /**
   * Abaixo disto ganha a estrela do tempo. O caminho tem uns 42 m (escada, três pontes, a volta
   * nos deques e o escorregador): correndo sem errar dá uns 9 s e andando uns 19 s (velocidades de
   * `CORPO`); 24 s fica só para quem não cai: com uma queda, só correndo.
   */
  tempoAlvoMs: 24_000,
  /** Quantos vagalumes estão espalhados (pegar todos é a terceira estrela). */
  vagalumes: 5,
  coletavel: { varios: 'vagalumes', Varios: 'Vagalumes', simbolo: '✨' },
  /** O vagalume é pego a esta distância do centro do corpo. */
  raioDoVagalume: 0.8,
  /** Chegou: a esta distância (no chão) do fim do escorregador. */
  raioDaChegada: 1.4,
  /** Um deque conta quando o corpo está em cima dele (o pé até isto abaixo do piso). */
  folgaDoDeque: 0.3,
  /** Antes do primeiro deque, andar mais que isto (no chão) para longe da largada desiste. */
  distanciaParaDesistir: 7,
  /** Segundos do corte suave de volta ao deque (escurece, leva e clareia). */
  corteSaiMs: 260,
  corteVoltaMs: 340,
} as const satisfies ConfigDoPercurso

/**
 * A entrega pelos telhados da Vila Doce (fase2-05): o Bento manda um bolo para a sorveteria pelo
 * caminho de cima. Dos caixotes às três casinhas de telhado plano e ao terraço da sorveteria
 * (âncoras `telhados-*` do `vila-doce.glb`), com um confeito no ar em cada pulo.
 */
export const PERCURSO_DOS_TELHADOS = {
  id: 'vila-telhados',
  nome: 'Entrega pelos telhados',
  rotuloDaLargada: 'Começar a entrega pelos telhados',
  falaDoComeco:
    'Valendo. Suba nos caixotes e leve o bolo pelos telhados até o terraço da sorveteria.',
  falaDoFim: 'A entrega parou. Os caixotes começam de novo quando você quiser.',
  falaDasTresEstrelas: 'Três estrelas. O bolo chegou voando e inteiro.',
  /**
   * O caminho tem uns 19 m no plano (da largada aos caixotes, às três casinhas e ao terraço), com
   * quatro pulos de 0,8 a 1 m para cima: correndo (`CORPO.correr`) são uns 4 s mais os pulos, e
   * andando uns 9 s. 15 s deixa a estrela para quem para para mirar os pulos, não para quem cai
   * duas vezes.
   */
  tempoAlvoMs: 15_000,
  vagalumes: 4,
  coletavel: { varios: 'confeitos', Varios: 'Confeitos', simbolo: '🍬' },
  raioDoVagalume: 0.8,
  raioDaChegada: 1.2,
  folgaDoDeque: 0.3,
  distanciaParaDesistir: 6,
  corteSaiMs: 260,
  corteVoltaMs: 340,
  /** A primeira chegada traz os patins (`sistemas/patins.ts`). */
  premio: receberPatins,
} as const satisfies ConfigDoPercurso

/**
 * A subida ao cume do Pico Gelado (fase3-07): das bandeirinhas do começo da trilha, em volta da
 * montanha, até a bandeira do platô (âncoras `subida-*`, `floco-*` e `cume` do `pico.glb`), com
 * cinco flocos de neve flutuando na trilha.
 */
export const PERCURSO_DO_CUME = {
  id: 'pico-cume',
  nome: 'Subida ao cume',
  rotuloDaLargada: 'Começar a subida ao cume',
  falaDoComeco: 'Valendo. Suba a trilha em volta da montanha até a bandeira do cume.',
  falaDoFim: 'A subida parou. Nas bandeirinhas da trilha dá para começar de novo quando quiser.',
  falaDasTresEstrelas: 'Três estrelas. Você chegou ao cume com todos os flocos de neve.',
  /**
   * O caminho tem uns 31 m (1,7 m até a trilha, 27,4 m de trilha pela linha do meio, medidos no
   * Blender, e o platô até a bandeira): correndo (`CORPO.correr`) são uns 7 s e andando uns 14 s.
   * 18 s deixa a estrela para quem sobe andando sem parar, pegando os flocos do caminho.
   */
  tempoAlvoMs: 18_000,
  vagalumes: 5,
  coletavel: { varios: 'flocos de neve', Varios: 'Flocos de neve', simbolo: '❄️' },
  raioDoVagalume: 0.8,
  raioDaChegada: 1.2,
  folgaDoDeque: 0.3,
  distanciaParaDesistir: 6,
  corteSaiMs: 260,
  corteVoltaMs: 340,
} as const satisfies ConfigDoPercurso

/** Cada percurso pelo id (a tela do resultado e o cronômetro leem daqui). */
export const PERCURSOS_DO_JOGO: Readonly<Record<PercursoId, ConfigDoPercurso>> = {
  'bosque-copas': PERCURSO_DAS_COPAS,
  'vila-telhados': PERCURSO_DOS_TELHADOS,
  'pico-cume': PERCURSO_DO_CUME,
}

export interface DequeDoPercurso extends Ponto {
  raio: number
  /** Onde o corpo volta depois de uma queda (no piso do deque, longe do tronco). */
  volta: Ponto
  /** Para onde olhar ao voltar (o caminho segue por ali). */
  rumoDaVolta: number
}

/** Os pontos do percurso no mundo (a ilha lê das âncoras e das constantes do Bosque). */
export interface PontosDoPercurso {
  /** Onde a corrida começa (na frente da placa) e para onde olhar ali (a escada). */
  largada: Ponto
  rumoDaLargada: number
  deques: DequeDoPercurso[]
  chegada: Ponto
  vagalumes: Ponto[]
  /** O centro da ilha e o raio dela: sair da ilha desiste. */
  centro: Ponto
  raioDaIlha: number
}

export type SituacaoDaCorrida = 'correndo' | 'chegou' | 'desistiu'

/**
 * Uma corrida. O tempo é o do jogo, somado quadro a quadro enquanto ela anda (como a física): menu,
 * ferramenta aberta (a cena para), aba escondida e o corte de volta ao deque não contam.
 */
export interface Corrida {
  situacao: SituacaoDaCorrida
  /** O tempo corrido até agora (e, depois de chegar, o tempo final). */
  tempoMs: number
  /** O último deque alcançado (−1 = nenhum ainda). */
  deque: number
  pegos: boolean[]
}

export function criarCorrida(vagalumes: number): Corrida {
  return {
    situacao: 'correndo',
    tempoMs: 0,
    deque: -1,
    pegos: Array.from({ length: vagalumes }, () => false),
  }
}

export function vagalumesPegos(c: Corrida): number {
  let n = 0
  for (const p of c.pegos) if (p) n++
  return n
}

export type EventoDaCorrida =
  | { tipo: 'deque'; indice: number }
  | { tipo: 'vagalume'; indice: number }
  | { tipo: 'caiu'; deque: number }
  | { tipo: 'chegou' }
  | { tipo: 'desistiu' }
  | null

/** O que o personagem é agora, lido a cada quadro. */
export interface CorpoNaCorrida {
  /** O centro do corpo. */
  x: number
  y: number
  z: number
  /** A altura dos pés. */
  pes: number
  /** Pisando no chão da ilha (não num deque, ponte, degrau ou escorregador). */
  noChaoDaIlha: boolean
}

/**
 * Um quadro da corrida, com `dtMs` de jogo: no máximo um evento por quadro, na ordem chegada,
 * parada, coisa pega, queda, desistência (chegar ao fim nunca conta como queda).
 * Passar de uma hora desiste: o salvamento não guarda tempo acima disso.
 */
export function passoDaCorrida(
  c: Corrida,
  corpo: CorpoNaCorrida,
  pontos: PontosDoPercurso,
  dtMs: number,
  config: ConfigDoPercurso = PERCURSO_DAS_COPAS,
): EventoDaCorrida {
  if (c.situacao !== 'correndo') return null
  c.tempoMs += Math.max(0, dtMs)
  if (c.tempoMs > MELHOR_TEMPO_MAXIMO_MS) {
    c.situacao = 'desistiu'
    return { tipo: 'desistiu' }
  }
  const ultimo = pontos.deques.length - 1
  const chegada = pontos.chegada
  if (
    c.deque === ultimo &&
    Math.hypot(corpo.x - chegada.x, corpo.z - chegada.z) < config.raioDaChegada &&
    corpo.pes < chegada.y + 0.6
  ) {
    c.situacao = 'chegou'
    c.tempoMs = Math.round(c.tempoMs)
    return { tipo: 'chegou' }
  }
  for (let i = pontos.deques.length - 1; i > c.deque; i--) {
    const d = pontos.deques[i]
    if (!d) continue
    if (
      Math.hypot(corpo.x - d.x, corpo.z - d.z) < d.raio &&
      corpo.pes > d.y - config.folgaDoDeque
    ) {
      c.deque = i
      return { tipo: 'deque', indice: i }
    }
  }
  for (let i = 0; i < pontos.vagalumes.length; i++) {
    const v = pontos.vagalumes[i]
    if (!v || c.pegos[i]) continue
    if (Math.hypot(corpo.x - v.x, corpo.y - v.y, corpo.z - v.z) < config.raioDoVagalume) {
      c.pegos[i] = true
      return { tipo: 'vagalume', indice: i }
    }
  }
  if (c.deque >= 0 && corpo.noChaoDaIlha) return { tipo: 'caiu', deque: c.deque }
  const foraDaIlha =
    Math.hypot(corpo.x - pontos.centro.x, corpo.z - pontos.centro.z) > pontos.raioDaIlha + 1
  const longeDaLargada =
    c.deque < 0 &&
    corpo.noChaoDaIlha &&
    Math.hypot(corpo.x - pontos.largada.x, corpo.z - pontos.largada.z) >
      config.distanciaParaDesistir
  if (foraDaIlha || longeDaLargada) {
    c.situacao = 'desistiu'
    return { tipo: 'desistiu' }
  }
  return null
}

/** As estrelas de UMA corrida que chegou. */
export function estrelasDaCorrida(
  c: Corrida,
  config: ConfigDoPercurso = PERCURSO_DAS_COPAS,
): ResultadoDoPercurso['estrelas'] {
  return {
    chegada: c.situacao === 'chegou',
    tempo: c.situacao === 'chegou' && c.tempoMs <= config.tempoAlvoMs,
    vagalumes: c.situacao === 'chegou' && vagalumesPegos(c) === c.pegos.length,
  }
}

/**
 * O melhor resultado depois desta corrida: cada estrela fica para sempre (podem vir de corridas
 * diferentes) e o melhor tempo é o menor. Corrida que não chegou não muda nada.
 */
export function juntarResultado(
  antes: ResultadoDoPercurso | undefined,
  c: Corrida,
  config: ConfigDoPercurso = PERCURSO_DAS_COPAS,
): ResultadoDoPercurso | undefined {
  if (c.situacao !== 'chegou') return antes
  const agora = estrelasDaCorrida(c, config)
  if (!antes) return { estrelas: agora, melhorTempoMs: c.tempoMs }
  return {
    estrelas: {
      chegada: antes.estrelas.chegada || agora.chegada,
      tempo: antes.estrelas.tempo || agora.tempo,
      vagalumes: antes.estrelas.vagalumes || agora.vagalumes,
    },
    melhorTempoMs: Math.min(antes.melhorTempoMs, c.tempoMs),
  }
}

export function quantasEstrelas(e: ResultadoDoPercurso['estrelas']): number {
  return Number(e.chegada) + Number(e.tempo) + Number(e.vagalumes)
}

/** "0:23,4": minutos, segundos e o décimo (o cronômetro e a tela de resultado). */
export function formatarTempo(ms: number): string {
  const decimos = Math.floor(Math.max(0, ms) / 100)
  const min = Math.floor(decimos / 600)
  const seg = Math.floor((decimos % 600) / 10)
  return `${min}:${String(seg).padStart(2, '0')},${decimos % 10}`
}
