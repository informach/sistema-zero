/**
 * A corrida de balão das Nuvens (fase4-07, regras puras, sem three nem física): seis argolas de pé
 * em volta da ilha, uma de cada cor do arco-íris, na ordem. Passar de balão pela primeira começa a
 * corrida; pela sexta, chega. Três fitas do arco-íris no caminho são a terceira estrela. O tempo, as
 * estrelas e a tela são os do percurso genérico (`sistemas/percurso.ts`, `PERCURSO_DO_BALAO`).
 * Nada aqui aloca por passo.
 */
import { MELHOR_TEMPO_MAXIMO_MS } from '@sistemazero/arquipelago-contracts'
import type { Ponto } from './cipo'
import { type Corrida, criarCorrida, indiceDoSegredo } from './percurso'

/** As argolas, em metros, no referencial da ilha (o meio dela em x = z = 0, y no tampo). */
export const ARGOLAS = {
  /** O raio da argola (até o meio do tubo): o balão inteiro passa dentro (envelope de 2,35 m). */
  raio: 4.2,
  tubo: 0.22,
  /** Conta quando o meio do balão cruza o plano da argola a menos disto do meio dela. */
  passa: 1.8,
  /** O meio do balão fica isto acima da base do cesto (o envelope vai de 2,15 a 6,6 m). */
  meioDoBalao: 3.3,
  /** A volta das argolas, a esta distância do meio da ilha. */
  distancia: 15,
} as const

/**
 * Onde cada argola fica na volta (graus, com x = cos e z = sin) e a altura do meio dela acima do
 * tampo. A volta vai de −70° a 90°, longe das plataformas (126° a 191°), da árvore do ninho (136°)
 * e do mirante (233°); a primeira fica perto do lugar do balão (−56°).
 */
export const LUGARES_DAS_ARGOLAS: readonly { angulo: number; altura: number }[] = [
  { angulo: -70, altura: 5 },
  { angulo: -38, altura: 8 },
  { angulo: -6, altura: 11 },
  { angulo: 26, altura: 8 },
  { angulo: 58, altura: 11 },
  { angulo: 90, altura: 7 },
]

/** As fitas ficam entre as argolas 1 e 2, 3 e 4, 5 e 6, um pouco acima da linha entre elas. */
export const FITAS_DO_BALAO = { entre: [0, 2, 4], acima: 2 } as const

export interface Argola extends Ponto {
  /** Para onde a corrida vai ao passar por ela (a normal do plano dela, no chão). */
  rumo: number
}

const rad = (graus: number) => (graus * Math.PI) / 180

/** As argolas no referencial da ilha, na ordem da corrida (o rumo segue a volta). */
export function argolasNaIlha(tampo: number): Argola[] {
  return LUGARES_DAS_ARGOLAS.map(({ angulo, altura }) => {
    const a = rad(angulo)
    return {
      x: Math.cos(a) * ARGOLAS.distancia,
      y: tampo + altura,
      z: Math.sin(a) * ARGOLAS.distancia,
      // A volta cresce o ângulo: a tangente é (−sen a, cos a).
      rumo: Math.atan2(-Math.sin(a), Math.cos(a)),
    }
  })
}

/** As fitas no referencial da ilha: na volta, no meio do caminho entre duas argolas, mais alto. */
export function fitasNaIlha(tampo: number): Ponto[] {
  return FITAS_DO_BALAO.entre.map((i) => {
    const a = LUGARES_DAS_ARGOLAS[i] as { angulo: number; altura: number }
    const b = LUGARES_DAS_ARGOLAS[i + 1] as { angulo: number; altura: number }
    const meio = rad((a.angulo + b.angulo) / 2)
    return {
      x: Math.cos(meio) * ARGOLAS.distancia,
      y: tampo + (a.altura + b.altura) / 2 + FITAS_DO_BALAO.acima,
      z: Math.sin(meio) * ARGOLAS.distancia,
    }
  })
}

/**
 * O meio do balão foi de `de` para `ate` neste passo: passou por dentro da argola? (cruzou o plano
 * dela, em qualquer sentido, a menos de `ARGOLAS.passa` do meio).
 */
export function passouPelaArgola(g: Argola, de: Ponto, ate: Ponto): boolean {
  const nx = Math.sin(g.rumo)
  const nz = Math.cos(g.rumo)
  const antes = (de.x - g.x) * nx + (de.z - g.z) * nz
  const depois = (ate.x - g.x) * nx + (ate.z - g.z) * nz
  if (antes === depois || (antes > 0 && depois > 0) || (antes < 0 && depois < 0)) return false
  const t = antes / (antes - depois)
  const x = de.x + (ate.x - de.x) * t
  const y = de.y + (ate.y - de.y) * t
  const z = de.z + (ate.z - de.z) * t
  return Math.hypot(x - g.x, y - g.y, z - g.z) < ARGOLAS.passa
}

/** A corrida de balão: esperando a primeira argola (`corrida` nula) ou correndo. */
export interface CorridaDeBalao {
  corrida: Corrida | null
}

export type EventoDoBalao =
  | { tipo: 'comecou' }
  | { tipo: 'argola'; indice: number }
  | { tipo: 'fita'; indice: number }
  | { tipo: 'chegou' }
  | { tipo: 'desistiu' }
  | null

/**
 * Um passo do meio do balão, de `de` para `ate`, com `dtMs` de jogo. Antes de começar, só a
 * primeira argola conta (e começa); correndo, a próxima da ordem, e as fitas a `raioDaFita`. No
 * máximo um evento por passo, na ordem chegada, argola, fita. Passar de uma hora desiste.
 */
export function passoDaCorridaDeBalao(
  estado: CorridaDeBalao,
  de: Ponto,
  ate: Ponto,
  argolas: readonly Argola[],
  fitas: readonly Ponto[],
  raioDaFita: number,
  dtMs: number,
): EventoDoBalao {
  const c = estado.corrida
  if (!c) {
    const primeira = argolas[0]
    if (!primeira || !passouPelaArgola(primeira, de, ate)) return null
    const ultima = argolas.at(-1) ?? primeira
    const nova = criarCorrida(fitas.length, indiceDoSegredo(primeira, ultima, fitas))
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
  const proxima = argolas[c.deque + 1]
  if (proxima && passouPelaArgola(proxima, de, ate)) {
    c.deque++
    if (c.deque === argolas.length - 1) {
      c.situacao = 'chegou'
      c.tempoMs = Math.round(c.tempoMs)
      return { tipo: 'chegou' }
    }
    return { tipo: 'argola', indice: c.deque }
  }
  for (let i = 0; i < fitas.length; i++) {
    const f = fitas[i]
    if (!f || c.pegos[i]) continue
    if (Math.hypot(ate.x - f.x, ate.y - f.y, ate.z - f.z) < raioDaFita) {
      c.pegos[i] = true
      return { tipo: 'fita', indice: i }
    }
  }
  return null
}
