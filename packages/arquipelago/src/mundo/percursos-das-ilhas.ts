import type { Ponto } from '../sistemas/cipo'
import { CORPO } from '../sistemas/corpo'
import type { DequeDoPercurso, PontosDoPercurso } from '../sistemas/percurso'
import type { ColisorDaIlha } from './colisores-da-ilha'

/**
 * Os pontos dos percursos da V19, lidos dos colisores que as ilhas já têm (nenhum modelo novo): os
 * corais do Recife, as pedras do vulcão do Vale e as pedras da praia da sua ilha. Tudo no
 * referencial dos colisores (em volta do meio da ilha, já girados); `deslocar` leva ao mundo.
 */

type Cilindro = Extract<ColisorDaIlha, { forma: 'cilindro' }>

function cilindro(colisores: readonly ColisorDaIlha[], nome: string): Cilindro | null {
  const c = colisores.find((k) => k.nome === nome)
  return c && c.forma === 'cilindro' ? c : null
}

/** O topo de um cilindro: o meio dele em x/z e a altura de cima. */
function topo(c: Cilindro): Ponto {
  const [x, y, z] = c.posicao
  return { x, y: y + c.meiaAltura, z }
}

const rumo = (de: Ponto, para: Ponto) => Math.atan2(para.x - de.x, para.z - de.z)

/** O coletável no meio de um pulo: acima do centro do corpo em pé na parada mais alta dele. */
function noMeioDoPulo(a: Ponto, b: Ponto): Ponto {
  return {
    x: (a.x + b.x) / 2,
    y: Math.max(a.y, b.y) + CORPO.doCentroAoPe + 0.2,
    z: (a.z + b.z) / 2,
  }
}

/** Longe de tudo o que colide (no plano), com um corpo de folga. */
function livre(colisores: readonly ColisorDaIlha[], x: number, z: number): boolean {
  for (const c of colisores) {
    if (c.forma === 'malha' || c.nome === 'col-terreno') continue
    const [cx, , cz] = c.posicao
    const raio = c.forma === 'cilindro' ? c.raio : Math.hypot(c.meio[0], c.meio[2])
    if (Math.hypot(x - cx, z - cz) < raio + CORPO.raio + 0.3) return false
  }
  return true
}

/**
 * O coletável no chão do caminho, na altura do centro do corpo de quem anda: no meio do trecho, ou
 * o ponto mais perto do meio que fica longe de pedras e moitas.
 */
function noCaminho(a: Ponto, b: Ponto, colisores: readonly ColisorDaIlha[] = []): Ponto {
  for (const t of [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74]) {
    const x = a.x + (b.x - a.x) * t
    const z = a.z + (b.z - a.z) * t
    if (livre(colisores, x, z)) return { x, y: a.y + (b.y - a.y) * t + CORPO.doCentroAoPe, z }
  }
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + CORPO.doCentroAoPe, z: (a.z + b.z) / 2 }
}

// ── Recife: os corais em volta da lagoa ────────────────────────────────────────────────────────

/** O arco dos corais na ordem dos pulos (`col-cil-coral-N`): do oeste, pelo sul, até o norte. */
export const ORDEM_DOS_CORAIS = [5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4] as const
/** Entre quais corais (índices na ordem) fica uma pérola. */
export const PEROLAS_ENTRE = [0, 2, 4, 7, 9] as const
/** A largada fica na areia, isto para fora do primeiro coral (longe do meio da lagoa). */
export const LARGADA_ANTES_DO_CORAL = 1.6
/** O coral conta com o corpo em cima: o raio dele mais esta folga. */
const FOLGA_DO_CORAL = 0.15

export function percursoDosCorais(
  colisores: readonly ColisorDaIlha[],
  raioDaIlha: number,
): PontosDoPercurso | null {
  const corais = ORDEM_DOS_CORAIS.map((n) => cilindro(colisores, `col-cil-coral-${n}`))
  if (corais.some((c) => !c)) return null
  const lista = corais as Cilindro[]
  const topos = lista.map(topo)
  const primeiro = topos[0] as Ponto
  const ultimo = topos.at(-1) as Ponto
  const base = (lista[0] as Cilindro).posicao[1] - (lista[0] as Cilindro).meiaAltura
  const fora = Math.hypot(primeiro.x, primeiro.z) || 1
  const largada = {
    x: primeiro.x + (primeiro.x / fora) * LARGADA_ANTES_DO_CORAL,
    y: base,
    z: primeiro.z + (primeiro.z / fora) * LARGADA_ANTES_DO_CORAL,
  }
  const deques: DequeDoPercurso[] = topos.slice(0, -1).map((t, i) => {
    const prox = topos[i + 1] ?? t
    return {
      ...t,
      raio: (lista[i] as Cilindro).raio + FOLGA_DO_CORAL,
      volta: { ...t },
      rumoDaVolta: rumo(t, prox),
    }
  })
  return {
    largada,
    rumoDaLargada: rumo(largada, primeiro),
    deques,
    chegada: { ...ultimo },
    vagalumes: PEROLAS_ENTRE.map((i) => noMeioDoPulo(topos[i] as Ponto, topos[i + 1] as Ponto)),
    centro: { x: 0, y: base, z: 0 },
    raioDaIlha,
  }
}

// ── Vale: as pedras do vulcão ──────────────────────────────────────────────────────────────────

/** As pedras do vulcão (`col-cil-pedra-vulcao-N`) na ordem da trilha; a sétima é a chegada. */
export const ORDEM_DAS_PEDRAS_DO_VULCAO = [1, 2, 3, 4, 5, 6, 7] as const
/** Uma pedra conta passando a até isto do meio dela (por cima ou do lado). */
export const RAIO_DA_PEDRA_DO_VULCAO = 1.6
/** A largada fica isto antes da primeira pedra, na direção contrária à da segunda. */
export const LARGADA_ANTES_DA_PEDRA = 2.2

export function percursoDasPedrasDoVulcao(
  colisores: readonly ColisorDaIlha[],
  raioDaIlha: number,
): PontosDoPercurso | null {
  const pedras = ORDEM_DAS_PEDRAS_DO_VULCAO.map((n) =>
    cilindro(colisores, `col-cil-pedra-vulcao-${n}`),
  )
  if (pedras.some((p) => !p)) return null
  const lista = pedras as Cilindro[]
  // O ponto de cada pedra é o pé dela (no chão): passa-se a pé ou montado.
  const chao = lista.map((c) => {
    const [x, y, z] = c.posicao
    return { x, y: y - c.meiaAltura, z }
  })
  const primeira = chao[0] as Ponto
  const segunda = chao[1] as Ponto
  const d = Math.hypot(primeira.x - segunda.x, primeira.z - segunda.z) || 1
  const largada = {
    x: primeira.x + ((primeira.x - segunda.x) / d) * LARGADA_ANTES_DA_PEDRA,
    y: primeira.y,
    z: primeira.z + ((primeira.z - segunda.z) / d) * LARGADA_ANTES_DA_PEDRA,
  }
  const deques: DequeDoPercurso[] = chao.slice(0, -1).map((p, i) => ({
    ...p,
    raio: RAIO_DA_PEDRA_DO_VULCAO,
    volta: { ...p },
    rumoDaVolta: rumo(p, chao[i + 1] ?? p),
  }))
  return {
    largada,
    rumoDaLargada: rumo(largada, primeira),
    deques,
    chegada: { ...(chao.at(-1) as Ponto) },
    // Um fóssil em cada trecho, menos o primeiro (a largada é colada à primeira pedra).
    vagalumes: [1, 2, 3, 4, 5].map((i) =>
      noCaminho(chao[i] as Ponto, chao[i + 1] as Ponto, colisores),
    ),
    centro: { x: 0, y: primeira.y, z: 0 },
    raioDaIlha,
  }
}

// ── Sua ilha: a volta pela praia ───────────────────────────────────────────────────────────────

/**
 * As pedras da praia (`col-cil-pedra-N` do `terreno.glb`) na ordem da volta, do leste pelo sul
 * até o oeste. As duas primeiras ficam juntas na pedra do leste.
 */
export const ORDEM_DAS_PEDRAS_DA_PRAIA = [5, 1, 12, 9, 3] as const
/** A parada fica do lado da pedra que dá para a praia (para fora da ilha), isto além dela. */
export const PARADA_ALEM_DA_PEDRA = 1.6
export const RAIO_DA_PEDRA_DA_PRAIA = 2.2

export function percursoDaPraia(
  colisores: readonly ColisorDaIlha[],
  raioDaIlha: number,
): PontosDoPercurso | null {
  const pedras = ORDEM_DAS_PEDRAS_DA_PRAIA.map((n) => cilindro(colisores, `col-cil-pedra-${n}`))
  if (pedras.some((p) => !p)) return null
  const pontos = (pedras as Cilindro[]).map((c) => {
    const [x, y, z] = c.posicao
    const r = Math.hypot(x, z) || 1
    const alem = c.raio + PARADA_ALEM_DA_PEDRA
    return { x: x + (x / r) * alem, y: y - c.meiaAltura, z: z + (z / r) * alem }
  })
  const primeira = pontos[0] as Ponto
  const deques: DequeDoPercurso[] = pontos.slice(0, -1).map((p, i) => ({
    ...p,
    raio: RAIO_DA_PEDRA_DA_PRAIA,
    volta: { ...p },
    rumoDaVolta: rumo(p, pontos[i + 1] ?? p),
  }))
  // A largada é a própria primeira parada: começar já é estar na pedra do leste.
  const largada = { ...primeira }
  // Uma concha no meio de cada trecho e outra antes da chegada.
  const conchas: Ponto[] = []
  for (let i = 0; i + 1 < pontos.length; i++)
    conchas.push(noCaminho(pontos[i] as Ponto, pontos[i + 1] as Ponto, colisores))
  const penultima = pontos.at(-2) as Ponto
  const ultima = pontos.at(-1) as Ponto
  conchas.push({
    x: penultima.x + (ultima.x - penultima.x) * 0.8,
    y: ultima.y + CORPO.doCentroAoPe,
    z: penultima.z + (ultima.z - penultima.z) * 0.8,
  })
  return {
    largada,
    rumoDaLargada: rumo(primeira, pontos[1] ?? primeira),
    deques,
    chegada: { ...ultima },
    vagalumes: conchas,
    centro: { x: 0, y: primeira.y, z: 0 },
    raioDaIlha,
  }
}

/** Leva os pontos do referencial dos colisores para o mundo (eles já vêm girados com a ilha). */
export function deslocar(p: PontosDoPercurso, meio: Ponto): PontosDoPercurso {
  const m = (q: Ponto) => ({ x: q.x + meio.x, y: q.y + meio.y, z: q.z + meio.z })
  return {
    largada: m(p.largada),
    rumoDaLargada: p.rumoDaLargada,
    deques: p.deques.map((d) => ({
      ...m(d),
      raio: d.raio,
      volta: m(d.volta),
      rumoDaVolta: d.rumoDaVolta,
    })),
    chegada: m(p.chegada),
    vagalumes: p.vagalumes.map(m),
    centro: m(p.centro),
    raioDaIlha: p.raioDaIlha,
  }
}
