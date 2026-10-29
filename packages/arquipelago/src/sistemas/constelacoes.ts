/**
 * As constelações escondidas das Nuvens (fase4-07, regras puras, sem three): à noite, no mirante,
 * olhar pela luneta e mirar o céu; segurar a mira numa figura acende ela, uma estrela por vez, e o
 * Zappy diz o nome. As achadas ficam no salvamento V16, em `nuvens.constelacoes`,
 * com um bit por figura. Reabrir o jogo mantém as descobertas.
 */
import type { Ponto } from './cipo'

export const PAINEL_DAS_ESTRELAS = 'luneta-das-estrelas'

/**
 * As seis figuras do `nuvens-constelacoes.glb`, na ordem dos nós `constelacao-1` a `-6`
 * (`arte/ilhas-b/README.md`), com o nome que o Zappy diz.
 */
export const FIGURAS = [
  { nome: 'arara', fala: 'Achou a constelação da arara. É a Iriê de asa aberta.' },
  { nome: 'balão', fala: 'Achou a constelação do balão.' },
  { nome: 'vagalume', fala: 'Achou a constelação do vagalume. A cauda dele brilha.' },
  { nome: 'peixe', fala: 'Achou a constelação do peixe.' },
  { nome: 'farol', fala: 'Achou a constelação do farol, com o facho aceso.' },
  { nome: 'nota musical', fala: 'Achou a constelação da nota musical.' },
] as const

/** Os números da busca, em radianos e segundos. */
export const ESTRELAS = {
  /** A mira gira e sobe nesta velocidade com o direcional todo para um lado. */
  velocidade: 0.8,
  /** A inclinação da mira (acima do horizonte): do baixo ao quase a pino. */
  inclinacao: { minima: 0.1, maxima: 1.35, inicial: 0.55 },
  /** A figura está na mira quando o meio dela fica a menos disto do centro da vista. */
  angulo: (7 * Math.PI) / 180,
  /** Segurar a mira na figura por este tempo acende ela. */
  segurar: 1.2,
  /** As estrelas aparecem uma por uma neste tempo (todas juntas com menos movimento). */
  acender: 1,
  /** O campo de visão da luneta (graus): aproxima o céu. */
  campo: 38,
} as const

export const FALA_DE_DIA =
  'As estrelas só aparecem à noite. Volte aqui no mirante quando escurecer.'
export const FALA_DA_LUNETA =
  'Mire o céu com as setas. Segure a mira numa figura de estrelas para ela acender.'
export const FALA_DE_TODAS = 'As seis constelações das Nuvens estão acesas.'

/** Para onde a luneta mira: o giro no chão (`(sin g, cos g)`) e a inclinação acima do horizonte. */
export interface Mira {
  giro: number
  inclinacao: number
}

/** Mexe a mira com o direcional (−1 a 1 em cada eixo): para os lados gira, para cima sobe. */
export function passoDaMira(m: Mira, eixoX: number, eixoZ: number, dt: number): void {
  // O direcional para a direita gira a vista para a direita (o giro diminui olhando para +z).
  m.giro -= eixoX * ESTRELAS.velocidade * dt
  m.inclinacao = Math.min(
    ESTRELAS.inclinacao.maxima,
    Math.max(ESTRELAS.inclinacao.minima, m.inclinacao + eixoZ * ESTRELAS.velocidade * dt),
  )
}

/** A direção da mira (unitária), escrita em `saida`. */
export function direcaoDaMira(m: Mira, saida: Ponto): Ponto {
  const c = Math.cos(m.inclinacao)
  saida.x = Math.sin(m.giro) * c
  saida.y = Math.sin(m.inclinacao)
  saida.z = Math.cos(m.giro) * c
  return saida
}

/**
 * A figura na mira: a de meio mais perto do centro da vista, dentro de `ESTRELAS.angulo`, ou −1.
 * `de` é o olho na luneta; `direcao`, a da mira (unitária).
 */
export function figuraNaMira(de: Ponto, direcao: Ponto, meios: readonly Ponto[]): number {
  let melhor = -1
  let menor = ESTRELAS.angulo
  for (let i = 0; i < meios.length; i++) {
    const p = meios[i]
    if (!p) continue
    const dx = p.x - de.x
    const dy = p.y - de.y
    const dz = p.z - de.z
    const d = Math.hypot(dx, dy, dz) || 1
    const cos = (dx * direcao.x + dy * direcao.y + dz * direcao.z) / d
    const angulo = Math.acos(Math.min(1, Math.max(-1, cos)))
    if (angulo < menor) {
      menor = angulo
      melhor = i
    }
  }
  return melhor
}

/** A busca em andamento: qual figura está na mira e há quanto tempo. */
export interface Busca {
  figura: number
  segundos: number
}

/**
 * Um passo da busca com a figura na mira agora (−1 = nenhuma). Devolve a figura que acendeu neste
 * passo, ou −1. Uma já achada não acende de novo; tirar a mira dela recomeça a contagem.
 */
export function passoDaBusca(b: Busca, naMira: number, achadas: number, dt: number): number {
  if (naMira < 0 || (achadas & (1 << naMira)) !== 0) {
    b.figura = -1
    b.segundos = 0
    return -1
  }
  if (b.figura !== naMira) {
    b.figura = naMira
    b.segundos = 0
  }
  b.segundos += dt
  if (b.segundos < ESTRELAS.segurar) return -1
  b.figura = -1
  b.segundos = 0
  return naMira
}

/** Quantas estrelas de uma figura (de `total`) estão acesas `segundos` depois de ela acender. */
export function estrelasAcesas(segundos: number, total: number, menosMovimento: boolean): number {
  if (menosMovimento) return total
  return Math.min(total, Math.floor((segundos / ESTRELAS.acender) * total) + 1)
}

/** Quantas figuras estão achadas no número de bits. */
export function quantasAchadas(achadas: number): number {
  let n = 0
  for (let i = 0; i < FIGURAS.length; i++) if (achadas & (1 << i)) n++
  return n
}
