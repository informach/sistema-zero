import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  Box3,
  type BufferGeometry,
  DoubleSide,
  type Material,
  Mesh,
  type Object3D,
  Raycaster,
  Vector3,
} from 'three'
import { ALTURA_DAS_NUVENS, RAIO_DA_ILHA_DO_ANEL } from '../src/mundo/medidas'
import { arquivoDaIlha, carregarGlb } from './ajuda-colisores'

/**
 * As silhuetas das ilhas do anel (`ilhas-do-anel.glb`, `arte/mundo/ilhas_anel.py`, 31/10/2026): a
 * versão leve sai da ilha completa, com os marcos. As ilhas mais altas ficam nos postos mais altos
 * (pedido da dona), nas duas versões. A silhueta é UMA malha por ilha (o nó com o `id`), até 3 mil
 * triângulos, com cor por vértice, e tem a mesma altura e a mesma largura da completa no mesmo
 * referencial (o jogo põe as duas no mesmo grupo e gira as duas com `giroDaIlha`): a troca na ponte
 * não muda o tamanho. Medido como o teste dos marcos: o desenho (as malhas que não são `col-*` nem
 * `escalada-*`), somando os 7 m das Nuvens (`ALTURA_DAS_NUVENS`). Desde 01/11/2026 (lacunas, L11) a
 * altura sobe na ordem dos postos, sem empate: Bosque 14,4, Vila 15,5, Recife 16,8, Pico 18,2, Vale
 * 19,8 e Nuvens 24 (a Vila e o Recife ficavam abaixo do Bosque).
 */
const ILHAS: Record<string, { arquivo: string; alvo: number; soma: number }> = {
  bosque: { arquivo: 'bosque.glb', alvo: 14, soma: 0 },
  'vila-doce': { arquivo: 'vila-doce.glb', alvo: 15.5, soma: 0 },
  recife: { arquivo: 'recife.glb', alvo: 16.8, soma: 0 },
  pico: { arquivo: 'pico.glb', alvo: 18, soma: 0 },
  'vale-dos-dinos': { arquivo: 'vale-dos-dinos.glb', alvo: 19.8, soma: 0 },
  nuvens: { arquivo: 'nuvens.glb', alvo: 24, soma: ALTURA_DAS_NUVENS },
}

const SILHUETAS = join(import.meta.dir, '..', 'src', 'assets', 'mundo', 'ilhas-do-anel.glb')
const TETO_DE_TRIANGULOS = 3000
const DIFERENCA_MAXIMA = 0.05

interface Gltf {
  scenes: { nodes: number[] }[]
  nodes: { name?: string; mesh?: number; children?: number[] }[]
  meshes: {
    primitives: { attributes: Record<string, number>; indices?: number; material?: number }[]
  }[]
  materials: { name?: string; emissiveFactor?: number[] }[]
  accessors: { count: number }[]
}

function jsonDe(arquivo: string): Gltf {
  const buf = readFileSync(arquivo)
  return JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'))
}

function desenho(raiz: Object3D): Mesh[] {
  const lista: Mesh[] = []
  raiz.traverse((o) => {
    if (o instanceof Mesh && !o.name.startsWith('col-') && !o.name.startsWith('escalada-'))
      lista.push(o)
  })
  return lista
}

/** A caixa dos vértices do desenho (no referencial do arquivo). */
function caixaDe(raiz: Object3D): Box3 {
  raiz.updateMatrixWorld(true)
  const caixa = new Box3()
  const v = new Vector3()
  for (const m of desenho(raiz)) {
    const pos = (m.geometry as BufferGeometry).getAttribute('position')
    for (let i = 0; i < pos.count; i++)
      caixa.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld))
  }
  return caixa
}

/** A altura de cima para baixo em (x, z), olhando o desenho todo (ou undefined, se não há nada). */
function alturaEm(malhas: Mesh[], x: number, z: number): number | undefined {
  const raio = new Raycaster(new Vector3(x, 80, z), new Vector3(0, -1, 0))
  return raio.intersectObjects(malhas, false)[0]?.point.y
}

let silhuetas: Object3D
let json: Gltf
const completas = new Map<string, Object3D>()

beforeAll(async () => {
  silhuetas = await carregarGlb(SILHUETAS)
  silhuetas.updateMatrixWorld(true)
  json = jsonDe(SILHUETAS)
  for (const [id, ilha] of Object.entries(ILHAS)) {
    const raiz = await carregarGlb(arquivoDaIlha(ilha.arquivo))
    raiz.updateMatrixWorld(true)
    completas.set(id, raiz)
  }
}, 30_000)

/** Quanto, no mínimo, cada ilha passa da do posto de antes (nas duas versões). */
const DEGRAU_MINIMO = 1

test('a altura sobe com o posto, nas duas versões (a ordem de ILHAS é a dos postos)', () => {
  for (const versao of ['completa', 'silhueta'] as const) {
    const topos = Object.entries(ILHAS).map(
      ([id, ilha]) =>
        caixaDe(
          versao === 'completa'
            ? (completas.get(id) as Object3D)
            : (silhuetas.getObjectByName(id) as Object3D),
        ).max.y + ilha.soma,
    )
    for (let i = 1; i < topos.length; i++)
      expect((topos[i] as number) - (topos[i - 1] as number)).toBeGreaterThanOrEqual(DEGRAU_MINIMO)
  }
})

test('o arquivo das silhuetas tem só os seis nós das ilhas, cada um com o id dela', () => {
  const raizes = (json.scenes[0]?.nodes ?? []).map((i) => json.nodes[i]?.name)
  expect(raizes.sort()).toEqual(Object.keys(ILHAS).sort())
})

describe.each(Object.entries(ILHAS))('%s', (id, ilha) => {
  const no = () => silhuetas.getObjectByName(id) as Object3D
  const completa = () => completas.get(id) as Object3D

  test('o topo da ilha completa fica no alvo (±1 m)', () => {
    expect(Math.abs(caixaDe(completa()).max.y + ilha.soma - ilha.alvo)).toBeLessThanOrEqual(1)
  })

  test('o topo da silhueta fica no alvo (±1 m)', () => {
    expect(Math.abs(caixaDe(no()).max.y + ilha.soma - ilha.alvo)).toBeLessThanOrEqual(1)
  })

  test('a silhueta é uma malha só, de até 3 mil triângulos, com cor por vértice', () => {
    const gltf = json.nodes.find((n) => n.name === id)
    expect(gltf?.mesh).toBeDefined()
    expect(gltf?.children ?? []).toEqual([])
    const malha = json.meshes[gltf?.mesh as number]
    const primitivas = malha?.primitives ?? []
    const triangulos = primitivas.reduce(
      (soma, p) => soma + (json.accessors[p.indices as number]?.count ?? 0) / 3,
      0,
    )
    expect(triangulos).toBeLessThanOrEqual(TETO_DE_TRIANGULOS)
    const material = (p: (typeof primitivas)[number]) => json.materials[p.material as number]
    // O desenho no material `ilha`, com a cor em cada vértice; no Vale, a lava no dela, que brilha.
    const nomes = primitivas.map((p) => material(p)?.name).sort()
    expect(nomes).toEqual(id === 'vale-dos-dinos' ? ['ilha', 'lava'] : ['ilha'])
    for (const p of primitivas) {
      if (material(p)?.name === 'ilha') expect(p.attributes.COLOR_0).toBeDefined()
      else expect(Math.max(...(material(p)?.emissiveFactor ?? [0]))).toBeGreaterThan(0)
    }
    // Lida no three: a cor por vértice liga no material (a tinta da ilha mistura em cima dela).
    const materiais: Material[] = []
    no().traverse((o) => {
      if (o instanceof Mesh)
        materiais.push(...(Array.isArray(o.material) ? o.material : [o.material]))
    })
    expect(materiais.some((m) => m.name === 'ilha' && m.vertexColors)).toBe(true)
  })

  test('a silhueta tem a altura e a largura da completa (menos de 5%), no mesmo lugar', () => {
    const a = caixaDe(completa())
    const b = caixaDe(no())
    const ta = a.max.y + ilha.soma
    const tb = b.max.y + ilha.soma
    expect(Math.abs(tb - ta) / ta).toBeLessThan(DIFERENCA_MAXIMA)
    for (const eixo of ['x', 'z'] as const) {
      const largura = a.max[eixo] - a.min[eixo]
      expect(Math.abs(b.max[eixo] - b.min[eixo] - largura) / largura).toBeLessThan(DIFERENCA_MAXIMA)
      // As pontas no mesmo lugar (o mesmo referencial e o mesmo giro), não só a mesma medida.
      expect(Math.abs(b.min[eixo] - a.min[eixo]) / largura).toBeLessThan(DIFERENCA_MAXIMA)
      expect(Math.abs(b.max[eixo] - a.max[eixo]) / largura).toBeLessThan(DIFERENCA_MAXIMA)
    }
  })

  test('a silhueta copia o contorno: vista de cima, a altura bate com a da completa', () => {
    const malhasA = desenho(completa())
    const malhasB = desenho(no())
    for (const m of [...malhasA, ...malhasB]) (m.material as Material).side = DoubleSide
    let pontos = 0
    let iguais = 0
    let noTampo = 0
    let tampoIgual = 0
    for (let x = -RAIO_DA_ILHA_DO_ANEL; x <= RAIO_DA_ILHA_DO_ANEL; x += 1)
      for (let z = -RAIO_DA_ILHA_DO_ANEL; z <= RAIO_DA_ILHA_DO_ANEL; z += 1) {
        if (Math.hypot(x, z) > RAIO_DA_ILHA_DO_ANEL - 0.5) continue
        const ya = alturaEm(malhasA, x, z)
        const yb = alturaEm(malhasB, x, z)
        if (ya === undefined) continue
        pontos++
        if (yb !== undefined && Math.abs(yb - ya) < 0.75) iguais++
        // O chão onde se pisa (o tampo em y = 1, em cima do colisor da leve) continua lá.
        if (Math.abs(ya - 1) < 0.15) {
          noTampo++
          if (yb !== undefined && Math.abs(yb - 1) < 0.15) tampoIgual++
        }
      }
    expect(iguais / pontos).toBeGreaterThan(0.85)
    expect(tampoIgual / noTampo).toBeGreaterThan(0.85)
  }, 60_000)
})
