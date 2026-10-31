import { beforeAll, describe, expect, test } from 'bun:test'
import { Box3, type BufferGeometry, Mesh, type Object3D, Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { CORPO } from '../src/sistemas/corpo'
import {
  arquivoDaIlha,
  bate,
  CENTRO_DO_CORPO,
  carregarGlb,
  type Forma,
  gradeDeAndar,
  topoDaForma,
} from './ajuda-colisores'

/**
 * Os brinquedos de minijogo das ilhas (31/10/2026): o quiosque do festival no Pico (nó
 * `brinquedo-do-festival`, 2 × 2 m, perto do palco) e a barraca do jogo na feira da Vila Doce (nó
 * `barraca-do-jogo`, 2 × 1,5 m). Cada um tem o nó `tela` (0,8 × 0,6 m, de frente para quem joga, com
 * coordenadas de textura de 0 a 1, onde o jogo põe a capa do minijogo, como no fliperama), a âncora
 * `jogar` na frente (livre para o corpo e alcançável a pé da chegada), um colisor simples e até 4 mil
 * triângulos.
 */
interface Brinquedo {
  arquivo: string
  no: string
  colisor: string
  pegada: [number, number]
  /** Âncoras que o brinquedo não pode tapar: a pelo menos esta distância da caixa dele. */
  longeDe: Record<string, number>
}

const BRINQUEDOS: Record<string, Brinquedo> = {
  pico: {
    arquivo: 'pico.glb',
    no: 'brinquedo-do-festival',
    colisor: 'col-quiosque-1',
    pegada: [2, 2],
    longeDe: {
      palco: 3.2,
      'banda-xilofone': 2,
      'banda-violao': 2,
      'banda-bateria': 2,
      'musico-xilofone': 2,
      'musico-violao': 2,
      'musico-bateria': 2,
      'instrumento-violao': 2,
      'trilha-inicio': 3,
      'subida-largada': 3,
      morador: 2,
      'lumi-4': 0.5,
    },
  },
  'vila-doce': {
    arquivo: 'vila-doce.glb',
    no: 'barraca-do-jogo',
    colisor: 'col-barraca-do-jogo-1',
    pegada: [2, 1.5],
    longeDe: {
      morador: 2,
      padaria: 2,
      sorveteria: 2,
      fonte: 3,
      chegada: 3,
      'telhados-inicio': 2,
      'barraca-5': 1,
      'barraca-6': 1,
      'lumi-3': 1,
    },
  },
}

interface Lido {
  raiz: Object3D
  formas: Forma[]
}
const lidos = new Map<string, Lido>()

beforeAll(async () => {
  for (const [ilha, b] of Object.entries(BRINQUEDOS)) {
    const raiz = await carregarGlb(arquivoDaIlha(b.arquivo))
    raiz.updateMatrixWorld(true)
    lidos.set(ilha, {
      raiz,
      formas: lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha'),
    })
  }
}, 30_000)

const malhas = (no: Object3D) => {
  const lista: Mesh[] = []
  no.traverse((o) => {
    if (o instanceof Mesh) lista.push(o)
  })
  return lista
}
const triangulos = (g: BufferGeometry) =>
  (g.index ? g.index.count : g.getAttribute('position').count) / 3

describe.each(Object.entries(BRINQUEDOS))('o brinquedo de minijogo: %s', (ilha, b) => {
  const lido = () => lidos.get(ilha) as Lido

  test('a tela mede 0,8 × 0,6 m (±2 cm), é um retângulo com UV de 0 a 1 e olha para a âncora jogar', () => {
    const { raiz } = lido()
    const tela = raiz.getObjectByName('tela')
    if (!tela) throw new Error('sem o nó tela')
    const [m] = malhas(tela)
    if (!m) throw new Error('tela sem malha')
    expect(malhas(tela)).toHaveLength(1)
    expect(triangulos(m.geometry)).toBe(2)
    const pos = m.geometry.getAttribute('position')
    const pts = Array.from({ length: pos.count }, (_, i) =>
      new Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld),
    )
    // Os quatro cantos: o lado de baixo (horizontal) e o de pé.
    const ys = pts.map((p) => p.y)
    const baixo = pts.filter((p) => p.y < Math.min(...ys) + 0.01)
    const alto = Math.max(...ys) - Math.min(...ys)
    expect(baixo.length).toBeGreaterThanOrEqual(2)
    const largura = (baixo[0] as Vector3).distanceTo(baixo[1] as Vector3)
    expect(Math.abs(largura - 0.8)).toBeLessThanOrEqual(0.02)
    expect(Math.abs(alto - 0.6)).toBeLessThanOrEqual(0.02)
    const uv = m.geometry.getAttribute('uv')
    expect(uv).toBeDefined()
    const us = Array.from({ length: uv.count }, (_, i) => uv.getX(i))
    const vs = Array.from({ length: uv.count }, (_, i) => uv.getY(i))
    expect(Math.min(...us)).toBeCloseTo(0, 3)
    expect(Math.max(...us)).toBeCloseTo(1, 3)
    expect(Math.min(...vs)).toBeCloseTo(0, 3)
    expect(Math.max(...vs)).toBeCloseTo(1, 3)
    // A frente da tela (a normal da face) aponta para quem fica na âncora jogar.
    const [a, c, d] = [pts[0], pts[1], pts[2]] as Vector3[]
    const normal = new Vector3()
      .subVectors(c as Vector3, a as Vector3)
      .cross(new Vector3().subVectors(d as Vector3, a as Vector3))
      .normalize()
    const meio = pts.reduce((s, p) => s.add(p), new Vector3()).divideScalar(pts.length)
    const jogar = raiz.getObjectByName('jogar')?.position
    if (!jogar) throw new Error('sem a âncora jogar')
    const paraJogar = new Vector3(jogar.x - meio.x, 0, jogar.z - meio.z).normalize()
    expect(normal.dot(paraJogar)).toBeGreaterThan(0.95)
    // A tela fica na altura dos olhos de quem joga (o meio entre 1,2 e 1,9 m do chão).
    expect(meio.y - jogar.y).toBeGreaterThan(1.2)
    expect(meio.y - jogar.y).toBeLessThan(1.9)
    // Só a tela tem coordenadas de textura no arquivo (as outras malhas não pesam com elas).
    const comUv = malhas(raiz).filter((o) => o.geometry.getAttribute('uv'))
    expect(comUv.map((o) => o.name)).toEqual([m.name])
  })

  test('o desenho tem a pegada pedida, até 4 mil triângulos (com a tela) e um colisor simples', () => {
    const { raiz, formas } = lido()
    const no = raiz.getObjectByName(b.no)
    const tela = raiz.getObjectByName('tela')
    if (!no || !tela) throw new Error(`sem o nó ${b.no}`)
    const total = [...malhas(no), ...malhas(tela)].reduce((s, m) => s + triangulos(m.geometry), 0)
    expect(total).toBeLessThanOrEqual(4000)
    const col = formas.find((c) => c.nome === b.colisor)
    if (col?.forma !== 'caixa') throw new Error(`sem a caixa ${b.colisor}`)
    const [w, d] = b.pegada
    const lados = [col.meio[0] * 2, col.meio[2] * 2].sort((p, q) => q - p)
    expect(lados[0]).toBeCloseTo(Math.max(w, d), 2)
    expect(lados[1]).toBeCloseTo(Math.min(w, d), 2)
    // O desenho cabe na pegada (com 10 cm para o beiral e os pingos do toldo).
    const caixa = new Box3().setFromObject(no)
    const diagonal = Math.hypot(caixa.max.x - caixa.min.x, caixa.max.z - caixa.min.z)
    expect(diagonal).toBeLessThanOrEqual(Math.hypot(w + 0.2, d + 0.2) + 0.6)
    // O colisor não entra em nenhum outro colisor da ilha (lojas, barracas, palco, bancos).
    const meio = new Vector3(...col.posicao)
    const batem = formas.filter((c) => {
      if (c === col || c.nome === 'col-terreno') return false
      const p = new Vector3(...c.posicao)
      const r = c.forma === 'caixa' ? Math.hypot(c.meio[0], c.meio[2]) : c.raio
      return (
        Math.hypot(p.x - meio.x, p.z - meio.z) < r + Math.hypot(col.meio[0], col.meio[2]) - 0.05
      )
    })
    expect(batem.map((c) => c.nome)).toEqual([])
  })

  test('não tapa o que importa em volta', () => {
    const { raiz, formas } = lido()
    const col = formas.find((c) => c.nome === b.colisor) as Forma
    const meio = new Vector3(...col.posicao)
    const raio = col.forma === 'caixa' ? Math.hypot(col.meio[0], col.meio[2]) : 1
    for (const [nome, folga] of Object.entries(b.longeDe)) {
      const p = raiz.getObjectByName(nome)?.position
      if (!p) throw new Error(`sem a âncora ${nome}`)
      expect({ nome, d: Math.hypot(p.x - meio.x, p.z - meio.z) - raio >= folga }).toEqual({
        nome,
        d: true,
      })
    }
  })

  test('a âncora jogar fica livre para o corpo, na frente da tela, e se chega a ela a pé da chegada', () => {
    const { raiz, formas } = lido()
    const jogar = raiz.getObjectByName('jogar')?.position
    const chegada = raiz.getObjectByName('chegada')?.position
    if (!jogar || !chegada) throw new Error('sem jogar ou chegada')
    const corpo = new Vector3(jogar.x, jogar.y + CENTRO_DO_CORPO + 0.05, jogar.z)
    const batem = formas.filter((c) => topoDaForma(c) > jogar.y + CORPO.degrau && bate(c, corpo))
    expect(batem.map((c) => c.nome)).toEqual([])
    const terreno = raiz.getObjectByName('col-terreno') as Mesh
    const grade = gradeDeAndar(terreno, formas)
    expect(grade.chegaPerto(grade.alcance(chegada.x, chegada.z), jogar.x, jogar.z, 0.4)).toBe(true)
  }, 30_000)
})
