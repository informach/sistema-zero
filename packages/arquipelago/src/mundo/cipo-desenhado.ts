import {
  BufferAttribute,
  BufferGeometry,
  type Material,
  Matrix4,
  Mesh,
  type Object3D,
  Quaternion,
  TorusGeometry,
  Vector3,
} from 'three'
import type { Ponto } from '../sistemas/cipo'

/**
 * O desenho de um cipó que dobra: a corda do `bosque.glb` é reta e dura (um tubo de 9 anéis), então
 * ela é escondida e trocada por um tubo refeito a cada quadro em cima da corrente da física
 * (`sistemas/cordas.ts`), com o mesmo material (a tinta da ilha continua valendo). A alça vai na
 * ponta, virada como o último trecho, e as folhas do nó acompanham a curva no ponto delas. É o que
 * os jogos fazem com corda: a física numa corrente e a malha deformada por cima.
 */

/** Anéis do tubo por elo da corrente (a curva passa suave entre os pontos). */
const ANEIS_POR_ELO = 2
/** Lados do tubo (o mesmo do Blender: `tube(..., seg=6)`). */
const LADOS = 6
/** O raio do tubo do Blender. */
const RAIO = 0.06
/** A alça do fim (`torus(0.16, 0.05, ...)` do `bosque.py`), com o centro a isto do fim. */
const ALCA = { raio: 0.16, grossura: 0.05, doFim: 0.21 } as const

export interface CipoDesenhado {
  no: Object3D
  /** A corda reta do arquivo (escondida enquanto este desenho existe). */
  original: Mesh | null
  /** Do pivô até o fim (o mesmo da física). */
  corda: number
  tubo: Mesh
  alca: Mesh
  folhas: { malha: Mesh; repouso: Float32Array } | null
  /** Os anéis da curva no referencial do nó: centro e os dois lados (N e B). */
  centros: Vector3[]
  normais: Vector3[]
  binormais: Vector3[]
}

/**
 * Monta o desenho de um nó `cipo-*`: esconde a corda reta, cria o tubo e a alça com o material
 * dela e guarda a pose de repouso das folhas. `elos` é o número de elos da corrente.
 */
export function prepararCipoDesenhado(no: Object3D, corda: number, elos: number): CipoDesenhado {
  let corpo: Mesh | null = null
  let folhas: Mesh | null = null
  no.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const nome = (Array.isArray(m.material) ? m.material[0] : m.material)?.name ?? ''
    if (nome.startsWith('folha')) folhas = m
    else if (!corpo) corpo = m
  })
  const original = corpo as Mesh | null
  const material = (original?.material ?? []) as Material
  if (original) original.visible = false

  const aneis = elos * ANEIS_POR_ELO + 1
  const geometria = new BufferGeometry()
  geometria.setAttribute('position', new BufferAttribute(new Float32Array(aneis * LADOS * 3), 3))
  geometria.setAttribute('normal', new BufferAttribute(new Float32Array(aneis * LADOS * 3), 3))
  const indices: number[] = []
  for (let a = 0; a < aneis - 1; a++) {
    for (let l = 0; l < LADOS; l++) {
      const i = a * LADOS + l
      const j = a * LADOS + ((l + 1) % LADOS)
      indices.push(i, i + LADOS, j, j, i + LADOS, j + LADOS)
    }
  }
  geometria.setIndex(indices)
  const tubo = new Mesh(geometria, material)
  tubo.name = `${no.name}-corda`
  tubo.castShadow = original?.castShadow ?? true
  tubo.receiveShadow = original?.receiveShadow ?? false
  tubo.frustumCulled = false
  no.add(tubo)

  const alca = new Mesh(new TorusGeometry(ALCA.raio, ALCA.grossura, 4, 10), material)
  alca.name = `${no.name}-alca`
  alca.castShadow = tubo.castShadow
  no.add(alca)

  const malhaDasFolhas = folhas as Mesh | null
  const repouso = malhaDasFolhas
    ? Float32Array.from(malhaDasFolhas.geometry.attributes.position?.array ?? [])
    : null
  if (malhaDasFolhas) malhaDasFolhas.frustumCulled = false

  const criar = () => Array.from({ length: aneis }, () => new Vector3())
  return {
    no,
    original,
    corda,
    tubo,
    alca,
    folhas: malhaDasFolhas && repouso ? { malha: malhaDasFolhas, repouso } : null,
    centros: criar(),
    normais: criar(),
    binormais: criar(),
  }
}

/** Desfaz o desenho: tira o tubo e a alça, devolve as folhas e mostra a corda do arquivo. */
export function desmontarCipoDesenhado(d: CipoDesenhado): void {
  d.no.remove(d.tubo, d.alca)
  d.tubo.geometry.dispose()
  d.alca.geometry.dispose()
  if (d.original) d.original.visible = true
  const f = d.folhas
  if (f) {
    const pos = f.malha.geometry.attributes.position as BufferAttribute
    pos.copyArray(f.repouso)
    pos.needsUpdate = true
    f.malha.geometry.computeVertexNormals()
  }
}

const doMundo = new Matrix4()
const local = Array.from({ length: 64 }, () => new Vector3())
const tangente = new Vector3()
const anterior = new Vector3()
const ladoDaAlca = new Quaternion()
const PARA_CIMA = new Vector3(0, 1, 0)
const NO_X = new Vector3(1, 0, 0)

/** Redesenha o cipó em cima dos pontos da corrente (no mundo). */
export function desenharCipo(d: CipoDesenhado, pontos: readonly Ponto[]): void {
  const n = Math.min(pontos.length, local.length)
  if (n < 2) return
  cipoAtual = d
  d.no.updateWorldMatrix(true, false)
  doMundo.copy(d.no.matrixWorld).invert()
  for (let i = 0; i < n; i++) {
    const p = pontos[i]
    const v = local[i]
    if (p && v) v.set(p.x, p.y, p.z).applyMatrix4(doMundo)
  }
  // A curva suave (Catmull-Rom) pelos pontos, com os lados levados de anel em anel (sem girar).
  const aneis = d.centros.length
  for (let a = 0; a < aneis; a++) {
    const t = (a / (aneis - 1)) * (n - 1)
    const i = Math.min(n - 2, Math.floor(t))
    const f = t - i
    const centro = d.centros[a]
    if (centro) catmullRom(i, f, n, centro)
  }
  for (let a = 0; a < aneis; a++) {
    const c = d.centros[a]
    const proximo = d.centros[Math.min(aneis - 1, a + 1)]
    const antes = d.centros[Math.max(0, a - 1)]
    const normal = d.normais[a]
    const binormal = d.binormais[a]
    if (!c || !proximo || !antes || !normal || !binormal) continue
    tangente.subVectors(proximo, antes).normalize()
    // O primeiro anel começa com o lado no x do nó (o mesmo da corda reta do Blender).
    anterior.copy(a === 0 ? NO_X : (d.normais[a - 1] ?? NO_X))
    normal.copy(anterior).addScaledVector(tangente, -anterior.dot(tangente))
    if (normal.lengthSq() < 1e-8) normal.set(0, 0, 1)
    normal.normalize()
    binormal.crossVectors(tangente, normal)
  }
  escreverTubo(d)
  colocarAlca(d)
  dobrarFolhas(d)
  cipoAtual = null
}

function catmullRom(i: number, f: number, n: number, saida: Vector3): void {
  const p0 = local[Math.max(0, i - 1)] as Vector3
  const p1 = local[i] as Vector3
  const p2 = local[Math.min(n - 1, i + 1)] as Vector3
  const p3 = local[Math.min(n - 1, i + 2)] as Vector3
  const f2 = f * f
  const f3 = f2 * f
  const a = -0.5 * f3 + f2 - 0.5 * f
  const b = 1.5 * f3 - 2.5 * f2 + 1
  const c = -1.5 * f3 + 2 * f2 + 0.5 * f
  const e = 0.5 * f3 - 0.5 * f2
  saida.set(
    p0.x * a + p1.x * b + p2.x * c + p3.x * e,
    p0.y * a + p1.y * b + p2.y * c + p3.y * e,
    p0.z * a + p1.z * b + p2.z * c + p3.z * e,
  )
}

function escreverTubo(d: CipoDesenhado): void {
  const g = d.tubo.geometry
  const pos = g.attributes.position as BufferAttribute
  const nor = g.attributes.normal as BufferAttribute
  // O tubo vai até o centro da alça (o resto da corda é ela).
  const ate = 1 - ALCA.doFim / d.corda
  const aneis = d.centros.length
  for (let a = 0; a < aneis; a++) {
    anelNa((a / (aneis - 1)) * ate)
    for (let l = 0; l < LADOS; l++) {
      const ang = (l / LADOS) * Math.PI * 2
      const cx = Math.cos(ang)
      const sx = Math.sin(ang)
      const nx = noAnel.n.x * cx + noAnel.b.x * sx
      const ny = noAnel.n.y * cx + noAnel.b.y * sx
      const nz = noAnel.n.z * cx + noAnel.b.z * sx
      const k = a * LADOS + l
      pos.setXYZ(k, noAnel.c.x + nx * RAIO, noAnel.c.y + ny * RAIO, noAnel.c.z + nz * RAIO)
      nor.setXYZ(k, nx, ny, nz)
    }
  }
  pos.needsUpdate = true
  nor.needsUpdate = true
}

function colocarAlca(d: CipoDesenhado): void {
  anelNa(1 - ALCA.doFim / d.corda)
  d.alca.position.copy(noAnel.c)
  // O anel da alça fica em pé, no plano da corda (o eixo dele é o lado B).
  ladoDaAlca.setFromUnitVectors(PARA_CIMA, tangenteNoAnel(1 - ALCA.doFim / d.corda, d))
  d.alca.quaternion.copy(ladoDaAlca)
}

const tangenteDaAlca = new Vector3()

function tangenteNoAnel(u: number, d: CipoDesenhado): Vector3 {
  const aneis = d.centros.length
  const a = Math.min(aneis - 2, Math.floor(u * (aneis - 1)))
  const p = d.centros[a] as Vector3
  const q = d.centros[a + 1] as Vector3
  // A alça pende para baixo: o "para cima" dela é o contrário do caminho da corda.
  return tangenteDaAlca.subVectors(p, q).normalize()
}

/** O anel na fração `u` da corda (0 no pivô, 1 no fim), entre os dois anéis vizinhos. */
const noAnel = { c: new Vector3(), n: new Vector3(), b: new Vector3() }

function anelNa(u: number): void {
  const aneis = cipoAtual?.centros.length ?? 0
  if (!cipoAtual || aneis < 2) return
  const t = Math.max(0, Math.min(1, u)) * (aneis - 1)
  const a = Math.min(aneis - 2, Math.floor(t))
  const f = t - a
  const d = cipoAtual
  noAnel.c.lerpVectors(d.centros[a] as Vector3, d.centros[a + 1] as Vector3, f)
  noAnel.n.lerpVectors(d.normais[a] as Vector3, d.normais[a + 1] as Vector3, f).normalize()
  noAnel.b.lerpVectors(d.binormais[a] as Vector3, d.binormais[a + 1] as Vector3, f).normalize()
}

/** O cipó sendo desenhado agora (as contas dos anéis leem dele). */
let cipoAtual: CipoDesenhado | null = null

/**
 * As folhas: cada vértice tem, em repouso, uma altura (quanto abaixo do pivô, `-y`) e um lado (`x`
 * e `z`); na curva, ele vai para o anel daquela altura, com o mesmo lado.
 */
function dobrarFolhas(d: CipoDesenhado): void {
  const f = d.folhas
  if (!f) return
  const pos = f.malha.geometry.attributes.position as BufferAttribute
  const r = f.repouso
  for (let i = 0; i < pos.count; i++) {
    const x = r[i * 3] ?? 0
    const y = r[i * 3 + 1] ?? 0
    const z = r[i * 3 + 2] ?? 0
    anelNa(-y / d.corda)
    pos.setXYZ(
      i,
      noAnel.c.x + noAnel.n.x * x + noAnel.b.x * z,
      noAnel.c.y + noAnel.n.y * x + noAnel.b.y * z,
      noAnel.c.z + noAnel.n.z * x + noAnel.b.z * z,
    )
  }
  pos.needsUpdate = true
  f.malha.geometry.computeVertexNormals()
}
