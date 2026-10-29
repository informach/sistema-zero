import { beforeAll, describe, expect, test } from 'bun:test'
import type { Mesh, Object3D } from 'three'
import { type ColisorDaIlha, lerColisores, soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { GRAVIDADE } from '../src/mundo/medidas'
import { alcanceDoPulo, beiradaMaximaDoPulo, CORPO } from '../src/sistemas/corpo'
import {
  arquivoDaIlha,
  carregarGlb,
  type Forma,
  gradeDeAndar,
  grupo,
  jsonDoGlb,
  TAMPO,
  topoDaForma,
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
    // A caverna de cristal (fase3-07), com `caverna` no nome.
    expect({
      parede: quantos('col-caverna-parede'),
      teto: quantos('col-cil-caverna-teto'),
      chao: quantos('col-cil-caverna-chao'),
      rampa: quantos('col-caverna-rampa'),
      boca: quantos('col-caverna-boca'),
      colunas: quantos('col-cil-caverna-coluna'),
      laje: quantos('col-cil-caverna-laje'),
      cristais: quantos('col-cil-caverna-cristal'),
      poste: quantos('col-cil-poste-caverna'),
    }).toEqual({
      parede: 32,
      teto: 1,
      chao: 1,
      rampa: 2,
      boca: 3,
      colunas: 4,
      laje: 1,
      cristais: 4,
      poste: 1,
    })
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
    // Na caverna, as paredes e o teto seguram a câmera; o poste da placa, não.
    expect(soParaOCorpo('col-caverna-parede-1')).toBe(false)
    expect(soParaOCorpo('col-cil-caverna-teto-1')).toBe(false)
    expect(soParaOCorpo('col-cil-poste-caverna-1')).toBe(true)
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
    // A âncora fica no chão da trilha (que ali já subiu um pouco), não no chão da ilha.
    expect(Math.abs((chaoEm(inicio.x, inicio.z) ?? 0) - inicio.y)).toBeLessThan(0.1)
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

describe('a subida ao cume e a descida de trenó (fase3-07)', () => {
  let grade: ReturnType<typeof gradeDeAndar>
  beforeAll(() => {
    grade = gradeDeAndar(terreno, formas)
  }, 120_000)
  const pontos = (prefixo: string) => {
    const lista = []
    for (let i = 1; raiz.getObjectByName(`${prefixo}-${i}`); i++)
      lista.push(ancora(`${prefixo}-${i}`))
    return lista
  }

  test('as quatro paradas sobem pela trilha, no chão dela, e a última entra no platô', () => {
    const paradas = pontos('subida')
    expect(paradas).toHaveLength(4)
    let antes = ancora('trilha-inicio').y
    for (const p of paradas) {
      expect(Math.abs((grade.chaoEm(p.x, p.z) ?? 0) - p.y)).toBeLessThan(0.1)
      expect(p.y).toBeGreaterThan(antes + 1)
      antes = p.y
    }
    const cume = ancora('cume')
    expect(Math.abs((paradas[3]?.y ?? 0) - cume.y)).toBeLessThan(0.15)
    const andou = grade.alcance(ancora('chegada').x, ancora('chegada').z)
    for (const p of paradas) expect(grade.chegaPerto(andou, p.x, p.z, 0.6)).toBe(true)
  })

  test('os cinco flocos ficam na linha do meio da trilha, subindo', () => {
    const flocos = pontos('floco')
    expect(flocos).toHaveLength(5)
    let antes = TAMPO
    for (const f of flocos) {
      expect(Math.abs((grade.chaoEm(f.x, f.z) ?? 0) - f.y)).toBeLessThan(0.1)
      expect(f.y).toBeGreaterThan(antes)
      antes = f.y
    }
  })

  test('o trenó espera no platô, ao alcance de quem chega, sem tapar a boca da trilha', () => {
    const treno = ancora('treno')
    const cume = ancora('cume')
    expect(Math.abs(treno.y - cume.y)).toBeLessThan(0.05)
    expect(Math.hypot(treno.x - cume.x, treno.z - cume.z)).toBeLessThan(2)
    const andou = grade.alcance(ancora('chegada').x, ancora('chegada').z)
    expect(grade.chegaPerto(andou, treno.x, treno.z, 1.5)).toBe(true)
    expect(grade.chegaPerto(andou, cume.x, cume.z, 0.6)).toBe(true)
  })

  test('a linha do trenó sai dele, desce sempre pelo chão da trilha e acaba no pé', () => {
    const curva = pontos('treno-curva')
    expect(curva.length).toBeGreaterThan(20)
    const treno = ancora('treno')
    expect(Math.hypot((curva[0]?.x ?? 0) - treno.x, (curva[0]?.z ?? 0) - treno.z)).toBeLessThan(
      0.05,
    )
    for (let i = 1; i < curva.length; i++) {
      const a = curva[i - 1]
      const b = curva[i]
      if (!a || !b) continue
      expect(b.y).toBeLessThanOrEqual(a.y + 0.01)
      // Trechos curtos: a linha reta entre dois pontos não corta a parede da curva.
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(2.5)
      expect(Math.abs((grade.chaoEm(b.x, b.z) ?? 0) - b.y)).toBeLessThan(0.1)
    }
    const fim = curva[curva.length - 1]
    expect((fim?.y ?? 0) - TAMPO).toBeLessThan(CORPO.degrau)
  })
})

describe('a caverna de cristal (fase3-07)', () => {
  const ehPiso = (c: Forma) => /caverna-(chao|rampa)/.test(c.nome)

  test('chega-se à boca andando da chegada da ponte, por trás da montanha', () => {
    const grade = gradeDeAndar(terreno, formas)
    const chegada = ancora('chegada')
    const boca = ancora('caverna-entrada')
    expect(grade.chegaPerto(grade.alcance(chegada.x, chegada.z), boca.x, boca.z, 0.6)).toBe(true)
  }, 120_000)

  test('da boca, a rampa desce até a galeria, o laguinho e o pé de cada saliência', () => {
    const grade = gradeDeAndar(terreno, formas, 9, 0.25, {
      meioX: -18,
      ePiso: ehPiso,
      pisoMinimo: 0.3,
    })
    const boca = ancora('caverna-entrada')
    const dentro = grade.alcance(boca.x, boca.z)
    for (const nome of ['caverna-galeria', 'caverna-laguinho', 'caverna-degrau-1']) {
      const p = ancora(nome)
      expect([nome, grade.chegaPerto(dentro, p.x, p.z, 1.2)]).toEqual([nome, true])
    }
  }, 120_000)

  test('as saliências levam, pulando, do chão da galeria ao cristal raro', () => {
    const altura = beiradaMaximaDoPulo(GRAVIDADE)
    const alcance = alcanceDoPulo(CORPO.andar, GRAVIDADE)
    const colunas = formas
      .filter((c) => /caverna-(coluna|laje)/.test(c.nome))
      .sort((a, b) => topoDaForma(a) - topoDaForma(b))
    expect(colunas).toHaveLength(5)
    const chao = formas.find((c) => c.nome.startsWith('col-cil-caverna-chao'))
    let antes = topoDaForma(chao as Forma)
    let anterior: Forma | null = null
    for (const c of colunas) {
      if (c.forma !== 'cilindro') throw new Error(`${c.nome} não é cilindro`)
      const topo = topoDaForma(c)
      expect([c.nome, topo - antes < altura * 0.8]).toEqual([c.nome, true])
      if (anterior?.forma === 'cilindro') {
        const vao =
          Math.hypot(c.posicao[0] - anterior.posicao[0], c.posicao[2] - anterior.posicao[2]) -
          c.raio -
          anterior.raio
        expect([c.nome, vao < alcance * 0.8]).toEqual([c.nome, true])
      }
      antes = topo
      anterior = c
    }
    const cristal = ancora('cristal-raro')
    const laje = colunas[colunas.length - 1]
    expect(Math.abs(cristal.y - topoDaForma(laje as Forma))).toBeLessThan(0.05)
  })
})
