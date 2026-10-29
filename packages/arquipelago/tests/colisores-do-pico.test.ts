import { beforeAll, describe, expect, test } from 'bun:test'
import type { Mesh, Object3D } from 'three'
import { type ColisorDaIlha, lerColisores, soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { CORPO } from '../src/sistemas/corpo'
import {
  arquivoDaIlha,
  carregarGlb,
  type Forma,
  gradeDeAndar,
  grupo,
  jsonDoGlb,
  TAMPO,
} from './ajuda-colisores'

/**
 * O Pico Gelado (`arte/ilhas-b/pico.py`, aj-ligar-01): a montanha com a trilha cavada na encosta,
 * o platô do cume e os colisores das peças. A busca em grade confere que a criança anda da chegada
 * da ponte até o platô pela trilha, com o corpo inteiro cabendo, sem degrau maior que o do corpo.
 */
const ARQUIVO = arquivoDaIlha('pico.glb')

let raiz: Object3D
let colisores: ColisorDaIlha[]
let formas: Forma[]
let terreno: Mesh
const ancora = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o.position
}

beforeAll(async () => {
  raiz = await carregarGlb(ARQUIVO)
  raiz.updateMatrixWorld(true)
  colisores = lerColisores(raiz)
  formas = colisores.filter((c): c is Forma => c.forma !== 'malha')
  const t = raiz.getObjectByName('col-terreno') as Mesh | undefined
  if (!t?.isMesh) throw new Error('pico.glb sem col-terreno')
  terreno = t
})

describe('os nós col-* do Pico', () => {
  test('existem todos os grupos, sem material (não desenham)', () => {
    const doc = jsonDoGlb(ARQUIVO)
    const nos = doc.nodes.filter((n) => n.name?.startsWith('col-'))
    const quantos = (g: string) => nos.filter((n) => grupo(n.name ?? '') === g).length
    expect(quantos('col-terreno')).toBe(1)
    expect(quantos('col-cil-iglu')).toBe(1)
    expect(quantos('col-tunel-iglu')).toBe(1)
    expect(quantos('col-cil-palco')).toBe(1)
    expect(quantos('col-degrau-palco')).toBe(2)
    expect(quantos('col-parede-gelo')).toBe(3)
    expect(quantos('col-topo-parede')).toBe(1)
    expect(quantos('col-treno')).toBe(1)
    expect(quantos('col-cil-pinheiro')).toBe(12)
    expect(quantos('col-cil-boneco')).toBe(2)
    expect(quantos('col-bloco-de-gelo')).toBe(5)
    expect(quantos('col-cil-poste-lampiao')).toBe(3)
    expect(quantos('col-cil-poste-bandeira')).toBe(2)
    expect(quantos('col-cil-poste-mastro')).toBe(1)
    expect(quantos('col-cil-poste-trilha')).toBeGreaterThan(20)
    expect(quantos('col-guarda-trilha')).toBe(quantos('col-cil-poste-trilha') - 1)
    for (const n of nos) expect(n.mesh === undefined || doc.meshes[n.mesh] !== undefined).toBe(true)
    for (const n of nos) {
      if (n.mesh === undefined) continue
      for (const p of doc.meshes[n.mesh]?.primitives ?? []) expect(p.material).toBeUndefined()
    }
  })

  test('a câmera passa pelo guarda-corpo e pelos postes; a montanha e o iglu a seguram', () => {
    expect(soParaOCorpo('col-guarda-trilha-1')).toBe(true)
    expect(soParaOCorpo('col-cil-poste-trilha-1')).toBe(true)
    expect(soParaOCorpo('col-cil-poste-lampiao-1')).toBe(true)
    expect(soParaOCorpo('col-cil-iglu-1')).toBe(false)
  })
})

describe('a trilha até o cume', () => {
  let grade: ReturnType<typeof gradeDeAndar>
  const celulas = () => grade.celulas
  const centro = (i: number) => grade.centro(i)
  const alcance = (x: number, z: number) => grade.alcance(x, z)
  const chaoEm = (x: number, z: number) => grade.chaoEm(x, z)
  beforeAll(() => {
    grade = gradeDeAndar(terreno, formas)
  }, 120_000)

  test('da chegada da ponte, a criança anda até o platô do cume', () => {
    const chegada = ancora('chegada')
    const cume = ancora('cume')
    const andou = alcance(chegada.x, chegada.z)
    let noPlato = 0
    for (const i of andou) {
      const { x, z } = centro(i)
      const c = celulas()[i]
      if (c && Math.hypot(x - cume.x, z - cume.z) < 2 && Math.abs(c.y - cume.y) < 0.15) noPlato++
    }
    // Pelo menos um pedaço do platô (não só uma célula na beira).
    expect(noPlato).toBeGreaterThan(20)
  })

  test('a trilha começa na âncora de baixo e termina no platô', () => {
    const inicio = ancora('trilha-inicio')
    const fim = ancora('trilha-fim')
    const cume = ancora('cume')
    // A um degrau do chão da ilha: entra-se nela andando.
    expect((chaoEm(inicio.x, inicio.z) ?? 0) - TAMPO).toBeLessThan(CORPO.degrau)
    expect(Math.abs((chaoEm(fim.x, fim.z) ?? 0) - cume.y)).toBeLessThan(0.15)
    expect(cume.y - TAMPO).toBeGreaterThan(7)
  })

  test('a encosta não se sobe: o alto só se alcança pela trilha e pelo platô', () => {
    // Na trilha, o chão de cada célula alta tem logo ao lado (dentro de 1,2 m) a parede de rocha
    // de dentro: um chão bem mais alto. Na encosta lisa, o chão sobe aos poucos e não há parede.
    // Toda célula alta alcançada andando é da trilha (com a parede ao lado) ou do cume.
    const chegada = ancora('chegada')
    const cume = ancora('cume')
    const andou = alcance(chegada.x, chegada.z)
    let altas = 0
    for (const i of andou) {
      const c = celulas()[i]
      if (!c || c.y < TAMPO + 1.5) continue
      altas++
      const { x, z } = centro(i)
      // O platô (uns 2,6 m de raio) e o fim da rampa, que entra nele com a parede sumindo.
      const d = Math.hypot(x - cume.x, z - cume.z)
      if (d < 2.8) continue
      // Para o meio da montanha, a parede de dentro.
      const ux = (cume.x - x) / d
      const uz = (cume.z - z) / d
      const parede = [0.5, 0.8, 1.2, 1.6].some(
        (k) => (chaoEm(x + ux * k, z + uz * k) ?? -Infinity) > c.y + 0.8,
      )
      expect(parede).toBe(true)
    }
    expect(altas).toBeGreaterThan(100)
  })

  test('as âncoras dos lugares ficam fora da montanha, em chão plano', () => {
    for (const nome of [
      'morador',
      'lumi-1',
      'lumi-2',
      'lumi-3',
      'lumi-4',
      'iglu',
      'lago-congelado',
    ]) {
      const p = ancora(nome)
      const y = chaoEm(p.x, p.z)
      expect(y).toBeDefined()
      expect(Math.abs((y ?? 0) - TAMPO)).toBeLessThan(0.15)
    }
  })
})
