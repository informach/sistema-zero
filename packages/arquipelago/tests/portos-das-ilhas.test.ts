import { beforeAll, describe, expect, test } from 'bun:test'
import { ilha as ilhaDoContrato } from '@sistemazero/arquipelago-contracts'
import { Matrix4, type Mesh, type Object3D, Quaternion, Raycaster, Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import {
  ALTURA_DAS_NUVENS,
  DISTANCIA_DA_TROCA,
  MARGEM_DA_ESPERA_PELO_CHAO,
  raioDaEsperaDaIlha,
} from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import {
  arquivoDaIlha,
  bate,
  CENTRO_DO_CORPO,
  carregarGlb,
  doPortoDoBarco,
  type Forma,
  gradeDeAndar,
  TAMPO,
  topoDaForma,
  topoEm,
} from './ajuda-colisores'

/**
 * Os pontos de embarque do barco nas cinco ilhas do anel que ainda não tinham porto (pedido de arte
 * de 30/10/2026, `arte/mundo/lib_cais.py`): o deque de praia do Bosque, da Vila Doce, do Pico e do
 * Vale e a torre de escada da Ilha das Nuvens, que flutua (no arquivo ela fica no tampo de sempre,
 * y = 1; no jogo, num grupo a y = 7, então o mar é y = −7 no arquivo).
 *
 * Confere, contra os GLBs: as âncoras `barco` (na linha d'água, proa para o mar) e `cais` (no
 * arranjo do Recife), os pés do cais em cima de um `col-cais-*` com o corpo cabendo, a caminhada do
 * cais até o tampo da ilha (busca em grade, sem degrau maior que o do corpo), o casco atracado sem
 * encostar em nada e o corredor de chegada do casco livre.
 */
interface Porto {
  arquivo: string
  /** O mar no referencial do arquivo. */
  mar: number
  /** Um ponto do tampo da ilha (x, z) longe da beira, aonde se chega andando do cais. */
  tampo: [number, number]
}

const PORTOS: Record<string, Porto> = {
  bosque: { arquivo: 'bosque.glb', mar: 0, tampo: [-15, 0] },
  'vila-doce': { arquivo: 'vila-doce.glb', mar: 0, tampo: [-6, 1.6] },
  pico: { arquivo: 'pico.glb', mar: 0, tampo: [-3.1, -8.5] },
  'vale-dos-dinos': { arquivo: 'vale-dos-dinos.glb', mar: 0, tampo: [-10, 0.4] },
  nuvens: { arquivo: 'nuvens.glb', mar: -ALTURA_DAS_NUVENS, tampo: [-7.8, -5.5] },
}

/** O casco do `barco.glb` (5 m por 2 m) da quilha (0,85 abaixo da âncora) ao alto da chaminé. */
const CASCO = { meioComprimento: 2.5, meiaBoca: 1.0, abaixo: 0.85, acima: 2.3 }
const CORREDOR = { comprimento: 25, meiaLargura: 5 }

function dentroDaForma(c: Forma, p: Vector3): boolean {
  const m = new Matrix4().compose(
    new Vector3(...c.posicao),
    new Quaternion(...c.rotacao),
    new Vector3(1, 1, 1),
  )
  const l = p.clone().applyMatrix4(m.invert())
  if (c.forma === 'caixa')
    return Math.abs(l.x) < c.meio[0] && Math.abs(l.y) < c.meio[1] && Math.abs(l.z) < c.meio[2]
  return Math.hypot(l.x, l.z) < c.raio && Math.abs(l.y) < c.meiaAltura
}

/** As alturas em que a malha do chão passa por (x, z), de cima para baixo. */
function chaoEm(terreno: Mesh, x: number, z: number): number[] {
  const raio = new Raycaster(new Vector3(x, 60, z), new Vector3(0, -1, 0))
  return raio.intersectObject(terreno, false).map((i) => i.point.y)
}

interface Lido {
  raiz: Object3D
  formas: Forma[]
  terreno: Mesh
  barco: { p: Vector3; q: Quaternion }
  cais: Vector3
}

async function ler(arquivo: string): Promise<Lido> {
  const raiz = await carregarGlb(arquivoDaIlha(arquivo))
  raiz.updateMatrixWorld(true)
  const formas = lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha')
  const terreno = raiz.getObjectByName('col-terreno') as Mesh
  const barco = raiz.getObjectByName('barco')
  const cais = raiz.getObjectByName('cais')
  if (!barco || !cais || !terreno) throw new Error(`${arquivo} sem barco, cais ou col-terreno`)
  const p = new Vector3()
  const q = new Quaternion()
  barco.matrixWorld.decompose(p, q, new Vector3())
  return { raiz, formas, terreno, barco: { p, q }, cais: cais.getWorldPosition(new Vector3()) }
}

/** Onde fica o cais visto do barco (x para a proa, z para o lado), para comparar com o Recife. */
function caisNoBarco(l: Lido): Vector3 {
  return l.cais.clone().sub(l.barco.p).applyQuaternion(l.barco.q.clone().invert())
}

let recife: Lido
const lidos = new Map<string, Lido>()

beforeAll(async () => {
  recife = await ler('recife.glb')
  for (const [ilha, porto] of Object.entries(PORTOS)) lidos.set(ilha, await ler(porto.arquivo))
}, 60_000)

describe.each(Object.entries(PORTOS))('o porto do barco: %s', (ilha, porto) => {
  const lido = () => lidos.get(ilha) as Lido

  test('espera o chão em todos os vértices do porto, dentro da distância que ativa a ilha', () => {
    const definicao = ilhaDoContrato(ilha as Parameters<typeof ilhaDoContrato>[0])
    let vertices = 0
    lido().raiz.traverse((no) => {
      const mesh = no as Mesh
      if (!mesh.isMesh || !doPortoDoBarco(mesh.name)) return
      const posicoes = mesh.geometry.getAttribute('position')
      for (let i = 0; i < posicoes.count; i++) {
        const p = new Vector3().fromBufferAttribute(posicoes, i).applyMatrix4(mesh.matrixWorld)
        const espera = raioDaEsperaDaIlha(definicao, p.x, p.z)
        expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(espera)
        expect(espera + MARGEM_DA_ESPERA_PELO_CHAO).toBeLessThan(DISTANCIA_DA_TROCA)
        vertices++
      }
    })
    expect(vertices).toBeGreaterThan(0)
  })

  test('a âncora barco fica na linha d’água, com a proa (+x) para o mar e o cais como no Recife', () => {
    const { barco, cais } = lido()
    expect(barco.p.y).toBeCloseTo(porto.mar, 3)
    const proa = new Vector3(1, 0, 0).applyQuaternion(barco.q)
    expect(Math.abs(proa.y)).toBeLessThan(1e-3)
    const fora = new Vector3(barco.p.x, 0, barco.p.z).normalize()
    expect(proa.dot(fora)).toBeGreaterThan(0.8)
    // O mesmo arranjo do Recife: o cais 1,2 m para a popa e 2,2 m para o lado do barco.
    const aqui = caisNoBarco(lido())
    const la = caisNoBarco(recife)
    expect(aqui.x).toBeCloseTo(la.x, 1)
    expect(Math.abs(aqui.z)).toBeCloseTo(Math.abs(la.z), 1)
    expect(cais.y - barco.p.y).toBeCloseTo(0.89, 2)
  })

  test('os pés do cais ficam no tampo de um col-cais, com o corpo cabendo ali', () => {
    const { formas, cais } = lido()
    const pisos = formas.filter((c) => c.nome.startsWith('col-cais-'))
    const topo = Math.max(...pisos.map((c) => topoEm(c, cais.x, cais.z) ?? -Infinity))
    expect(topo).toBeCloseTo(cais.y, 2)
    const corpo = new Vector3(cais.x, cais.y + CENTRO_DO_CORPO + 0.05, cais.z)
    const batem = formas.filter((c) => topoDaForma(c) > cais.y + CORPO.degrau && bate(c, corpo))
    expect(batem.map((c) => c.nome)).toEqual([])
  })

  test('do cais anda-se até o tampo da ilha, sem degrau maior que o do corpo', () => {
    const { formas, terreno, cais } = lido()
    const [tx, tz] = porto.tampo
    const meioX = (cais.x + tx) / 2
    const meioZ = (cais.z + tz) / 2
    const raio = Math.hypot(cais.x - tx, cais.z - tz) / 2 + 5
    const grade = gradeDeAndar(terreno, formas, raio, 0.25, {
      meioX,
      meioZ,
      // O deque fica por cima do mar (sem chão embaixo): ele também é piso. O miolo da torre não.
      ePiso: (c) => c.nome.startsWith('col-cais-') && !c.nome.startsWith('col-cais-torre'),
      pisoMinimo: porto.mar + 0.5,
    })
    const andou = grade.alcance(cais.x, cais.z)
    expect(grade.chegaPerto(andou, tx, tz, 0.8)).toBe(true)
    const noTampo = [...andou].filter((i) => {
      const c = grade.centro(i)
      return Math.hypot(c.x - tx, c.z - tz) < 0.8
    })
    expect(noTampo.some((i) => Math.abs((grade.celulas[i]?.y ?? 0) - TAMPO) < 0.05)).toBe(true)
  })

  test('o casco atracado não encosta em colisor nem no chão da ilha', () => {
    const { formas, terreno, barco } = lido()
    const encostam = new Set<string>()
    const noChao: string[] = []
    for (let x = -CASCO.meioComprimento; x <= CASCO.meioComprimento; x += 0.25)
      for (let z = -CASCO.meiaBoca; z <= CASCO.meiaBoca; z += 0.25) {
        const base = new Vector3(x, 0, z).applyQuaternion(barco.q).add(barco.p)
        for (const y of chaoEm(terreno, base.x, base.z))
          if (y > barco.p.y - CASCO.abaixo - 0.05 && y < barco.p.y + CASCO.acima)
            noChao.push(`${base.x.toFixed(2)},${base.z.toFixed(2)}`)
        for (let y = -CASCO.abaixo; y <= CASCO.acima; y += 0.25) {
          const p = new Vector3(x, y, z).applyQuaternion(barco.q).add(barco.p)
          for (const c of formas) if (dentroDaForma(c, p)) encostam.add(c.nome)
        }
      }
    expect([...encostam]).toEqual([])
    expect(noChao).toEqual([])
  })

  test('o corredor do casco, da proa até 25 m para fora, fica livre (5 m de meia largura)', () => {
    const { formas, terreno, barco } = lido()
    const encostam = new Set<string>()
    let noChao = 0
    const de = CASCO.meioComprimento
    for (let x = de; x <= de + CORREDOR.comprimento; x += 0.5)
      for (let z = -CORREDOR.meiaLargura; z <= CORREDOR.meiaLargura; z += 0.5) {
        const base = new Vector3(x, 0, z).applyQuaternion(barco.q).add(barco.p)
        for (const y of chaoEm(terreno, base.x, base.z))
          if (y > barco.p.y - CASCO.abaixo - 0.05 && y < barco.p.y + CASCO.acima) noChao++
        for (const y of [-0.8, 0, 1, 2.2]) {
          const p = base.clone().setY(barco.p.y + y)
          for (const c of formas) if (dentroDaForma(c, p)) encostam.add(c.nome)
        }
      }
    expect([...encostam]).toEqual([])
    expect(noChao).toBe(0)
  })

  test('os colisores do porto são do grupo do porto e ficam fora do corredor da ponte', () => {
    const { formas } = lido()
    const doPorto = formas.filter((c) => doPortoDoBarco(c.nome))
    expect(doPorto.length).toBeGreaterThan(5)
    // A ponte chega no +x do modelo (corredor x > 5,5 e |z| < 2,5): o porto fica do lado de fora.
    for (const c of doPorto) expect([c.nome, c.posicao[0] < 0]).toEqual([c.nome, true])
  })
})

describe('a torre de escada das Nuvens', () => {
  test('cada espelho é de no máximo 30 cm e nenhum degrau passa debaixo de outro (altura livre)', () => {
    const { formas } = lidos.get('nuvens') as Lido
    const degraus = formas.filter(
      (c) => c.nome.startsWith('col-cais-degrau') || c.nome.startsWith('col-cais-patamar'),
    )
    // Do fundo da escadinha do mar, pelo deque, até a ponte que entra no tampo.
    const pisos = formas.filter(
      (c) =>
        c.nome.startsWith('col-cais-') &&
        !c.nome.startsWith('col-cais-torre') &&
        !c.nome.startsWith('col-guarda'),
    )
    const alturas = [...new Set(pisos.map((c) => Math.round(topoDaForma(c) * 1000) / 1000))].sort(
      (a, b) => a - b,
    )
    for (let i = 1; i < alturas.length; i++)
      expect((alturas[i] as number) - (alturas[i - 1] as number)).toBeLessThanOrEqual(0.3 + 1e-6)
    // Em cima de cada degrau, até 2,4 m, não há outro piso da torre.
    for (const d of degraus) {
      const [x, , z] = d.posicao
      const topo = topoDaForma(d)
      const acima = degraus.filter((o) => {
        const t = topoEm(o, x, z)
        return o !== d && t !== undefined && t > topo + 0.01 && t < topo + 2.4
      })
      expect([d.nome, acima.map((o) => o.nome)]).toEqual([d.nome, []])
    }
  })
})
