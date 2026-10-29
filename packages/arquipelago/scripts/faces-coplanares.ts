/**
 * Procura faces coplanares que se sobrepõem num GLB (a causa do "pisca-pisca" de listras, o
 * z-fighting): duas faces no mesmo plano, de materiais diferentes, disputam o mesmo pixel e a placa
 * de vídeo escolhe uma a cada quadro. Faces encostadas de costas uma para a outra (dois sólidos que se
 * tocam) não contam: cada uma fica tapada pelo sólido da outra.
 *
 * Uso: `bun scripts/faces-coplanares.ts [--separados] src/assets/mundo/casa.glb [...]` lista o que
 * achou; `--separados` só compara faces do mesmo nó (arquivos em que cada nó é uma variante ou um
 * lugar diferente: árvores, estágios da horta, ilhas do anel). O teste `tests/faces-coplanares.test.ts`
 * roda a mesma busca nos modelos do mundo.
 */
import { readFileSync } from 'node:fs'
import { type Material, type Mesh, type Object3D, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ehNoDeColisao } from '../src/mundo/colisores-da-ilha'

/** Até esta distância entre os planos as faces contam como coplanares (metros). */
export const TOLERANCIA_DO_PLANO = 0.003
/** Normais mais próximas que isto (cosseno de ~2,5°) contam como paralelas. */
const PARALELAS = Math.cos((2.5 * Math.PI) / 180)
/** Sobreposição menor que esta (m²) não aparece na tela. */
export const AREA_MINIMA = 2e-4

export interface Sobreposicao {
  /** `nó/material` das duas faces, em ordem alfabética. */
  a: string
  b: string
  /** Área total sobreposta entre esse par (m²). */
  area: number
  /** Um ponto da sobreposição (no referencial do arquivo), para achar no modelo. */
  onde: [number, number, number]
}

interface Triangulo {
  rotulo: string
  no: string
  material: string
  n: Vector3
  d: number
  v: [Vector3, Vector3, Vector3]
}

const CELULA_N = 0.05
const CELULA_D = 0.02

/** Chave numérica da célula (normal, distância): bem mais rápida que texto num Map. */
function chave(cx: number, cy: number, cz: number, cd: number): number {
  return (((cx + 64) * 128 + (cy + 64)) * 128 + (cz + 64)) * 2 ** 22 + (cd + 2 ** 21)
}

/** O nó de primeiro nível (filho da cena) que contém o objeto: é o nome do contrato com o jogo. */
function noDe(o: Object3D, raiz: Object3D): Object3D {
  let atual = o
  while (atual.parent && atual.parent !== raiz) atual = atual.parent
  return atual
}

function nomeDoMaterial(m: Material): string {
  return m.name || '(sem nome)'
}

const lidos = new WeakMap<Object3D, Triangulo[]>()

function triangulos(raiz: Object3D): Triangulo[] {
  const ja = lidos.get(raiz)
  if (ja) return ja
  raiz.updateMatrixWorld(true)
  const out: Triangulo[] = []
  raiz.traverse((o) => {
    const malha = o as Mesh
    if (!malha.isMesh) return
    const material = malha.material as Material
    const pos = malha.geometry.getAttribute('position')
    const idx = malha.geometry.getIndex()
    const n = idx ? idx.count : pos.count
    const topo = noDe(malha, raiz)
    // Os colisores (`col-*`) nunca são desenhados.
    if (ehNoDeColisao(topo)) return
    const no = topo.name || '(sem nome)'
    const rotulo = `${no}/${nomeDoMaterial(material)}`
    for (let i = 0; i + 2 < n; i += 3) {
      const v = [0, 1, 2].map((k) => {
        const j = idx ? idx.getX(i + k) : i + k
        return new Vector3().fromBufferAttribute(pos, j).applyMatrix4(malha.matrixWorld)
      }) as [Vector3, Vector3, Vector3]
      const normal = new Vector3()
        .subVectors(v[1], v[0])
        .cross(new Vector3().subVectors(v[2], v[0]))
      const dobro = normal.length()
      if (dobro < 2e-6) continue
      normal.divideScalar(dobro)
      out.push({
        rotulo,
        no,
        material: nomeDoMaterial(material),
        n: normal,
        d: normal.dot(v[0]),
        v,
      })
    }
  })
  lidos.set(raiz, out)
  return out
}

/** Área da interseção de dois triângulos já no plano (Sutherland-Hodgman, convexos). */
function areaEmComum(a: [number, number][], b: [number, number][]): number {
  const area = (p: [number, number][]) => {
    let s = 0
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i] as [number, number]
      const [x2, y2] = p[(i + 1) % p.length] as [number, number]
      s += x1 * y2 - x2 * y1
    }
    return s / 2
  }
  const sentido = (p: [number, number][]) => (area(p) < 0 ? [...p].reverse() : p)
  let poligono = sentido(a)
  const recorte = sentido(b)
  for (let i = 0; i < recorte.length && poligono.length > 0; i++) {
    const [ax, ay] = recorte[i] as [number, number]
    const [bx, by] = recorte[(i + 1) % recorte.length] as [number, number]
    const dentro = ([x, y]: [number, number]) =>
      (bx - ax) * (y - ay) - (by - ay) * (x - ax) >= -1e-12
    const corte = (p: [number, number], q: [number, number]): [number, number] => {
      const [px, py] = p
      const [qx, qy] = q
      const den = (bx - ax) * (qy - py) - (by - ay) * (qx - px)
      const t = den === 0 ? 0 : ((bx - ax) * (ay - py) - (by - ay) * (ax - px)) / den
      return [px + t * (qx - px), py + t * (qy - py)]
    }
    const entrada = poligono
    poligono = []
    for (let k = 0; k < entrada.length; k++) {
      const atual = entrada[k] as [number, number]
      const anterior = entrada[(k + entrada.length - 1) % entrada.length] as [number, number]
      if (dentro(atual)) {
        if (!dentro(anterior)) poligono.push(corte(anterior, atual))
        poligono.push(atual)
      } else if (dentro(anterior)) poligono.push(corte(anterior, atual))
    }
  }
  return poligono.length < 3 ? 0 : Math.abs(area(poligono))
}

function base(n: Vector3): [Vector3, Vector3] {
  const auxiliar = Math.abs(n.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
  const u = new Vector3().crossVectors(n, auxiliar).normalize()
  return [u, new Vector3().crossVectors(n, u)]
}

/**
 * Quais nós aparecem juntos na tela. Por padrão todos; num arquivo em que cada nó é uma variante
 * (árvores, estágios da horta) ou fica num lugar diferente (ilhas do anel), só o próprio nó.
 */
export type Juntos = (a: string, b: string) => boolean
export const TODOS_JUNTOS: Juntos = () => true
export const CADA_NO_SOZINHO: Juntos = (a, b) => a === b

/**
 * As sobreposições coplanares de uma cena (faces viradas para o mesmo lado), agrupadas por par
 * `nó/material`. Faces do mesmo material não contam (mesma cor e mesma luz: não pisca).
 */
export function sobreposicoes(raiz: Object3D, juntos: Juntos = TODOS_JUNTOS): Sobreposicao[] {
  const tris = triangulos(raiz)
  const grade = new Map<number, number[]>()
  const pares = new Map<string, Sobreposicao>()
  tris.forEach((t, i) => {
    const cx = Math.round(t.n.x / CELULA_N)
    const cy = Math.round(t.n.y / CELULA_N)
    const cz = Math.round(t.n.z / CELULA_N)
    const cd = Math.round(t.d / CELULA_D)
    for (let ix = -1; ix <= 1; ix++)
      for (let iy = -1; iy <= 1; iy++)
        for (let iz = -1; iz <= 1; iz++)
          for (let id = -1; id <= 1; id++) {
            const lista = grade.get(chave(cx + ix, cy + iy, cz + iz, cd + id))
            if (!lista) continue
            for (const j of lista) comparar(tris[j] as Triangulo, t)
          }
    const k = chave(cx, cy, cz, cd)
    const lista = grade.get(k)
    if (lista) lista.push(i)
    else grade.set(k, [i])
  })

  function comparar(a: Triangulo, b: Triangulo) {
    if (a.material === b.material || a.n.dot(b.n) < PARALELAS) return
    if (!juntos(a.no, b.no)) return
    for (const p of b.v) if (Math.abs(a.n.dot(p) - a.d) > TOLERANCIA_DO_PLANO) return
    const [u, v] = base(a.n)
    const plano = (tri: [Vector3, Vector3, Vector3]) =>
      tri.map((p) => [p.dot(u), p.dot(v)] as [number, number])
    const area = areaEmComum(plano(a.v), plano(b.v))
    if (area < 1e-7) return
    const [r1, r2] = [a.rotulo, b.rotulo].sort() as [string, string]
    const k = `${r1}|${r2}`
    const atual = pares.get(k)
    if (atual) atual.area += area
    else {
      const c = new Vector3().add(b.v[0]).add(b.v[1]).add(b.v[2]).divideScalar(3)
      pares.set(k, { a: r1, b: r2, area, onde: [c.x, c.y, c.z] })
    }
  }

  return [...pares.values()].filter((p) => p.area >= AREA_MINIMA).sort((x, y) => y.area - x.area)
}

export interface Emenda {
  /** `nó/material` dos dois lados da emenda, em ordem alfabética. */
  a: string
  b: string
  /** Quantos vértices de um lado caem no meio de uma aresta do outro. */
  vertices: number
  onde: [number, number, number]
}

const CELULA_DA_ARESTA = 0.5
const NA_LINHA = 1e-4

/**
 * Emendas abertas (junção em T): duas faces no mesmo plano, lado a lado, em que um vértice de uma
 * cai no MEIO da aresta da outra. A placa de vídeo não fecha essa costura e sobra uma linha de
 * pixels tracejada, que cintila com o movimento, mostrando o que está atrás. Acontece quando uma
 * superfície é montada com peças soltas encostadas (a parede em volta de uma janela feita de quatro
 * caixas); a cura é uma malha só, com os vértices compartilhados.
 */
export function emendasAbertas(raiz: Object3D, juntos: Juntos = TODOS_JUNTOS): Emenda[] {
  const tris = triangulos(raiz)
  const grade = new Map<number, [number, number][]>()
  const celula = (x: number) => Math.floor(x / CELULA_DA_ARESTA)
  const lugar = (x: number, y: number, z: number) =>
    ((x + 4096) * 8192 + (y + 4096)) * 8192 + (z + 4096)
  tris.forEach((t, i) => {
    for (let e = 0; e < 3; e++) {
      const p = t.v[e] as Vector3
      const q = t.v[(e + 1) % 3] as Vector3
      for (let x = celula(Math.min(p.x, q.x)); x <= celula(Math.max(p.x, q.x)); x++)
        for (let y = celula(Math.min(p.y, q.y)); y <= celula(Math.max(p.y, q.y)); y++)
          for (let z = celula(Math.min(p.z, q.z)); z <= celula(Math.max(p.z, q.z)); z++) {
            const k = lugar(x, y, z)
            const lista = grade.get(k)
            if (lista) lista.push([i, e])
            else grade.set(k, [[i, e]])
          }
    }
  })
  const pares = new Map<string, Emenda>()
  const pq = new Vector3()
  const pv = new Vector3()
  const lado = new Vector3()
  const centro = new Vector3()
  tris.forEach((b, j) => {
    centro.copy(b.v[0]).add(b.v[1]).add(b.v[2]).divideScalar(3)
    for (const v of b.v) {
      const lista = grade.get(lugar(celula(v.x), celula(v.y), celula(v.z)))
      if (!lista) continue
      for (const [i, e] of lista) {
        if (i === j) continue
        const a = tris[i] as Triangulo
        if (a.n.dot(b.n) < PARALELAS || !juntos(a.no, b.no)) continue
        if (Math.abs(a.n.dot(v) - a.d) > NA_LINHA) continue
        const p = a.v[e] as Vector3
        const q = a.v[(e + 1) % 3] as Vector3
        const r = a.v[(e + 2) % 3] as Vector3
        pq.subVectors(q, p)
        const comprimento2 = pq.lengthSq()
        pv.subVectors(v, p)
        const t = pv.dot(pq) / comprimento2
        if (t <= 0 || t >= 1) continue
        if (v.distanceTo(p) < NA_LINHA || v.distanceTo(q) < NA_LINHA) continue
        if (pv.addScaledVector(pq, -t).length() > NA_LINHA) continue
        // Só conta se a outra face fica do OUTRO lado da aresta (lado a lado, não por cima).
        const ladoDoA = lado.subVectors(r, p).cross(pq).dot(a.n)
        const ladoDoB = lado.subVectors(centro, p).cross(pq).dot(a.n)
        if (ladoDoA * ladoDoB >= 0) continue
        const [r1, r2] = [a.rotulo, b.rotulo].sort() as [string, string]
        const k = `${r1}|${r2}`
        const atual = pares.get(k)
        if (atual) atual.vertices++
        else pares.set(k, { a: r1, b: r2, vertices: 1, onde: [v.x, v.y, v.z] })
      }
    }
  })
  return [...pares.values()].sort((x, y) => y.vertices - x.vertices)
}

export async function carregarGlb(caminho: string): Promise<Object3D> {
  const buf = readFileSync(caminho)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return (await new GLTFLoader().parseAsync(ab, '')).scene
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const juntos = args.includes('--separados') ? CADA_NO_SOZINHO : TODOS_JUNTOS
  const ponto = (o: number[]) => `(${o.map((n) => n.toFixed(2)).join(', ')})`
  for (const caminho of args.filter((a) => !a.startsWith('--'))) {
    const raiz = await carregarGlb(caminho)
    const lista = sobreposicoes(raiz, juntos)
    const emendas = emendasAbertas(raiz, juntos)
    console.log(`${caminho}: ${lista.length} sobreposições, ${emendas.length} emendas abertas`)
    for (const s of lista)
      console.log(
        `  ${(s.area * 1e4).toFixed(0).padStart(6)} cm²  ${s.a}  x  ${s.b}  em ${ponto(s.onde)}`,
      )
    for (const s of emendas)
      console.log(
        `  ${String(s.vertices).padStart(6)} em T  ${s.a}  x  ${s.b}  em ${ponto(s.onde)}`,
      )
  }
}
