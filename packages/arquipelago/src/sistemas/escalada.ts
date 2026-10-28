/**
 * Escalar um tronco (regras puras, sem three nem física). O tronco é um cone em pé, um pouco
 * torto: o meio vai de `base` a `topo` e o raio (da casca desenhada) de `raioBase` a `raioTopo`.
 * O corpo gruda na casca, sobe, desce e dá a volta no tronco; pular solta para fora.
 *
 * Convenção de direção: um `lado` `a` aponta para `(sin a, cos a)` no chão, a mesma do giro do
 * avatar. O corpo fica no `lado` e olha para o tronco.
 */
import type { Ponto } from './cipo'

export interface Tronco {
  base: Ponto
  topo: Ponto
  raioBase: number
  raioTopo: number
}

export const ESCALADA = {
  /** Subir e descer, em metros por segundo. */
  subir: 1.7,
  /** Dar a volta no tronco, em metros por segundo (medido na casca). */
  deLado: 1.6,
  /** Do corpo à casca (o corpo encosta sem entrar). */
  folga: 0.08,
  /** Andando contra a casca a menos disto, o corpo gruda. */
  distanciaParaGrudar: 0.3,
  /** Segundos andando contra a casca antes de grudar (passar raspando não gruda). */
  esperaParaGrudar: 0.2,
  /** O centro do corpo fica pelo menos isto acima do chão do tronco (os pés quase no chão). */
  acimaDoChao: 0.95,
  /** As mãos param isto abaixo do topo (o galho e a copa ficam lá em cima). */
  abaixoDoTopo: 1.4,
  /** O pulo para fora do tronco: para longe e para cima, em m/s. */
  saltoParaFora: 4.5,
  saltoParaCima: 6.5,
  /** Segundos sem grudar de novo depois de soltar. */
  esperaDepoisDeSoltar: 0.5,
} as const

export interface Agarrado {
  /** De que lado do tronco o corpo está. */
  lado: number
  /** A altura do centro do corpo. */
  altura: number
}

export function criarAgarrado(): Agarrado {
  return { lado: 0, altura: 0 }
}

function fracao(t: Tronco, y: number): number {
  const h = t.topo.y - t.base.y
  return h > 0 ? Math.max(0, Math.min(1, (y - t.base.y) / h)) : 0
}

/** O raio da casca na altura `y`. */
export function raioNaAltura(t: Tronco, y: number): number {
  return t.raioBase + (t.raioTopo - t.raioBase) * fracao(t, y)
}

/** O meio do tronco na altura `y` (o tronco é um pouco torto). */
export function meioNaAltura(t: Tronco, y: number, saida: Ponto): Ponto {
  const f = fracao(t, y)
  saida.x = t.base.x + (t.topo.x - t.base.x) * f
  saida.y = y
  saida.z = t.base.z + (t.topo.z - t.base.z) * f
  return saida
}

export function alturaMinima(t: Tronco, doCentroAoPe: number): number {
  return t.base.y + Math.max(doCentroAoPe, ESCALADA.acimaDoChao)
}

export function alturaMaxima(t: Tronco, maosAcimaDoCentro: number): number {
  return t.topo.y - ESCALADA.abaixoDoTopo - maosAcimaDoCentro
}

/** Quanto falta do corpo (raio `raioDoCorpo`) até a casca; negativo é dentro dela. */
export function distanciaDaCasca(t: Tronco, corpo: Ponto, raioDoCorpo: number): number {
  const mx = t.base.x + (t.topo.x - t.base.x) * fracao(t, corpo.y)
  const mz = t.base.z + (t.topo.z - t.base.z) * fracao(t, corpo.y)
  return Math.hypot(corpo.x - mx, corpo.z - mz) - raioNaAltura(t, corpo.y) - raioDoCorpo
}

/** O tronco está na altura do corpo (dá para grudar dali)? */
export function naAlturaDoTronco(
  t: Tronco,
  y: number,
  doCentroAoPe: number,
  maosAcimaDoCentro: number,
): boolean {
  return y >= t.base.y && y <= alturaMaxima(t, maosAcimaDoCentro) + doCentroAoPe
}

/** Grudar: o corpo fica do lado em que chegou, na altura em que estava (dentro da faixa). */
export function grudar(
  t: Tronco,
  corpo: Ponto,
  a: Agarrado,
  doCentroAoPe: number,
  maosAcimaDoCentro: number,
): void {
  const mx = t.base.x + (t.topo.x - t.base.x) * fracao(t, corpo.y)
  const mz = t.base.z + (t.topo.z - t.base.z) * fracao(t, corpo.y)
  a.lado = Math.atan2(corpo.x - mx, corpo.z - mz)
  a.altura = Math.max(
    alturaMinima(t, doCentroAoPe),
    Math.min(alturaMaxima(t, maosAcimaDoCentro), corpo.y),
  )
}

/** Onde fica o centro do corpo agarrado. */
export function corpoNaEscalada(t: Tronco, a: Agarrado, raioDoCorpo: number, saida: Ponto): Ponto {
  meioNaAltura(t, a.altura, saida)
  const r = raioNaAltura(t, a.altura) + raioDoCorpo + ESCALADA.folga
  saida.x += Math.sin(a.lado) * r
  saida.z += Math.cos(a.lado) * r
  return saida
}

export type FimDaEscalada = 'desceu' | null

/**
 * Um quadro agarrado. `subir` é o joystick para a frente (1) ou para trás (−1), `deLado` para a
 * direita (1) ou esquerda (−1), olhando para o tronco. Descer no pé do tronco solta no chão.
 */
export function passoDaEscalada(
  t: Tronco,
  a: Agarrado,
  subir: number,
  deLado: number,
  dt: number,
  raioDoCorpo: number,
  doCentroAoPe: number,
  maosAcimaDoCentro: number,
): FimDaEscalada {
  const minima = alturaMinima(t, doCentroAoPe)
  if (subir < -0.3 && a.altura <= minima + 1e-3) return 'desceu'
  a.altura = Math.max(
    minima,
    Math.min(alturaMaxima(t, maosAcimaDoCentro), a.altura + subir * ESCALADA.subir * dt),
  )
  const r = raioNaAltura(t, a.altura) + raioDoCorpo + ESCALADA.folga
  // Olhando para o tronco, a direita é o lado que cresce.
  a.lado += (deLado * ESCALADA.deLado * dt) / r
  return null
}

/**
 * O pulo que solta do tronco: para fora e para cima. Se a criança pede uma direção que se afasta
 * do tronco (`pedidoX`/`pedidoZ`, no chão do mundo), o pulo vai para lá.
 */
export function saltoDaEscalada(a: Agarrado, pedidoX: number, pedidoZ: number, saida: Ponto) {
  let fx = Math.sin(a.lado)
  let fz = Math.cos(a.lado)
  const tam = Math.hypot(pedidoX, pedidoZ)
  if (tam > 0.3 && (pedidoX * fx + pedidoZ * fz) / tam > 0) {
    fx = pedidoX / tam
    fz = pedidoZ / tam
  }
  saida.x = fx * ESCALADA.saltoParaFora
  saida.y = ESCALADA.saltoParaCima
  saida.z = fz * ESCALADA.saltoParaFora
  return saida
}
