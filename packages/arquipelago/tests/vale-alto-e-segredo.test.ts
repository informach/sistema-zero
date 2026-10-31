import { beforeAll, describe, expect, test } from 'bun:test'
import { NINHOS_DO_VALE } from '@sistemazero/arquipelago-contracts'
import {
  Box3,
  type Material,
  Matrix4,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  Quaternion,
  Raycaster,
  Vector3,
} from 'three'
import { chaoLivre } from '../src/mundo/chao-livre'
import { type ColisorDaIlha, lerColisores } from '../src/mundo/colisores-da-ilha'
import { alturaDoPulo, CORPO } from '../src/sistemas/corpo'
import { PASSEIO_DO_FILHOTE } from '../src/sistemas/filhote-do-vale'
import { MONTARIA, MONTARIA_NO_VALE, RAIO_DA_MONTARIA } from '../src/sistemas/montaria'
import { PLANADOR } from '../src/sistemas/planador'
import {
  arquivoDaIlha,
  carregarGlb,
  type Forma,
  gradeDeAndar,
  TAMPO,
  topoDaForma,
  topoEm,
} from './ajuda-colisores'

/**
 * O Vale dos Dinos de 31/10/2026 (`arte/ilhas-b/vale.py`):
 *
 * - o marco de altura: a agulha do vulcão leva o topo do arquivo a 20 m (±1) acima do mar, sem
 *   colisor novo para pisar e sem mudar a largura da ilha nem o chão de colisão;
 * - o segredo da montaria: o terraço `segredo-montaria` só se alcança pela rampa de cinza quente
 *   (`cinza-quente`, área `cinza-quente-area`). A pé (andando, pulando de patins, planando de
 *   qualquer ponto alto que se alcança) não se chega lá; montado no dino, sobe-se pela rampa.
 */
const GRAVIDADE = 24
/** O vão mais largo que alguém atravessa no Vale (o dino montado, a medida da dona). */
const MAIOR_VAO = 4.5

let raiz: Object3D
let colisores: ColisorDaIlha[]
let formas: Forma[]
let terreno: Mesh
let grade: ReturnType<typeof gradeDeAndar>
let andou: Set<number>
let area: Matrix4
type Caixa = Extract<Forma, { forma: 'caixa' }>
/** Os dois lances da rampa (o de baixo e o de cima). */
let rampas: Caixa[]
let terraco: Caixa

const ancora = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o.position
}
const matrizDe = (c: Forma) =>
  new Matrix4().compose(
    new Vector3(...c.posicao),
    new Quaternion(...c.rotacao),
    new Vector3(1, 1, 1),
  )
const naArea = (p: Vector3) => {
  const l = p.clone().applyMatrix4(area)
  return Math.abs(l.x) <= 0.5 && Math.abs(l.y) <= 0.5 && Math.abs(l.z) <= 0.5
}
const raios = new Raycaster()
const chaoEm = (x: number, z: number) => {
  raios.set(new Vector3(x, 60, z), new Vector3(0, -1, 0))
  return raios.intersectObject(terreno, false)[0]?.point.y ?? -Infinity
}
/** Os quatro cantos do tampo de uma caixa, no mundo. */
const cantosDoTampo = (c: Extract<Forma, { forma: 'caixa' }>) =>
  [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([i, k]) =>
    new Vector3((i as number) * c.meio[0], c.meio[1], (k as number) * c.meio[2]).applyMatrix4(
      matrizDe(c),
    ),
  )
/** O tampo da rampa em (x, z): o mais alto dos dois lances, ou undefined fora dela. */
function tampoDaRampa(x: number, z: number): number | undefined {
  let y: number | undefined
  for (const r of rampas) {
    const t = topoEm(r, x, z)
    if (t !== undefined && (y === undefined || t > y)) y = t
  }
  return y
}
/** Pontos do tampo da rampa acima do chão (de 10 em 10 cm), no mundo. */
function pontosDaRampa(): Vector3[] {
  const pts: Vector3[] = []
  for (const r of rampas) {
    const m = matrizDe(r)
    const ni = Math.ceil((2 * r.meio[0]) / 0.1)
    const nk = Math.ceil((2 * r.meio[2]) / 0.1)
    for (let i = 0; i <= ni; i++)
      for (let k = 0; k <= nk; k++) {
        const p = new Vector3(
          (i / ni - 0.5) * 2 * r.meio[0],
          r.meio[1],
          (k / nk - 0.5) * 2 * r.meio[2],
        ).applyMatrix4(m)
        if (p.y >= TAMPO) pts.push(p)
      }
  }
  return pts
}
/** O eixo da rampa no chão: do pé (onde o tampo sai do chão) ao topo (a beira do terraço). */
function eixoDaRampa() {
  const meio = (r: Caixa, s: number) =>
    new Vector3(0, r.meio[1], s * r.meio[2]).applyMatrix4(matrizDe(r))
  const pontas = rampas.flatMap((r) => [meio(r, -1), meio(r, 1)])
  const alto = pontas.reduce((a, b) => (b.y > a.y ? b : a))
  const baixo = pontas.reduce((a, b) => (b.y < a.y ? b : a))
  const rumo = new Vector3(alto.x - baixo.x, 0, alto.z - baixo.z).normalize()
  // O pé: andando do ponto mais baixo para o alto até o tampo passar do chão.
  let pe = baixo.clone()
  for (let s = 0; s < 3; s += 0.01) {
    const q = baixo.clone().addScaledVector(rumo, s)
    const y = tampoDaRampa(q.x, q.z)
    if (y !== undefined && y >= TAMPO) {
      pe = q.setY(TAMPO)
      break
    }
  }
  return { pe, alto, rumo, lado: new Vector3(-rumo.z, 0, rumo.x) }
}
/** Ponto no polígono convexo do chão (x, z). */
function dentroDoPoligono(pts: Vector3[], x: number, z: number): boolean {
  let sinal = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i] as Vector3
    const b = pts[(i + 1) % pts.length] as Vector3
    const c = (b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x)
    if (c !== 0) {
      if (sinal && Math.sign(c) !== sinal) return false
      sinal = Math.sign(c)
    }
  }
  return true
}
/** Distância de (x, z) ao polígono convexo (0 dentro). */
function distanciaAoPoligono(pts: Vector3[], x: number, z: number): number {
  if (dentroDoPoligono(pts, x, z)) return 0
  let d = Infinity
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i] as Vector3
    const b = pts[(i + 1) % pts.length] as Vector3
    const vx = b.x - a.x
    const vz = b.z - a.z
    const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / (vx * vx + vz * vz)))
    d = Math.min(d, Math.hypot(x - a.x - t * vx, z - a.z - t * vz))
  }
  return d
}

beforeAll(async () => {
  raiz = await carregarGlb(arquivoDaIlha('vale-dos-dinos.glb'))
  raiz.updateMatrixWorld(true)
  colisores = lerColisores(raiz)
  formas = colisores.filter((c): c is Forma => c.forma !== 'malha')
  terreno = raiz.getObjectByName('col-terreno') as Mesh
  grade = gradeDeAndar(terreno, formas)
  andou = grade.alcance(ancora('chegada').x, ancora('chegada').z)
  const no = raiz.getObjectByName('cinza-quente-area') as Object3D
  area = no.matrixWorld.clone().invert()
  rampas = formas.filter(
    (c): c is Caixa => c.forma === 'caixa' && c.nome.startsWith('col-rampa-cinza-'),
  )
  terraco = formas.find((c) => c.nome === 'col-terraco-segredo-1') as Caixa
}, 120_000)

describe('o vulcão é o marco de altura do Vale', () => {
  test('o topo do arquivo fica a 20 m (±1) do mar, com a mesma largura', () => {
    const desenho = new Box3()
    raiz.traverse((o) => {
      if ((o as Mesh).isMesh && !o.name.startsWith('col-')) desenho.expandByObject(o, true)
    })
    expect(desenho.max.y).toBeGreaterThan(19)
    expect(desenho.max.y).toBeLessThan(21)
    // A largura: o chão de colisão vai até 15,614 m do meio (como antes) e o desenho não passa dele,
    // fora o porto (que sai pelo −x).
    let raio = 0
    const v = new Vector3()
    const pos = terreno.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++)
      raio = Math.max(raio, Math.hypot(v.fromBufferAttribute(pos, i).x, v.z))
    expect(raio).toBeCloseTo(15.614, 2)
    const semPorto = new Box3()
    for (const nome of ['chao', 'vulcao', 'lava', 'cenario', 'cinza-quente'])
      semPorto.expandByObject(raiz.getObjectByName(nome) as Object3D, true)
    expect(Math.max(-semPorto.min.x, semPorto.max.x, -semPorto.min.z, semPorto.max.z)).toBeLessThan(
      15.62,
    )
  })

  test('a parte nova não se pisa: o chão de colisão e os colisores ficam bem abaixo dela', () => {
    terreno.geometry.computeBoundingBox()
    const topoDoChao = (terreno.geometry.boundingBox as Box3).max.y
    // A borda da cratera de antes (7,9 m): o cone de colisão é o mesmo.
    expect(topoDoChao).toBeLessThan(7.95)
    for (const c of formas) expect([c.nome, topoDaForma(c) < 7]).toEqual([c.nome, true])
    const vulcao = new Box3().setFromObject(raiz.getObjectByName('vulcao') as Object3D, true)
    expect(vulcao.max.y).toBeGreaterThan(16)
    // Quem anda pelo Vale não chega perto do começo da agulha (6 m) nem pulando.
    let maisAlto = 0
    for (const i of andou) maisAlto = Math.max(maisAlto, grade.celulas[i]?.y ?? 0)
    expect(maisAlto + alturaDoPulo(GRAVIDADE)).toBeLessThan(6)
  })
})

describe('o segredo da montaria', () => {
  test('os nós que o jogo vai ler: a faixa, a área, a âncora e os colisores', () => {
    const faixa = raiz.getObjectByName('cinza-quente') as Object3D
    expect(faixa).toBeDefined()
    const mats = new Set<Material>()
    faixa.traverse((o) => {
      if ((o as Mesh).isMesh) for (const m of [(o as Mesh).material].flat()) mats.add(m)
    })
    const cinza = [...mats].find((m) => m.name === 'cinzaQuente') as MeshStandardMaterial
    expect(cinza).toBeDefined()
    // Brilho fraco de brasa.
    const brilho =
      Math.max(cinza.emissive.r, cinza.emissive.g, cinza.emissive.b) * cinza.emissiveIntensity
    expect(brilho).toBeGreaterThan(0)
    expect(brilho).toBeLessThan(0.3)
    const noDaArea = raiz.getObjectByName('cinza-quente-area') as Object3D
    expect((noDaArea as Mesh).isMesh).toBeFalsy()
    expect(noDaArea.children).toHaveLength(0)
    expect(rampas.map((r) => r.nome).sort()).toEqual(['col-rampa-cinza-1', 'col-rampa-cinza-2'])
    expect(terraco).toBeDefined()
    expect(ancora('segredo-montaria').y).toBeCloseTo(topoDaForma(terraco), 2)
  })

  test('a faixa tem mais de 5 m de travessia (nenhum pulo passa) e a área cobre o tampo inteiro', () => {
    const { pe, alto } = eixoDaRampa()
    const noChao = Math.hypot(alto.x - pe.x, alto.z - pe.z)
    expect(noChao).toBeGreaterThan(5)
    expect(noChao).toBeGreaterThan(MAIOR_VAO)
    // O tampo da rampa, do chão até a beira do terraço, inteiro dentro da área (com os pés).
    const pts = pontosDaRampa()
    expect(pts.length).toBeGreaterThan(800)
    for (const p of pts) {
      const r = p.toArray().map((x) => x.toFixed(2))
      expect([r, naArea(p.clone().setY(p.y + 0.05))]).toEqual([r, true])
    }
    // A malha da faixa também.
    const faixa = raiz.getObjectByName('cinza-quente') as Object3D
    const v = new Vector3()
    faixa.traverse((o) => {
      if (!(o as Mesh).isMesh) return
      const pos = (o as Mesh).geometry.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
        if (v.y > TAMPO + 0.01) expect(naArea(v)).toBe(true)
      }
    })
  })

  test('a área não pega o terraço, a trilha das pedras, os ninhos, o filhote nem a chegada', () => {
    // O tampo do terraço, a mais de 20 cm da beira da rampa.
    const { alto, rumo } = eixoDaRampa()
    const mt = matrizDe(terraco)
    for (let i = -4; i <= 4; i++)
      for (let k = -4; k <= 4; k++) {
        const p = new Vector3(
          (i / 4) * terraco.meio[0],
          terraco.meio[1] + 0.05,
          (k / 4) * terraco.meio[2],
        ).applyMatrix4(mt)
        if ((p.x - alto.x) * rumo.x + (p.z - alto.z) * rumo.z < 0.2) continue
        expect(naArea(p)).toBe(false)
      }
    // Embaixo da ponte (o lance de cima): os pés de quem passa, andando ou no alto do pulo.
    for (const p of pontosDaRampa()) {
      const chao = chaoEm(p.x, p.z)
      if (p.y - chao < 2.6) continue
      for (const h of [0, 1, alturaDoPulo(GRAVIDADE)])
        expect(naArea(new Vector3(p.x, chao + h, p.z))).toBe(false)
    }
    // A trilha das pedras do vulcão: o chão entre as pedras e o alto de cada pulo.
    const pedras = [1, 2, 3, 4, 5, 6, 7].map(
      (n) => formas.find((c) => c.nome === `col-cil-pedra-vulcao-${n}`) as Forma,
    )
    for (let n = 0; n < 6; n++) {
      const a = pedras[n] as Forma
      const b = pedras[n + 1] as Forma
      for (let t = 0; t <= 1; t += 0.02)
        for (const h of [0, 0.9, 1.8, 0.35 + alturaDoPulo(GRAVIDADE)]) {
          const p = new Vector3(
            a.posicao[0] + (b.posicao[0] - a.posicao[0]) * t,
            TAMPO + h,
            a.posicao[2] + (b.posicao[2] - a.posicao[2]) * t,
          )
          expect([n, t.toFixed(2), h, naArea(p)]).toEqual([n, t.toFixed(2), h, false])
        }
    }
    const lugares = [
      ...NINHOS_DO_VALE.map((n) => ancora(n)),
      ancora('escavacao'),
      ancora('pe-do-vulcao'),
      ancora('chegada'),
      ancora('cais'),
      ancora('morador'),
      ...PASSEIO_DO_FILHOTE.map((p) => new Vector3(p.x, TAMPO, p.z)),
      new Vector3(MONTARIA_NO_VALE.x, TAMPO, MONTARIA_NO_VALE.z),
    ]
    for (const p of lugares)
      for (const h of [0, 1]) expect(naArea(new Vector3(p.x, p.y + h, p.z))).toBe(false)
  })

  test('a pé não se chega ao terraço: nem pulando de nenhum lugar alcançável, nem planando', () => {
    const pulo = alturaDoPulo(GRAVIDADE)
    // Tudo o que se pisa andando da chegada (sem a cinza) e, de pulo em pulo, o alto das peças.
    const pisos: { x: number; z: number; y: number }[] = []
    for (const i of andou) {
      const c = grade.celulas[i]
      if (!c) continue
      const { x, z } = grade.centro(i)
      if (naArea(new Vector3(x, c.y + 0.05, z))) continue
      pisos.push({ x, z, y: c.y })
    }
    const pecas = formas.filter((c) => !rampas.includes(c as Caixa) && c !== terraco)
    const alcancadas = new Set<Forma>()
    const raioDe = (c: Forma) =>
      c.forma === 'cilindro' ? c.raio : Math.hypot(c.meio[0], c.meio[2])
    let mudou = true
    while (mudou) {
      mudou = false
      for (const c of pecas) {
        if (alcancadas.has(c)) continue
        const topo = topoDaForma(c)
        const chega = (x: number, z: number, y: number) =>
          y + pulo >= topo &&
          Math.hypot(x - c.posicao[0], z - c.posicao[2]) - raioDe(c) <= MAIOR_VAO
        if (
          pisos.some((p) => chega(p.x, p.z, p.y)) ||
          [...alcancadas].some((o) => chega(o.posicao[0], o.posicao[2], topoDaForma(o)))
        ) {
          alcancadas.add(c)
          mudou = true
        }
      }
    }
    const maisAlto = Math.max(...pisos.map((p) => p.y), ...[...alcancadas].map(topoDaForma))
    // O planador só desce (no Vale não há corrente de ar), e o pulo chega a `pulo` acima do pé.
    expect(PLANADOR.descida).toBeGreaterThan(0)
    expect(raiz.getObjectByName('corrente-de-ar')).toBeUndefined()
    const tampo = topoDaForma(terraco)
    expect(tampo - (maisAlto + pulo)).toBeGreaterThan(0.1)
    // Nenhum lugar a pé fica debaixo do terraço, na altura dele.
    const doTerraco = cantosDoTampo(terraco)
    expect(pisos.filter((p) => dentroDoPoligono(doTerraco, p.x, p.z) && p.y > tampo - 1)).toEqual(
      [],
    )
  })

  test('montado, o dino chega ao pé da rampa, sobe por ela e cabe no terraço', () => {
    const { pe, alto, rumo, lado } = eixoDaRampa()
    for (const r of rampas) expect(2 * r.meio[0]).toBeGreaterThan(2 * MONTARIA.raio + 0.6)
    expect(Math.abs(alto.y - topoDaForma(terraco))).toBeLessThan(0.15)
    // Do lugar do dino ao pé da rampa e aos três ninhos, andando montado (chão livre para a cápsula
    // dele): a rampa não corta o caminho dele para o oeste da ilha.
    // Os lances da rampa são caixas inclinadas: o corpo dele (a cápsula de montado, 0,6 m de raio e
    // 1,9 m de altura, com o alto arredondado) é conferido ponto a ponto contra elas; o resto, pelo
    // `chaoLivre`.
    const semRampa = colisores.filter((c) => !rampas.includes(c as Caixa))
    const cabeSemRampa = chaoLivre(semRampa, {
      chao: TAMPO,
      raio: MONTARIA.raio,
      altura: 2 * (MONTARIA.meiaAltura + MONTARIA.raio),
      raioDaIlha: RAIO_DA_MONTARIA,
    })
    const inversas = rampas.map((r) => ({ r, inv: matrizDe(r).invert() }))
    const q = new Vector3()
    const cabeNaRampa = (x: number, z: number) => {
      for (const rr of [0, 0.2, 0.4, 0.6]) {
        // A altura da cápsula a `rr` do eixo (o pé fica no chão, a 6 cm de folga).
        const alto =
          MONTARIA.raio + 2 * MONTARIA.meiaAltura + Math.sqrt(MONTARIA.raio ** 2 - rr ** 2)
        for (let a = 0; a < (rr ? 12 : 1); a++)
          for (let h = 0; h <= alto; h += alto / 8) {
            q.set(
              x + rr * Math.cos((a * Math.PI) / 6),
              TAMPO + 0.06 + h,
              z + rr * Math.sin((a * Math.PI) / 6),
            )
            for (const { r, inv } of inversas) {
              const l = q.clone().applyMatrix4(inv)
              if (
                Math.abs(l.x) < r.meio[0] &&
                Math.abs(l.y) < r.meio[1] &&
                Math.abs(l.z) < r.meio[2]
              )
                return false
            }
          }
      }
      return true
    }
    const passo = 0.25
    const livre = (i: number, k: number) =>
      Math.abs(chaoEm(i * passo, k * passo) - TAMPO) < 0.3 &&
      cabeSemRampa(i * passo, k * passo) &&
      cabeNaRampa(i * passo, k * passo)
    const inicio = [
      Math.round(MONTARIA_NO_VALE.x / passo),
      Math.round(MONTARIA_NO_VALE.z / passo),
    ] as const
    const visto = new Set([inicio.join()])
    const fila: (readonly [number, number])[] = [inicio]
    const andouMontado: [number, number][] = []
    while (fila.length) {
      const [i, k] = fila.pop() as readonly [number, number]
      andouMontado.push([i * passo, k * passo])
      for (const [di, dk] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const j = [i + di, k + dk] as const
        if (visto.has(j.join()) || !livre(j[0], j[1])) continue
        visto.add(j.join())
        fila.push(j)
      }
    }
    const chegaMontado = (x: number, z: number, perto: number) =>
      andouMontado.some(([a, b]) => Math.hypot(a - x, b - z) < perto)
    const antesDoPe = pe.clone().addScaledVector(rumo, -0.8)
    expect(chegaMontado(antesDoPe.x, antesDoPe.z, 0.3)).toBe(true)
    for (const n of NINHOS_DO_VALE) {
      const p = ancora(n)
      expect([n, chegaMontado(p.x, p.z, 1.2 + MONTARIA.raio + 1)]).toEqual([n, true])
    }
    // Subindo: o tampo não passa de 47° em nenhum trecho, a cápsula dele não bate em nenhuma outra
    // peça e o vulcão não passa do tampo da rampa.
    const outras = formas.filter((c) => !rampas.includes(c as Caixa) && c !== terraco)
    const comprimento = Math.hypot(alto.x - pe.x, alto.z - pe.z)
    let antes = TAMPO
    for (let s = 0.1; s <= comprimento; s += 0.1) {
      const q = pe.clone().addScaledVector(rumo, s)
      const y = tampoDaRampa(q.x, q.z) as number
      expect([s.toFixed(1), y !== undefined]).toEqual([s.toFixed(1), true])
      expect([
        s.toFixed(1),
        (Math.atan2(y - antes, 0.1) * 180) / Math.PI < CORPO.sobeAte - 5,
      ]).toEqual([s.toFixed(1), true])
      antes = y
      for (const w of [-MONTARIA.raio, 0, MONTARIA.raio]) {
        const l = q.clone().addScaledVector(lado, w)
        expect([s.toFixed(1), w, chaoEm(l.x, l.z) < y + CORPO.degrau]).toEqual([
          s.toFixed(1),
          w,
          true,
        ])
      }
      const centro = q.clone().setY(y + MONTARIA.meiaAltura + MONTARIA.raio + 0.05)
      const meiaAltura = MONTARIA.meiaAltura + MONTARIA.raio
      for (const c of outras) {
        const l = centro.clone().applyMatrix4(matrizDe(c).invert())
        const bate =
          c.forma === 'caixa'
            ? Math.abs(l.x) < c.meio[0] + MONTARIA.raio &&
              Math.abs(l.y) < c.meio[1] + meiaAltura &&
              Math.abs(l.z) < c.meio[2] + MONTARIA.raio
            : Math.hypot(l.x, l.z) < c.raio + MONTARIA.raio &&
              Math.abs(l.y) < c.meiaAltura + meiaAltura
        expect([s.toFixed(1), c.nome, bate]).toEqual([s.toFixed(1), c.nome, false])
      }
    }
    // No terraço: a âncora dentro do tampo, com folga para o dino, e o vulcão abaixo em volta dela.
    const seg = ancora('segredo-montaria')
    expect(Math.hypot(seg.x, seg.z)).toBeLessThan(RAIO_DA_MONTARIA - 1)
    const lt = seg.clone().applyMatrix4(matrizDe(terraco).invert())
    expect(Math.abs(lt.x)).toBeLessThan(terraco.meio[0] - MONTARIA.raio)
    expect(Math.abs(lt.z)).toBeLessThan(terraco.meio[2] - MONTARIA.raio)
    for (let k = 0; k < 8; k++) {
      const x = seg.x + 0.8 * Math.cos((k * Math.PI) / 4)
      const z = seg.z + 0.8 * Math.sin((k * Math.PI) / 4)
      expect(chaoEm(x, z)).toBeLessThan(seg.y - 0.2)
      expect(topoEm(terraco, x, z)).toBeCloseTo(seg.y, 2)
    }
  }, 60_000)

  test('longe dos ninhos, da escavação, do chão quente, do passeio, do porto e da chegada', () => {
    const daRampa = pontosDaRampa()
    const doTerraco = cantosDoTampo(terraco)
    const ateRampa = (x: number, z: number) =>
      Math.min(...daRampa.map((p) => Math.hypot(p.x - x, p.z - z)))
    const distancia = (x: number, z: number) =>
      Math.min(ateRampa(x, z), distanciaAoPoligono(doTerraco, x, z))
    for (const n of NINHOS_DO_VALE) {
      const p = ancora(n)
      // O ninho tem 1,2 m de raio; em volta dele a criança chega a 1,8 m.
      expect([n, distancia(p.x, p.z) > 2.2]).toEqual([n, true])
    }
    const esc = ancora('escavacao')
    for (let a = 0; a < 2 * Math.PI; a += 0.1)
      expect(distancia(esc.x + 4.1 * Math.cos(a), esc.z + 3.3 * Math.sin(a))).toBeGreaterThan(0.5)
    const pe = ancora('pe-do-vulcao')
    expect(distancia(pe.x, pe.z)).toBeGreaterThan(2.2)
    // O filhote passa longe da rampa e, perto do terraço, muito abaixo dele.
    for (const q of PASSEIO_DO_FILHOTE) {
      expect(ateRampa(q.x, q.z)).toBeGreaterThan(1)
      const d = distanciaAoPoligono(doTerraco, q.x, q.z)
      const baixoDoTerraco = topoDaForma(terraco) - 2 * terraco.meio[1]
      expect(d > 1 || baixoDoTerraco - chaoEm(q.x, q.z) > 3).toBe(true)
    }
    for (const nome of ['chegada', 'cais', 'barco', 'morador', 'observatorio']) {
      const p = ancora(nome)
      expect([nome, distancia(p.x, p.z) > 3]).toEqual([nome, true])
    }
    expect(distancia(MONTARIA_NO_VALE.x, MONTARIA_NO_VALE.z)).toBeGreaterThan(3)
    // A trilha das pedras passa por baixo da ponte, com vão para a cabeça; nenhuma pedra fica embaixo.
    const pedras = [1, 2, 3, 4, 5, 6, 7].map(
      (n) => formas.find((c) => c.nome === `col-cil-pedra-vulcao-${n}`) as Forma,
    )
    for (const p of pedras) {
      const r = p.forma === 'cilindro' ? p.raio : 0
      expect([p.nome, ateRampa(p.posicao[0], p.posicao[2]) > r]).toEqual([p.nome, true])
    }
    for (let n = 0; n < 6; n++) {
      const a = pedras[n] as Forma
      const b = pedras[n + 1] as Forma
      for (let t = 0; t <= 1; t += 0.02) {
        const x = a.posicao[0] + (b.posicao[0] - a.posicao[0]) * t
        const z = a.posicao[2] + (b.posicao[2] - a.posicao[2]) * t
        const topo = tampoDaRampa(x, z)
        if (topo === undefined) continue
        // O tampo menos a laje (0,3 m na inclinação de até 47°).
        expect([
          n,
          t.toFixed(2),
          topo - 0.3 / Math.cos((47 * Math.PI) / 180) - TAMPO > 2.2,
        ]).toEqual([n, t.toFixed(2), true])
      }
    }
  })
})
