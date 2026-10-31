import { beforeAll, describe, expect, test } from 'bun:test'
import { type Mesh, type Object3D, Quaternion, Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
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
 * O segredo dos patins no Bosque (31/10/2026, pedido dela), contra o `bosque.glb` real: a pista
 * suspensa de tábuas, reta, e depois de um vão de 3,6 a 4,0 m o toco alto na mesma altura, com a
 * âncora `segredo-patins` em cima. Os números que a dona mediu no código: o pulo leva os pés a 1,50 m;
 * correndo a pé, vence um vão de até 3,26 m; de patins, até 4,24 m; o planador desce 1 m a cada 3 m.
 *
 * Confere: o vão (só o pulo de patins vence), a pista de pelo menos 6 m apontada para o toco, o corpo
 * cabendo nela, a escada de mão (`escada-2-*`) que se alcança a pé, e que não há outro caminho até o
 * toco (nada que se pise perto o bastante, nem alto o bastante, para um pulo ou um voo de planador).
 * O único voo que chega lá é o do planador saindo da própria pista: com a mesma altura dos dois lados,
 * o pulo dá 1,5 m de queda e o planador avança uns 4,5 m (o limite que a dona pediu para explicar).
 */
const PULO = 1.5
const A_PE = 3.26
const DE_PATINS = 4.24
/** O degrau que o corpo sobe sozinho mais a curva do pé numa quina. */
const SOBE_NA_QUINA = 0.58

let raiz: Object3D
let formas: Forma[]
const ancora = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o.position.clone()
}
const doSegredo = (nome: string) =>
  /^col-(cil-toco-segredo|pista-segredo|guarda-pista-segredo|cil-poste-pista-segredo)-/.test(
    nome,
  ) || nome === 'col-escada-reta-2'

beforeAll(async () => {
  raiz = await carregarGlb(arquivoDaIlha('bosque.glb'))
  raiz.updateMatrixWorld(true)
  formas = lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha')
}, 30_000)

function toco() {
  const c = formas.find((f) => f.nome === 'col-cil-toco-segredo-1')
  if (c?.forma !== 'cilindro') throw new Error('sem col-cil-toco-segredo-1')
  return c
}

/** A pista: as duas pontas do tampo (a do vão primeiro), no meio da largura. */
function pista() {
  const c = formas.find((f) => f.nome === 'col-pista-segredo-1')
  if (c?.forma !== 'caixa') throw new Error('sem col-pista-segredo-1')
  const q = new Quaternion(...c.rotacao)
  const meio = new Vector3(...c.posicao).add(new Vector3(0, c.meio[1], 0).applyQuaternion(q))
  const ao = new Vector3(c.meio[0], 0, 0).applyQuaternion(q)
  const t = toco()
  const pontas = [meio.clone().sub(ao), meio.clone().add(ao)].sort(
    (p, r) =>
      Math.hypot(p.x - t.posicao[0], p.z - t.posicao[2]) -
      Math.hypot(r.x - t.posicao[0], r.z - t.posicao[2]),
  ) as [Vector3, Vector3]
  return { c, vao: pontas[0], outra: pontas[1], comprimento: c.meio[0] * 2, largura: c.meio[2] * 2 }
}

describe('o segredo dos patins', () => {
  test('a âncora fica em cima do toco, na mesma altura do tampo da pista', () => {
    const a = ancora('segredo-patins')
    const t = toco()
    const piso = pisoEm(formas, a.x, a.z)
    expect(piso.nome).toBe(t.nome)
    expect(piso.y).toBeCloseTo(a.y, 2)
    expect(pista().vao.y).toBeCloseTo(a.y, 2)
    const corpo = new Vector3(a.x, a.y + CENTRO_DO_CORPO + 0.05, a.z)
    expect(formas.filter((f) => f !== t && bate(f, corpo)).map((f) => f.nome)).toEqual([])
  })

  test('o vão entre as bordas tem de 3,6 a 4,0 m: a pé não se vence, de patins sim', () => {
    const { vao } = pista()
    const t = toco()
    const gap = Math.hypot(vao.x - t.posicao[0], vao.z - t.posicao[2]) - t.raio
    expect(gap).toBeGreaterThanOrEqual(3.6)
    expect(gap).toBeLessThanOrEqual(4.0)
    expect(gap).toBeGreaterThan(A_PE)
    expect(gap).toBeLessThan(DE_PATINS)
  })

  test('a pista é reta, tem pelo menos 6 m, aponta para o toco e o corpo corre nela inteira', () => {
    const { vao, outra, comprimento, largura } = pista()
    const t = toco()
    expect(comprimento).toBeGreaterThanOrEqual(6)
    expect(largura).toBeGreaterThanOrEqual(1)
    const rumo = new Vector3(vao.x - outra.x, 0, vao.z - outra.z).normalize()
    const paraOToco = new Vector3(t.posicao[0] - vao.x, 0, t.posicao[2] - vao.z).normalize()
    expect(rumo.dot(paraOToco)).toBeGreaterThan(Math.cos((3 * Math.PI) / 180))
    // De 5 cm de uma ponta a 5 cm da outra (bem na quina, o raio pode passar raspando).
    const n = Math.ceil(comprimento / 0.1)
    const de = outra.clone().lerp(vao, 0.05 / comprimento)
    const ate = vao.clone().lerp(outra, 0.05 / comprimento)
    for (let k = 0; k <= n; k++) {
      const p = de.clone().lerp(ate, k / n)
      expect(Math.abs(pisoEm(formas, p.x, p.z).y - p.y)).toBeLessThan(0.01)
      const corpo = new Vector3(p.x, p.y + CENTRO_DO_CORPO + 0.05, p.z)
      const batem = formas.filter((f) => topoDaForma(f) > p.y + CORPO.degrau && bate(f, corpo))
      expect({ k, batem: batem.map((f) => f.nome) }).toEqual({ k, batem: [] })
    }
  })

  test('sobe-se à pista pela escada de mão, que se alcança a pé da chegada', () => {
    const base = ancora('escada-2-base')
    const topo = ancora('escada-2-topo')
    const saida = ancora('escada-2-saida')
    const { vao } = pista()
    expect(base.y).toBeCloseTo(TAMPO, 2)
    expect(topo.y).toBeCloseTo(vao.y, 2)
    expect(Math.hypot(base.x - topo.x, base.z - topo.z)).toBeLessThan(0.01)
    expect(pisoEm(formas, saida.x, saida.z).y).toBeCloseTo(vao.y, 2)
    expect(formas.some((f) => f.nome === 'col-escada-reta-2')).toBe(true)
    const terreno = raiz.getObjectByName('col-terreno') as Mesh
    const grade = gradeDeAndar(terreno, formas, 24, 0.25, { meioX: -4 })
    const chegada = ancora('chegada')
    expect(grade.chegaPerto(grade.alcance(chegada.x, chegada.z), base.x, base.z, 0.7)).toBe(true)
  }, 60_000)

  test('não há outro caminho: do chão e de nada que se pise perto se pula ou se plana até o toco', () => {
    const t = toco()
    const alto = topoDaForma(t)
    // Do chão em volta (o tampo), nem pulando se chega.
    expect(alto - TAMPO).toBeGreaterThan(PULO + SOBE_NA_QUINA + 0.5)
    // O que se pisa: o que se alcança do chão subindo de um tampo para outro vizinho (até 2 m de
    // distância) com um pulo, até não mudar mais. Corrimão, lado de ponte e o próprio segredo ficam de
    // fora.
    const raioDe = (f: Forma) => (f.forma === 'caixa' ? Math.hypot(f.meio[0], f.meio[2]) : f.raio)
    // Só conta o tampo onde cabe um corpo em pé no meio (o pedaço de tronco que entra no de cima não).
    const cabeEmCima = (f: Forma) => {
      const topo = topoDaForma(f)
      const corpo = new Vector3(f.posicao[0], topo + CENTRO_DO_CORPO + 0.05, f.posicao[2])
      return !formas.some((g) => g !== f && topoDaForma(g) > topo + CORPO.degrau && bate(g, corpo))
    }
    const candidatas = formas.filter(
      (f) =>
        !doSegredo(f.nome) &&
        !f.nome.startsWith('col-guarda-') &&
        !f.nome.startsWith('col-ponte-lado-') &&
        cabeEmCima(f),
    )
    const pisaveis = new Set<Forma>(
      candidatas.filter((f) => topoDaForma(f) - TAMPO <= PULO + SOBE_NA_QUINA),
    )
    for (let mudou = true; mudou; ) {
      mudou = false
      for (const f of candidatas) {
        if (pisaveis.has(f)) continue
        const perto = [...pisaveis].some((g) => {
          const d =
            Math.hypot(f.posicao[0] - g.posicao[0], f.posicao[2] - g.posicao[2]) -
            raioDe(f) -
            raioDe(g)
          return d < 2 && topoDaForma(f) - topoDaForma(g) <= PULO + SOBE_NA_QUINA
        })
        if (perto) {
          pisaveis.add(f)
          mudou = true
        }
      }
    }
    // Os deques do percurso nas copas (4 a 4,8 m do chão) entram na conta.
    expect(Math.max(...[...pisaveis].map(topoDaForma)) - TAMPO).toBeGreaterThanOrEqual(4.8 - 0.01)
    const problemas: string[] = []
    for (const f of pisaveis) {
      const topo = topoDaForma(f)
      const d = Math.max(
        0,
        Math.hypot(f.posicao[0] - t.posicao[0], f.posicao[2] - t.posicao[2]) - raioDe(f) - t.raio,
      )
      // Pulando (de patins, o maior vão) de cima de algo um pouco mais baixo ou mais alto.
      if (topo + PULO + SOBE_NA_QUINA >= alto && d < DE_PATINS + 0.5)
        problemas.push(`pulo de ${f.nome}`)
      // Planando: do alto do pulo, desce 1 m a cada 3 m.
      if (topo + PULO - d / 3 >= alto) problemas.push(`planador de ${f.nome} (${d.toFixed(1)} m)`)
    }
    expect(problemas).toEqual([])
  })

  test('a pista e o toco ficam fora do lote da cabana', () => {
    const a = ancora('lote-cabana-a')
    const b = ancora('lote-cabana-b')
    const [x0, x1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)]
    const [z0, z1] = [Math.min(a.z, b.z), Math.max(a.z, b.z)]
    for (const f of formas.filter((c) => doSegredo(c.nome))) {
      const r = f.forma === 'caixa' ? Math.hypot(f.meio[0], f.meio[2]) : f.raio
      const dentroX = f.posicao[0] + r > x0 && f.posicao[0] - r < x1
      const dentroZ = f.posicao[2] + r > z0 && f.posicao[2] - r < z1
      // A pista é comprida: confere pela caixa girada, ponto a ponto.
      if (f.forma === 'caixa' && f.meio[0] > 1) {
        const q = new Quaternion(...f.rotacao)
        for (let s = -1; s <= 1; s += 0.05) {
          const p = new Vector3(...f.posicao).add(
            new Vector3(f.meio[0] * s, 0, 0).applyQuaternion(q),
          )
          expect(p.x > x0 - 0.6 && p.x < x1 + 0.6 && p.z > z0 - 0.6 && p.z < z1 + 0.6).toBe(false)
        }
      } else expect(dentroX && dentroZ).toBe(false)
    }
  })
})
