/**
 * Um percurso com tempo e estrelas (regras puras, sem three nem física): o das copas do Bosque.
 * Largada na placa ao pé da escada, um ponto de volta em cada deque, vagalumes pelo caminho e a
 * chegada no fim do escorregador. Nada aqui aloca por quadro.
 */
import {
  MELHOR_TEMPO_MAXIMO_MS,
  type ResultadoDoPercurso,
} from '@sistemazero/arquipelago-contracts'
import type { Ponto } from './cipo'

export const PERCURSO_DAS_COPAS = {
  id: 'bosque-copas',
  /**
   * Abaixo disto ganha a estrela do tempo. O caminho tem uns 40 m (escada, três pontes, a volta
   * nos deques e o escorregador): correndo sem errar dá uns 10 s e andando uns 15 s; 20 s fica
   * só para quem não cai: com uma queda, só correndo.
   */
  tempoAlvoMs: 20_000,
  /** Quantos vagalumes estão espalhados (pegar todos é a terceira estrela). */
  vagalumes: 5,
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
} as const

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
 * deque, vagalume, queda, desistência (chegar ao fim do escorregador nunca conta como queda).
 * Passar de uma hora desiste: o salvamento não guarda tempo acima disso.
 */
export function passoDaCorrida(
  c: Corrida,
  corpo: CorpoNaCorrida,
  pontos: PontosDoPercurso,
  dtMs: number,
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
    Math.hypot(corpo.x - chegada.x, corpo.z - chegada.z) < PERCURSO_DAS_COPAS.raioDaChegada &&
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
      corpo.pes > d.y - PERCURSO_DAS_COPAS.folgaDoDeque
    ) {
      c.deque = i
      return { tipo: 'deque', indice: i }
    }
  }
  for (let i = 0; i < pontos.vagalumes.length; i++) {
    const v = pontos.vagalumes[i]
    if (!v || c.pegos[i]) continue
    if (
      Math.hypot(corpo.x - v.x, corpo.y - v.y, corpo.z - v.z) < PERCURSO_DAS_COPAS.raioDoVagalume
    ) {
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
      PERCURSO_DAS_COPAS.distanciaParaDesistir
  if (foraDaIlha || longeDaLargada) {
    c.situacao = 'desistiu'
    return { tipo: 'desistiu' }
  }
  return null
}

/** As estrelas de UMA corrida que chegou. */
export function estrelasDaCorrida(c: Corrida): ResultadoDoPercurso['estrelas'] {
  return {
    chegada: c.situacao === 'chegou',
    tempo: c.situacao === 'chegou' && c.tempoMs <= PERCURSO_DAS_COPAS.tempoAlvoMs,
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
): ResultadoDoPercurso | undefined {
  if (c.situacao !== 'chegou') return antes
  const agora = estrelasDaCorrida(c)
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
