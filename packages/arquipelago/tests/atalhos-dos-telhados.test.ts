import { beforeAll, describe, expect, test } from 'bun:test'
import { type Mesh, type Object3D, Quaternion, Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import {
  type AncorasDosTelhados,
  NOMES_DAS_ANCORAS_DOS_TELHADOS,
  telhadosNoModelo,
} from '../src/mundo/telhados'
import { CORPO } from '../src/sistemas/corpo'
import {
  arquivoDaIlha,
  bate,
  CENTRO_DO_CORPO,
  carregarGlb,
  type Forma,
  gradeDeAndar,
  pisoEm,
  TAMPO,
  topoDaForma,
} from './ajuda-colisores'

/**
 * Os atalhos pelos telhados da Vila Doce (31/10/2026, pedido dela): a prancha que sobe da casinha 1
 * (`telhados-1`) para a casinha 3 (`telhados-3`) sem passar pela 2, e a escada de caixotes do chão até
 * a casinha 2 (`telhados-2`). Confere contra os colisores do `vila-doce.glb`: dá para subir a pé (a
 * rampa dentro do que o corpo sobe, a prancha com pelo menos 0,6 m de largura, os degraus de até
 * 0,45 m, o corpo cabendo em cada ponto), cada atalho chega ao telhado certo, o caminho por ele é mais
 * curto que o do percurso e ele passa longe dos confeitos que pula (os pontos do percurso não mudam).
 */
let raiz: Object3D
let formas: Forma[]
const ancora = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o.position.clone()
}

beforeAll(async () => {
  raiz = await carregarGlb(arquivoDaIlha('vila-doce.glb'))
  raiz.updateMatrixWorld(true)
  formas = lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha')
})

/** O tampo da prancha: as duas pontas (a mais baixa primeiro) no meio da largura, e a largura. */
function tampoDaPrancha() {
  const c = formas.find((f) => f.nome === 'col-prancha-1')
  if (c?.forma !== 'caixa') throw new Error('sem col-prancha-1')
  const q = new Quaternion(...c.rotacao)
  const meio = new Vector3(...c.posicao).add(new Vector3(0, c.meio[1], 0).applyQuaternion(q))
  const ao = new Vector3(c.meio[0], 0, 0).applyQuaternion(q)
  const [a, b] = [meio.clone().sub(ao), meio.clone().add(ao)].sort((p, r) => p.y - r.y) as [
    Vector3,
    Vector3,
  ]
  return { c, a, b, largura: c.meio[2] * 2 }
}

/** O chão debaixo de (x, z) sem contar uma forma. */
const pisoSem = (fora: Forma, x: number, z: number) =>
  pisoEm(
    formas.filter((f) => f !== fora),
    x,
    z,
  )

/** O corpo em pé com os pés em `p` não bate em nada mais alto que o degrau (o piso, sim). */
function corpoCabe(p: Vector3) {
  const corpo = new Vector3(p.x, p.y + CENTRO_DO_CORPO + 0.05, p.z)
  return formas
    .filter((f) => topoDaForma(f) > p.y + CORPO.degrau && bate(f, corpo))
    .map((f) => f.nome)
}

const distanciaAoSegmento = (p: Vector3, a: Vector3, b: Vector3) => {
  const ab = b.clone().sub(a)
  const t = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq()))
  return a.clone().addScaledVector(ab, t).distanceTo(p)
}

function percurso() {
  const a = Object.fromEntries(
    NOMES_DAS_ANCORAS_DOS_TELHADOS.map((n) => {
      const p = ancora(n)
      return [n, { x: p.x, y: p.y, z: p.z }]
    }),
  ) as AncorasDosTelhados
  return telhadosNoModelo(a)
}

describe('a prancha da casinha 1 para a casinha 3', () => {
  test('sai do telhado da casinha 1, chega ao da casinha 3 e tem pelo menos 0,6 m de largura', () => {
    const { c, a, b, largura } = tampoDaPrancha()
    expect(largura).toBeGreaterThanOrEqual(0.6)
    const t1 = ancora('telhados-1')
    const t3 = ancora('telhados-3')
    const embaixoA = pisoSem(c, a.x, a.z)
    const embaixoB = pisoSem(c, b.x, b.z)
    expect(embaixoA.y).toBeCloseTo(t1.y, 2)
    expect(embaixoB.y).toBeCloseTo(t3.y, 2)
    // Da ponta para o telhado, um passo de nada (para cima ou para baixo, menos que o degrau).
    expect(Math.abs(a.y - t1.y)).toBeLessThan(CORPO.degrau)
    expect(Math.abs(b.y - t3.y)).toBeLessThan(CORPO.degrau)
  })

  test('a rampa fica dentro do que o corpo sobe andando', () => {
    const { a, b } = tampoDaPrancha()
    const graus = (Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z)) * 180) / Math.PI
    expect(graus).toBeLessThan(CORPO.sobeAte)
    expect(graus).toBeGreaterThan(0)
  })

  test('anda-se de ponta a ponta: o chão é a prancha (ou o telhado) e o corpo cabe em todo ponto', () => {
    const { c, a, b } = tampoDaPrancha()
    const n = Math.ceil(a.distanceTo(b) / 0.1)
    let anterior: number | null = null
    for (let k = 0; k <= n; k++) {
      const p = a.clone().lerp(b, k / n)
      const piso = pisoEm(formas, p.x, p.z)
      // No meio do vão, o piso é a própria prancha.
      if (pisoSem(c, p.x, p.z).y < p.y - 0.5) expect(piso.nome).toBe(c.nome)
      expect(Math.abs(piso.y - p.y)).toBeLessThan(0.1)
      if (anterior !== null) expect(Math.abs(piso.y - anterior)).toBeLessThan(0.1)
      anterior = piso.y
      expect({ k, batem: corpoCabe(new Vector3(p.x, piso.y, p.z)) }).toEqual({ k, batem: [] })
    }
  })

  test('é mais curto que ir pela casinha 2 e passa longe dos confeitos que pula', () => {
    const { a, b } = tampoDaPrancha()
    const t1 = ancora('telhados-1')
    const t2 = ancora('telhados-2')
    const t3 = ancora('telhados-3')
    const atalho = t1.distanceTo(a) + a.distanceTo(b) + b.distanceTo(t3)
    const peloPercurso = t1.distanceTo(t2) + t2.distanceTo(t3)
    expect(atalho).toBeLessThan(peloPercurso)
    const confeitos = percurso().vagalumes
    // O 2º confeito é o do pulo da casinha 1 para a 2, o 3º, o da 2 para a 3.
    for (const k of [1, 2]) {
      const v = confeitos[k]
      if (!v) throw new Error('sem confeito')
      expect(distanciaAoSegmento(new Vector3(v.x, v.y, v.z), a, b)).toBeGreaterThan(1)
    }
  })
})

describe('a escada de caixotes até a casinha 2', () => {
  const degraus = () =>
    formas
      .filter((f) => f.nome.startsWith('col-escada-caixote-'))
      .sort((p, q) => topoDaForma(p) - topoDaForma(q))

  test('degraus de até 0,45 m, do chão até o telhado da casinha 2, um encostado no outro', () => {
    const lista = degraus()
    expect(lista.length).toBeGreaterThanOrEqual(5)
    const t2 = ancora('telhados-2')
    let antes = TAMPO
    let anterior: Forma | null = null
    for (const d of lista) {
      const topo = topoDaForma(d)
      expect(topo - antes).toBeGreaterThan(0)
      expect(topo - antes).toBeLessThanOrEqual(CORPO.degrau + 1e-6)
      if (anterior) {
        const dist = Math.hypot(
          d.posicao[0] - anterior.posicao[0],
          d.posicao[2] - anterior.posicao[2],
        )
        expect(dist).toBeLessThan(0.55)
      }
      // Em pé no meio do degrau, o corpo cabe.
      expect(corpoCabe(new Vector3(d.posicao[0], topo, d.posicao[2]))).toEqual([])
      antes = topo
      anterior = d
    }
    expect(t2.y - antes).toBeGreaterThan(0)
    expect(t2.y - antes).toBeLessThanOrEqual(CORPO.degrau + 1e-6)
    // Do último degrau se pisa no telhado da casinha 2 (a menos de 0,6 m do meio dele).
    const ultimo = lista.at(-1) as Forma
    let pisaNoTelhado = false
    for (let a = 0; a < 2 * Math.PI; a += Math.PI / 18) {
      const x = ultimo.posicao[0] + Math.cos(a) * 0.6
      const z = ultimo.posicao[2] + Math.sin(a) * 0.6
      if (Math.abs(pisoEm(formas, x, z).y - t2.y) < 0.02) pisaNoTelhado = true
    }
    expect(pisaNoTelhado).toBe(true)
  })

  test('o pé da escada se alcança a pé da chegada', () => {
    const lista = degraus()
    const primeiro = lista[0] as Forma
    const segundo = lista[1] as Forma
    const terreno = raiz.getObjectByName('col-terreno') as Mesh
    const grade = gradeDeAndar(terreno, formas)
    const chegada = ancora('chegada')
    // Do lado de fora do primeiro degrau (o contrário do segundo).
    const fx = primeiro.posicao[0] - (segundo.posicao[0] - primeiro.posicao[0]) * 1.6
    const fz = primeiro.posicao[2] - (segundo.posicao[2] - primeiro.posicao[2]) * 1.6
    expect(grade.chegaPerto(grade.alcance(chegada.x, chegada.z), fx, fz, 0.5)).toBe(true)
  }, 30_000)

  test('do chão ao telhado da casinha 2, é mais curto que subir pelos caixotes do começo e pela casinha 1', () => {
    // Cada subida medida da base dela no chão: a largada do percurso (ao lado dos caixotes) e o pé da
    // escada (o chão na frente do primeiro degrau).
    const lista = degraus()
    const p = percurso()
    const largada = new Vector3(p.largada.x, p.largada.y, p.largada.z)
    const ti = ancora('telhados-inicio')
    const t1 = ancora('telhados-1')
    const t2 = ancora('telhados-2')
    const pontos = lista.map((d) => new Vector3(d.posicao[0], topoDaForma(d), d.posicao[2]))
    const [d0, d1] = lista as [Forma, Forma]
    const pe = new Vector3(
      d0.posicao[0] - (d1.posicao[0] - d0.posicao[0]),
      TAMPO,
      d0.posicao[2] - (d1.posicao[2] - d0.posicao[2]),
    )
    let atalho = pe.distanceTo(pontos[0] as Vector3)
    for (let k = 1; k < pontos.length; k++)
      atalho += (pontos[k - 1] as Vector3).distanceTo(pontos[k] as Vector3)
    atalho += (pontos.at(-1) as Vector3).distanceTo(t2)
    const peloPercurso = largada.distanceTo(ti) + ti.distanceTo(t1) + t1.distanceTo(t2)
    expect(atalho).toBeLessThan(peloPercurso)
  })
})
