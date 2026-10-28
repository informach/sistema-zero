/**
 * Os cipós como cordas de verdade (regras puras, sem three nem Rapier). Cada cipó é uma corrente
 * de elos curtos presa no galho pelo pivô, como os jogos fazem com cordas (Verlet com restrições):
 * cada ponto anda com a velocidade que trazia mais a gravidade, e depois os elos voltam ao
 * comprimento deles e os pontos saem de dentro do que encostaram.
 *
 * - Solto, o cipó balança, dobra e para aos poucos. Encostar empurra: o corpo do personagem, o
 *   tronco e os outros cipós tiram a corda do caminho, e o empurrão vira velocidade (o cipó em que
 *   a criança esbarra balança, e se ele bate em outro, o outro balança também).
 * - Seguro, o ponto da pegada fica preso nas mãos (o balanço que a criança controla, `cipo.ts`,
 *   diz onde elas estão). Entre o galho e as mãos a corda fica esticada; abaixo delas o resto cai
 *   solto e encosta no corpo desenhado: a barriga e as pernas empurram a ponta para a frente.
 *
 * Nada aqui aloca no quadro: as contas usam variáveis do módulo.
 */
import { type Balanco, CIPO, GRAVIDADE_DO_CIPO, type Ponto } from './cipo'
import type { Tronco } from './escalada'

export const CORDAS = {
  /** A grossura do cipó (raio da corda desenhada). */
  raio: 0.06,
  /** Quantos elos tem cada cipó (de uns 25 cm no Bosque). */
  elos: 18,
  /** Voltas das restrições por passo: mais voltas, corda mais firme (menos elástica). */
  voltas: 12,
} as const

/** Passo máximo da conta (o quadro longo de um aparelho lento vira vários passos curtos). */
const PASSO_MAXIMO = 1 / 120

/** Um cipó para a física: o `CipoVivo` do jogo tem estes campos. */
export interface Corda {
  pivo: Ponto
  /** Do pivô até o fim da corda. */
  corda: number
  /** Do pivô até onde as mãos seguram. */
  pegada: number
  /** A pose do balanço: seguro, ela diz onde estão as mãos; solto, é escrita a partir da corda. */
  balanco: Balanco
  /** A criança segura este. */
  seguro: boolean
  /** Os pontos da corrente, do pivô (0) ao fim (`CORDAS.elos`), no mundo. */
  pontos: Ponto[]
  /** Onde cada ponto estava no passo anterior (a velocidade é a diferença). */
  antes: Ponto[]
  /** O chão embaixo do cipó (a ponta não passa dele). */
  chao: number
  /**
   * O corpo acabou de soltar este cipó e ainda está encostado nele: não empurra até sair de perto
   * (senão o cipó levaria um tranco no instante em que a criança solta).
   */
  esperandoOCorpoSair: boolean
}

/**
 * O corpo do personagem como ele está DESENHADO (inclinado no cipó, atrás da corda): o tronco
 * como uma cápsula de `de` até `ate` e a cabeça como uma bola. O avatar é chibi e a cabeça sai da
 * cápsula do Rapier, por isso a corda olha o desenho, não a física.
 */
export interface CorpoQueEmpurra {
  de: Ponto
  ate: Ponto
  raio: number
  cabeca: Ponto
  raioDaCabeca: number
}

/** O comprimento de cada elo. */
export function elo(c: Corda): number {
  return c.corda / CORDAS.elos
}

/** O ponto da corrente que fica nas mãos. */
export function pontoDaPegada(c: Corda): number {
  return Math.max(1, Math.min(CORDAS.elos, Math.round(c.pegada / elo(c))))
}

/** Cria a corrente pendurada reta, parada. */
export function criarPontos(pivo: Ponto, corda: number): { pontos: Ponto[]; antes: Ponto[] } {
  const pontos: Ponto[] = []
  const antes: Ponto[] = []
  for (let i = 0; i <= CORDAS.elos; i++) {
    const y = pivo.y - (corda * i) / CORDAS.elos
    pontos.push({ x: pivo.x, y, z: pivo.z })
    antes.push({ x: pivo.x, y, z: pivo.z })
  }
  return { pontos, antes }
}

/** A criança soltou: a corda segue com o embalo que tinha, e o corpo ainda está encostado. */
export function soltarCorda(c: Corda): void {
  c.esperandoOCorpoSair = true
}

/**
 * Um quadro da física dos cipós. `corpo` é o personagem desenhado (ou `null` fora da ilha) e
 * `troncos`, o que é sólido em volta. Muda os pontos de cada cipó e, nos soltos, o balanço.
 */
export function passoDasCordas(
  cordas: readonly Corda[],
  corpo: CorpoQueEmpurra | null,
  troncos: readonly Tronco[],
  dt: number,
): void {
  let resta = dt
  let ultimo = PASSO_MAXIMO
  while (resta > 1e-6) {
    const h = Math.min(resta, PASSO_MAXIMO)
    resta -= h
    ultimo = h
    const perde = Math.max(0, 1 - CIPO.amortecimentoSolto * h)
    for (const c of cordas) andar(c, h, perde)
    for (let volta = 0; volta < CORDAS.voltas; volta++) {
      for (const c of cordas) prender(c)
      for (const c of cordas) restringirElos(c, volta % 2 === 1)
      for (let i = 0; i < cordas.length; i++) {
        const c = cordas[i]
        if (!c) continue
        if (corpo && !c.esperandoOCorpoSair) encostarNoCorpo(c, corpo)
        for (const t of troncos) encostarNoTronco(c, t)
        for (let j = i + 1; j < cordas.length; j++) {
          const outra = cordas[j]
          if (outra) encostarUmaNaOutra(c, outra)
        }
        encostarNoChao(c)
      }
    }
    for (const c of cordas) prender(c)
  }
  for (const c of cordas) {
    if (c.esperandoOCorpoSair && (!corpo || !encostaNoCorpo(c, corpo))) {
      c.esperandoOCorpoSair = false
    }
    if (!c.seguro) balancoDaCorda(c, ultimo)
  }
}

/**
 * Escreve a pose do balanço de um cipó solto (ângulo, rumo e velocidade no arco) a partir do ponto
 * da pegada: é com ela que o personagem acha a corda para pegar. `passo` é o último passo da conta.
 */
export function balancoDaCorda(c: Corda, passo: number): void {
  const b = c.balanco
  const k = pontoDaPegada(c)
  const p = c.pontos[k]
  const a = c.antes[k]
  if (!p || !a) return
  const dx = p.x - c.pivo.x
  const dy = p.y - c.pivo.y
  const dz = p.z - c.pivo.z
  const deLado = Math.hypot(dx, dz)
  if (deLado > 1e-6) b.rumo = Math.atan2(dx, dz)
  b.angulo = Math.atan2(deLado, -dy)
  // A velocidade do ponto no último passo, ao longo do arco, no plano do rumo.
  const vx = (p.x - a.x) / passo
  const vy = (p.y - a.y) / passo
  const vz = (p.z - a.z) / passo
  const cos = Math.cos(b.angulo)
  const aoLongo = (vx * Math.sin(b.rumo) + vz * Math.cos(b.rumo)) * cos + vy * Math.sin(b.angulo)
  b.velocidade = aoLongo / Math.max(Math.hypot(dx, dy, dz), 1e-6)
}

/** Onde as mãos estão no balanço de quem segura (o ponto preso). */
const maos = { x: 0, y: 0, z: 0 }

function maosDoBalanco(c: Corda): Ponto {
  const b = c.balanco
  const s = Math.sin(b.angulo) * b.comprimento
  maos.x = c.pivo.x + Math.sin(b.rumo) * s
  maos.y = c.pivo.y - Math.cos(b.angulo) * b.comprimento
  maos.z = c.pivo.z + Math.cos(b.rumo) * s
  return maos
}

// ── Os passos ───────────────────────────────────────────────────────────────────────────────────

/** Cada ponto anda com a velocidade que trazia (um pouco amortecida) mais a gravidade. */
function andar(c: Corda, h: number, perde: number): void {
  const g = GRAVIDADE_DO_CIPO * h * h
  for (let i = 1; i < c.pontos.length; i++) {
    const p = c.pontos[i]
    const a = c.antes[i]
    if (!p || !a) continue
    const vx = (p.x - a.x) * perde
    const vy = (p.y - a.y) * perde
    const vz = (p.z - a.z) * perde
    a.x = p.x
    a.y = p.y
    a.z = p.z
    p.x += vx
    p.y += vy - g
    p.z += vz
  }
}

/**
 * O primeiro ponto fica no galho. Seguro, o da pegada fica nas mãos e os de cima, na linha entre
 * o galho e as mãos: com o peso da criança a corda fica esticada (o peso da corda não conta perto
 * do dela).
 */
function prender(c: Corda): void {
  const zero = c.pontos[0]
  if (zero) {
    zero.x = c.pivo.x
    zero.y = c.pivo.y
    zero.z = c.pivo.z
  }
  if (!c.seguro) return
  const k = pontoDaPegada(c)
  const m = maosDoBalanco(c)
  for (let i = 1; i <= k; i++) {
    const p = c.pontos[i]
    if (!p) continue
    const f = i / k
    p.x = c.pivo.x + (m.x - c.pivo.x) * f
    p.y = c.pivo.y + (m.y - c.pivo.y) * f
    p.z = c.pivo.z + (m.z - c.pivo.z) * f
  }
}

/** Quem não se mexe na conta: o pivô e, seguro, a corda do galho até as mãos. */
function preso(c: Corda, i: number): boolean {
  return i === 0 || (c.seguro && i <= pontoDaPegada(c))
}

/**
 * O comprimento do elo `i` (do ponto `i` ao `i + 1`). Seguro, os elos de baixo dividem o que sobra
 * da corda depois da pegada.
 */
function comprimentoDoElo(c: Corda, i: number): number {
  if (!c.seguro) return elo(c)
  const k = pontoDaPegada(c)
  if (i < k) return c.pegada / k
  return CORDAS.elos > k ? (c.corda - c.pegada) / (CORDAS.elos - k) : elo(c)
}

/**
 * Cada elo volta ao comprimento dele (os dois pontos dividem a correção; o preso não anda). A volta
 * alterna o sentido (de cima para baixo e de baixo para cima): a corda estica menos com o peso.
 */
function restringirElos(c: Corda, deBaixo: boolean): void {
  const n = c.pontos.length - 1
  for (let passo = 0; passo < n; passo++) {
    const i = deBaixo ? n - 1 - passo : passo
    const L = comprimentoDoElo(c, i)
    const p = c.pontos[i]
    const q = c.pontos[i + 1]
    if (!p || !q) continue
    const pPreso = preso(c, i)
    const qPreso = preso(c, i + 1)
    if (pPreso && qPreso) continue
    const dx = q.x - p.x
    const dy = q.y - p.y
    const dz = q.z - p.z
    const d = Math.hypot(dx, dy, dz)
    if (d < 1e-9) continue
    const k = (d - L) / d
    const wp = pPreso ? 0 : qPreso ? 1 : 0.5
    const wq = qPreso ? 0 : pPreso ? 1 : 0.5
    p.x += dx * k * wp
    p.y += dy * k * wp
    p.z += dz * k * wp
    q.x -= dx * k * wq
    q.y -= dy * k * wq
    q.z -= dz * k * wq
  }
}

// ── Encostos ────────────────────────────────────────────────────────────────────────────────────

/** O ponto mais perto num segmento (o resultado fica em `noSegmento`). */
const noSegmento = { x: 0, y: 0, z: 0, t: 0 }

function maisPertoNoSegmento(p: Ponto, a: Ponto, b: Ponto): void {
  const ux = b.x - a.x
  const uy = b.y - a.y
  const uz = b.z - a.z
  const uu = ux * ux + uy * uy + uz * uz
  const t =
    uu > 1e-12
      ? Math.max(0, Math.min(1, ((p.x - a.x) * ux + (p.y - a.y) * uy + (p.z - a.z) * uz) / uu))
      : 0
  noSegmento.t = t
  noSegmento.x = a.x + ux * t
  noSegmento.y = a.y + uy * t
  noSegmento.z = a.z + uz * t
}

/** Empurra o ponto para fora de uma bola de centro `o` e raio `r` (`r` já com a grossura). */
function sairDaBola(p: Ponto, ox: number, oy: number, oz: number, r: number): void {
  const dx = p.x - ox
  const dy = p.y - oy
  const dz = p.z - oz
  const d = Math.hypot(dx, dy, dz)
  if (d >= r) return
  if (d < 1e-6) {
    p.x = ox + r
    return
  }
  const k = r / d
  p.x = ox + dx * k
  p.y = oy + dy * k
  p.z = oz + dz * k
}

function encostaNoCorpo(c: Corda, corpo: CorpoQueEmpurra): boolean {
  const rTronco = corpo.raio + CORDAS.raio
  const rCabeca = corpo.raioDaCabeca + CORDAS.raio
  const o = corpo.cabeca
  for (let i = 1; i < c.pontos.length; i++) {
    const p = c.pontos[i]
    if (!p) continue
    maisPertoNoSegmento(p, corpo.de, corpo.ate)
    if (Math.hypot(p.x - noSegmento.x, p.y - noSegmento.y, p.z - noSegmento.z) < rTronco) {
      return true
    }
    if (Math.hypot(p.x - o.x, p.y - o.y, p.z - o.z) < rCabeca) return true
  }
  return false
}

function encostarNoCorpo(c: Corda, corpo: CorpoQueEmpurra): void {
  const rTronco = corpo.raio + CORDAS.raio
  const rCabeca = corpo.raioDaCabeca + CORDAS.raio
  for (let i = 1; i < c.pontos.length; i++) {
    const p = c.pontos[i]
    if (!p || preso(c, i)) continue
    maisPertoNoSegmento(p, corpo.de, corpo.ate)
    sairDaBola(p, noSegmento.x, noSegmento.y, noSegmento.z, rTronco)
    sairDaBola(p, corpo.cabeca.x, corpo.cabeca.y, corpo.cabeca.z, rCabeca)
  }
}

/** O tronco é um cone em pé, um pouco torto: o ponto sai pela casca, de lado. */
function encostarNoTronco(c: Corda, t: Tronco): void {
  const altura = t.topo.y - t.base.y
  for (let i = 1; i < c.pontos.length; i++) {
    const p = c.pontos[i]
    if (!p || preso(c, i)) continue
    if (p.y < t.base.y || p.y > t.topo.y) continue
    const f = altura > 1e-6 ? (p.y - t.base.y) / altura : 0
    const mx = t.base.x + (t.topo.x - t.base.x) * f
    const mz = t.base.z + (t.topo.z - t.base.z) * f
    const r = t.raioBase + (t.raioTopo - t.raioBase) * f + CORDAS.raio
    const dx = p.x - mx
    const dz = p.z - mz
    const d = Math.hypot(dx, dz)
    if (d >= r) continue
    if (d < 1e-6) {
      p.x = mx + r
      continue
    }
    p.x = mx + (dx * r) / d
    p.z = mz + (dz * r) / d
  }
}

function encostarNoChao(c: Corda): void {
  const piso = c.chao + CORDAS.raio
  for (let i = 1; i < c.pontos.length; i++) {
    const p = c.pontos[i]
    if (p && !preso(c, i) && p.y < piso) p.y = piso
  }
}

/** Dois cipós: cada ponto de um sai de perto dos elos do outro (os dois dividem o empurrão). */
function encostarUmaNaOutra(c: Corda, outra: Corda): void {
  const r = 2 * CORDAS.raio
  // Longe uma da outra (pelas caixas), nada a fazer.
  if (!caixasPerto(c, outra, r)) return
  empurrarPontosDe(c, outra, r)
  empurrarPontosDe(outra, c, r)
}

function empurrarPontosDe(c: Corda, outra: Corda, r: number): void {
  for (let i = 1; i < c.pontos.length; i++) {
    const p = c.pontos[i]
    if (!p) continue
    const pPreso = preso(c, i)
    for (let j = 0; j < outra.pontos.length - 1; j++) {
      const a = outra.pontos[j]
      const b = outra.pontos[j + 1]
      if (!a || !b) continue
      maisPertoNoSegmento(p, a, b)
      const dx = p.x - noSegmento.x
      const dy = p.y - noSegmento.y
      const dz = p.z - noSegmento.z
      const d = Math.hypot(dx, dy, dz)
      if (d >= r) continue
      const nx = d > 1e-6 ? dx / d : 1
      const ny = d > 1e-6 ? dy / d : 0
      const nz = d > 1e-6 ? dz / d : 0
      const falta = r - d
      // Quem está preso não anda: o outro leva o empurrão inteiro.
      const aPreso = preso(outra, j)
      const bPreso = preso(outra, j + 1)
      const daqui = pPreso ? 0 : aPreso && bPreso ? 1 : 0.5
      const dali = pPreso ? 1 : 1 - daqui
      p.x += nx * falta * daqui
      p.y += ny * falta * daqui
      p.z += nz * falta * daqui
      // O elo da outra recua (os dois pontos dele, na proporção de onde encostou).
      const t = noSegmento.t
      if (!aPreso) {
        a.x -= nx * falta * dali * (1 - t)
        a.y -= ny * falta * dali * (1 - t)
        a.z -= nz * falta * dali * (1 - t)
      }
      if (!bPreso) {
        b.x -= nx * falta * dali * t
        b.y -= ny * falta * dali * t
        b.z -= nz * falta * dali * t
      }
    }
  }
}

const uma = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 }
const duas = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 }

function caixasPerto(c: Corda, outra: Corda, r: number): boolean {
  caixa(c, uma)
  caixa(outra, duas)
  return (
    uma.minX - r <= duas.maxX &&
    duas.minX - r <= uma.maxX &&
    uma.minY - r <= duas.maxY &&
    duas.minY - r <= uma.maxY &&
    uma.minZ - r <= duas.maxZ &&
    duas.minZ - r <= uma.maxZ
  )
}

function caixa(c: Corda, saida: typeof uma): void {
  saida.minX = saida.minY = saida.minZ = Number.POSITIVE_INFINITY
  saida.maxX = saida.maxY = saida.maxZ = Number.NEGATIVE_INFINITY
  for (const p of c.pontos) {
    if (p.x < saida.minX) saida.minX = p.x
    if (p.y < saida.minY) saida.minY = p.y
    if (p.z < saida.minZ) saida.minZ = p.z
    if (p.x > saida.maxX) saida.maxX = p.x
    if (p.y > saida.maxY) saida.maxY = p.y
    if (p.z > saida.maxZ) saida.maxZ = p.z
  }
}
