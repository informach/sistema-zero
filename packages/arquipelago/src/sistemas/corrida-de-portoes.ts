/**
 * As corridas de portões dos brinquedos de ilha (lacunas, 01/11/2026; a proposta: "Trenó no Pico,
 * montaria no Vale, balão nas Nuvens, barco entre ilhas. Cada um é um minijogo e um jeito de
 * chegar."). Regras puras, no molde da corrida de balão (`corrida-de-balao.ts`): portões em ordem
 * (o primeiro começa, o último chega), coisas para pegar no caminho com uma escondida (a terceira
 * estrela, §6.28 A9), o tempo e a tela do percurso genérico. Os portões ficam no chão: contam no
 * plano (x, z) com uma folga de altura, para o trenó na pista e o dino no chão irregular.
 */
import { MELHOR_TEMPO_MAXIMO_MS } from '@sistemazero/arquipelago-contracts'
import type { Ponto } from './cipo'
import { type Corrida, criarCorrida, indiceDoSegredo } from './percurso'

/** Um portão: o meio dele, para onde a corrida segue ao passar (`rumo`, como o das argolas) e a
 * meia largura. */
export interface Portao extends Ponto {
  rumo: number
  meiaLargura: number
}

/** Quanto acima ou abaixo do meio do portão ainda conta (o corpo no trenó, a criança montada). */
export const FOLGA_DE_ALTURA = 2.5

/** O rumo de `a` para `b` no chão (o mesmo jeito das argolas: a direção é `(sen, cos)`). */
export function rumoDe(a: Ponto, b: Ponto): number {
  return Math.atan2(b.x - a.x, b.z - a.z)
}

/**
 * Os portões de um caminho em ordem: cada um olha para o próximo (o último, na direção de quem
 * vinha).
 */
export function portoesDoCaminho(pontos: readonly Ponto[], meiaLargura: number): Portao[] {
  return pontos.map((p, i) => {
    const antes = pontos[i - 1]
    const depois = pontos[i + 1]
    const rumo = depois ? rumoDe(p, depois) : antes ? rumoDe(antes, p) : 0
    return { x: p.x, y: p.y, z: p.z, rumo, meiaLargura }
  })
}

/** O corpo foi de `de` para `ate` neste passo: passou pelo portão (cruzou a linha dele)? */
export function passouPeloPortao(g: Portao, de: Ponto, ate: Ponto): boolean {
  const nx = Math.sin(g.rumo)
  const nz = Math.cos(g.rumo)
  const antes = (de.x - g.x) * nx + (de.z - g.z) * nz
  const depois = (ate.x - g.x) * nx + (ate.z - g.z) * nz
  if (antes === depois || (antes > 0 && depois > 0) || (antes < 0 && depois < 0)) return false
  const t = antes / (antes - depois)
  const x = de.x + (ate.x - de.x) * t
  const y = de.y + (ate.y - de.y) * t
  const z = de.z + (ate.z - de.z) * t
  // Na linha do portão: a distância de lado (perpendicular ao rumo) e a altura.
  const lado = Math.abs((x - g.x) * nz - (z - g.z) * nx)
  return lado <= g.meiaLargura && Math.abs(y - g.y) <= FOLGA_DE_ALTURA
}

/** A corrida de portões: esperando o primeiro (`corrida` nula) ou correndo. */
export interface CorridaDePortoes {
  corrida: Corrida | null
}

export type EventoDosPortoes =
  | { tipo: 'comecou' }
  | { tipo: 'portao'; indice: number }
  | { tipo: 'coleta'; indice: number }
  | { tipo: 'chegou' }
  | { tipo: 'desistiu' }
  | null

/**
 * Um passo do corpo, de `de` para `ate`, com `dtMs` de jogo. Antes de começar, só o primeiro portão
 * conta; correndo, o próximo da ordem, e as coisas a `raio` (no chão, com a folga de altura). No
 * máximo um evento por passo. Passar de uma hora desiste.
 */
export function passoDaCorridaDePortoes(
  estado: CorridaDePortoes,
  de: Ponto,
  ate: Ponto,
  portoes: readonly Portao[],
  coisas: readonly Ponto[],
  raio: number,
  dtMs: number,
): EventoDosPortoes {
  const c = estado.corrida
  if (!c) {
    const primeiro = portoes[0]
    if (!primeiro || !passouPeloPortao(primeiro, de, ate)) return null
    const ultimo = portoes.at(-1) ?? primeiro
    const nova = criarCorrida(coisas.length, indiceDoSegredo(primeiro, ultimo, coisas))
    nova.deque = 0
    estado.corrida = nova
    return { tipo: 'comecou' }
  }
  if (c.situacao !== 'correndo') return null
  c.tempoMs += Math.max(0, dtMs)
  if (c.tempoMs > MELHOR_TEMPO_MAXIMO_MS) {
    c.situacao = 'desistiu'
    return { tipo: 'desistiu' }
  }
  const proximo = portoes[c.deque + 1]
  if (proximo && passouPeloPortao(proximo, de, ate)) {
    c.deque++
    if (c.deque === portoes.length - 1) {
      c.situacao = 'chegou'
      c.tempoMs = Math.round(c.tempoMs)
      return { tipo: 'chegou' }
    }
    return { tipo: 'portao', indice: c.deque }
  }
  for (let i = 0; i < coisas.length; i++) {
    const f = coisas[i]
    if (!f || c.pegos[i]) continue
    if (Math.hypot(ate.x - f.x, ate.z - f.z) < raio && Math.abs(ate.y - f.y) <= FOLGA_DE_ALTURA) {
      c.pegos[i] = true
      return { tipo: 'coleta', indice: i }
    }
  }
  return null
}

// ── O trenó do Pico ─────────────────────────────────────────────────────────────────────────────

/**
 * Os portões da descida de trenó, nos pontos `treno-curva-N` do `pico.glb` (26, do platô ao pé):
 * do segundo ponto, a cada cinco, e o penúltimo. As bandeirinhas ficam no meio do caminho entre dois portões.
 */
export const TRENO_PORTOES_A_CADA = 5
/** A meia largura do portão do trenó: a trilha tem 1,75 m de chão. */
export const MEIA_LARGURA_DO_TRENO = 1.3
/** Quanto a bandeirinha fica para o lado da linha do meio (o trenó mexe 0,7 m para cada lado). */
export const LADO_DA_BANDEIRINHA = 0.55

/** Escolhe os portões e as bandeirinhas a partir dos pontos da pista (no referencial da ilha). */
export function corridaDoTreno(curva: readonly Ponto[]): { portoes: Portao[]; coisas: Ponto[] } {
  if (curva.length < 2) return { portoes: [], coisas: [] }
  // O primeiro portão fica no segundo ponto: quem senta no trenó, no primeiro, passa por ele logo.
  const indices: number[] = []
  // O último fica no penúltimo ponto: o trenó para no fim da pista e precisa cruzar a linha antes.
  for (let i = 1; i < curva.length - 2; i += TRENO_PORTOES_A_CADA) indices.push(i)
  indices.push(curva.length - 2)
  const pontos = indices.map((i) => curva[i] as Ponto)
  const portoes = portoesDoCaminho(pontos, MEIA_LARGURA_DO_TRENO)
  // Uma bandeirinha no meio de cada trecho, um palmo acima do chão, alternando para um lado e para
  // o outro da pista: descer reto pelo meio não pega todas, é preciso guiar o trenó.
  const coisas: Ponto[] = []
  for (let k = 0; k < indices.length - 1; k++) {
    const i = Math.round(((indices[k] as number) + (indices[k + 1] as number)) / 2)
    const meio = curva[i]
    const seguinte = curva[i + 1] ?? meio
    if (!meio || !seguinte) continue
    const rumo = rumoDe(meio, seguinte)
    const lado = (k % 2 === 0 ? 1 : -1) * LADO_DA_BANDEIRINHA
    coisas.push({
      x: meio.x + Math.cos(rumo) * lado,
      y: meio.y + 0.6,
      z: meio.z - Math.sin(rumo) * lado,
    })
  }
  return { portoes, coisas }
}

// ── A montaria do Vale ──────────────────────────────────────────────────────────────────────────

/**
 * A corrida da montaria pela praia do Vale, no referencial da ilha (graus com x = cos e z = sen, e
 * a distância do meio): um arco pela faixa de areia livre, de 0° a 105°. É o trecho de praia sem
 * nada no caminho com folga para o dino: depois dele vêm a moita e o ninho do norte (120° a 140°),
 * o cais (180°) e as pedras e coqueiros do sudeste (300° a 345°). O teste confere cada portão e
 * cada trecho contra os colisores e o chão do `vale-dos-dinos.glb`.
 */
export const PORTOES_DA_MONTARIA: readonly { angulo: number; distancia: number }[] = [
  { angulo: 0, distancia: 11 },
  { angulo: 21, distancia: 12.25 },
  { angulo: 42, distancia: 14 },
  { angulo: 63, distancia: 13.5 },
  { angulo: 84, distancia: 13 },
  { angulo: 105, distancia: 12.75 },
]
/** A altura da areia da praia do Vale no arquivo (o tampo da ilha é 1; a praia, uns 0,6). */
export const AREIA_DO_VALE = 0.6
/** A meia largura do portão da montaria: o dino tem uns 1,2 m de largura. */
export const MEIA_LARGURA_DA_MONTARIA = 2

const rad = (graus: number) => (graus * Math.PI) / 180

export function corridaDaMontaria(): { portoes: Portao[]; coisas: Ponto[] } {
  const pontos = PORTOES_DA_MONTARIA.map(({ angulo, distancia }) => ({
    x: Math.cos(rad(angulo)) * distancia,
    y: AREIA_DO_VALE,
    z: Math.sin(rad(angulo)) * distancia,
  }))
  const portoes = portoesDoCaminho(pontos, MEIA_LARGURA_DA_MONTARIA)
  // Um fóssil brilhante entre cada dois portões, na mesma volta, um pouco acima da areia.
  const coisas = PORTOES_DA_MONTARIA.slice(0, -1).map((a, i) => {
    const b = PORTOES_DA_MONTARIA[i + 1] as { angulo: number; distancia: number }
    const angulo = rad((a.angulo + b.angulo) / 2)
    const distancia = (a.distancia + b.distancia) / 2 - 0.3
    return {
      x: Math.cos(angulo) * distancia,
      y: AREIA_DO_VALE + 1.2,
      z: Math.sin(angulo) * distancia,
    }
  })
  return { portoes, coisas }
}
