import { beforeAll, describe, expect, test } from 'bun:test'
import { type Mesh, type Object3D, Vector3 } from 'three'
import { ALTURA_QUE_SEGURA } from '../src/mundo/colisao-da-ilha-central'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { MIRANTE_DAS_NUVENS } from '../src/mundo/nuvens'
import { BALAO } from '../src/sistemas/balao'
import { ARGOLAS, argolasNaIlha } from '../src/sistemas/corrida-de-balao'
import { PLATAFORMAS_DAS_NUVENS } from '../src/sistemas/plataformas-das-nuvens'
import { caminhoLargo } from './ajuda-caminho-largo'
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
  topoEm,
} from './ajuda-colisores'

/**
 * O jardim do céu e o segredo do balão da Ilha das Nuvens (31/10/2026), contra o `nuvens.glb` real
 * (no arquivo a ilha fica no tampo de sempre, y = 1; no jogo, num grupo a y = 7).
 *
 * - O jardim: um terraço plano de pelo menos 6 × 6 m, seis canteiros de 1 × 1 m com o colisor de
 *   borda dos canteiros da horta (`ALTURA_QUE_SEGURA`) e as âncoras `canteiro-ceu-1` a `-6`, o caminho
 *   a pé da chegada (faixa de 1,5 m, degraus de até 0,30 m) e longe dos saltos, do balão, da corrida
 *   das argolas e do mirante das constelações.
 * - O segredo do balão: uma nuvem que se pisa a 12–15 m acima do chão da ilha, com a âncora
 *   `segredo-balao` em cima do colisor, dentro do teto do balão e fora do alcance do planador (nenhum
 *   lugar que se pisa, contando o pulo e as plataformas no alto do ciclo, chega lá descendo 1 m a cada
 *   3 m).
 */
let raiz: Object3D
let formas: Forma[]
let terreno: Mesh
const ancora = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o.position.clone()
}
const canteiros = () => [1, 2, 3, 4, 5, 6].map((k) => ancora(`canteiro-ceu-${k}`))

/** O meio do jardim: o meio das âncoras dos canteiros (o arranjo é simétrico). */
function meioDoJardim() {
  const c = canteiros()
  return c.reduce((s, p) => s.add(p), new Vector3()).divideScalar(c.length)
}

beforeAll(async () => {
  raiz = await carregarGlb(arquivoDaIlha('nuvens.glb'))
  raiz.updateMatrixWorld(true)
  formas = lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha')
  terreno = raiz.getObjectByName('col-terreno') as Mesh
}, 30_000)

describe('o jardim do céu', () => {
  test('o terraço é plano em pelo menos 6 × 6 m, e só os canteiros colidem em cima dele', () => {
    const m = meioDoJardim()
    const grade = gradeDeAndar(terreno, [], 16)
    const alturas: number[] = []
    const outros = new Set<string>()
    for (let dx = -3; dx <= 3 + 1e-9; dx += 0.25)
      for (let dz = -3; dz <= 3 + 1e-9; dz += 0.25) {
        const y = grade.chaoEm(m.x + dx, m.z + dz)
        if (y === undefined) throw new Error('sem chão no jardim')
        alturas.push(y)
        for (const c of formas)
          if (
            !c.nome.startsWith('col-canteiro-ceu-') &&
            topoEm(c, m.x + dx, m.z + dz) !== undefined
          )
            outros.add(c.nome)
      }
    expect(Math.max(...alturas) - Math.min(...alturas)).toBeLessThan(0.01)
    expect([...outros]).toEqual([])
  })

  test('seis canteiros de 1 × 1 m, cada um com o colisor de borda que segura o corpo e a âncora na terra', () => {
    const grade = gradeDeAndar(terreno, [], 16)
    const lista = canteiros()
    expect(lista).toHaveLength(6)
    for (const [k, a] of lista.entries()) {
      const col = formas.find((c) => c.nome === `col-canteiro-ceu-${k + 1}`)
      if (col?.forma !== 'caixa') throw new Error(`sem col-canteiro-ceu-${k + 1}`)
      expect(col.meio[0] * 2).toBeCloseTo(1, 2)
      expect(col.meio[2] * 2).toBeCloseTo(1, 2)
      expect(Math.hypot(col.posicao[0] - a.x, col.posicao[2] - a.z)).toBeLessThan(0.01)
      // O chão do terraço ali (fora do canteiro) e a borda: mais alta que o que o corpo sobe sozinho.
      const piso = grade.chaoEm(a.x + 0.8, a.z) ?? grade.chaoEm(a.x - 0.8, a.z) ?? TAMPO
      expect(topoDaForma(col) - piso).toBeGreaterThanOrEqual(ALTURA_QUE_SEGURA - 1e-6)
      // A âncora fica em cima da terra, dentro da borda.
      expect(a.y).toBeGreaterThan(piso)
      expect(a.y).toBeLessThan(topoDaForma(col))
    }
    // Os canteiros não se encostam (1 m cada, sem sobreposição).
    for (let i = 0; i < lista.length; i++)
      for (let j = i + 1; j < lista.length; j++) {
        const p = lista[i] as Vector3
        const q = lista[j] as Vector3
        expect(Math.max(Math.abs(p.x - q.x), Math.abs(p.z - q.z))).toBeGreaterThanOrEqual(1)
      }
  })

  test('da chegada se anda até o lado de cada canteiro numa faixa de 1,5 m, com degraus de até 0,30 m', () => {
    const chegada = ancora('chegada')
    const grade = gradeDeAndar(terreno, formas, 16)
    const faixa = caminhoLargo(grade)
    const andou = faixa.alcance(chegada.x, chegada.z)
    const m = meioDoJardim()
    expect(faixa.chegaPerto(andou, m.x, m.z - 2.6, 0.6)).toBe(true)
    // Cada canteiro tem um lado que se alcança a pé (a 0,9 m do meio dele).
    const aPe = grade.alcance(chegada.x, chegada.z)
    for (const a of canteiros()) {
      const algum = [
        [0.9, 0],
        [-0.9, 0],
        [0, 0.9],
        [0, -0.9],
      ].some(([dx, dz]) => grade.chegaPerto(aPe, a.x + (dx ?? 0), a.z + (dz ?? 0), 0.3))
      expect(algum).toBe(true)
    }
  }, 30_000)

  test('fica longe dos saltos, do balão, da corrida das argolas e do mirante', () => {
    const m = meioDoJardim()
    const doJardim = (x: number, z: number) =>
      Math.hypot(Math.max(Math.abs(x - m.x) - 3.2, 0), Math.max(Math.abs(z - m.z) - 3.2, 0))
    for (const c of formas)
      if (c.nome.startsWith('col-cil-degrau-nuvem') || c.nome.startsWith('col-cil-plataforma'))
        expect(doJardim(c.posicao[0], c.posicao[2])).toBeGreaterThan(5)
    // O balão (envelope de 2,35 m de raio) com folga.
    const balao = ancora('balao')
    expect(doJardim(balao.x, balao.z)).toBeGreaterThan(2.35 + 0.5)
    // Cada argola é um anel de pé (o plano dela corta o rumo da volta): nenhum ponto do anel fica em cima
    // do terraço, e todos ficam a mais de 1,5 m da caixa de 2,5 m de altura em cima dele (quem está no
    // jardim, pulando, não chega lá; o balão passa pelo meio da argola, longe do jardim).
    const piso = m.y - 0.3
    for (const a of argolasNaIlha(TAMPO)) {
      const ang = Math.atan2(a.z, a.x)
      for (let k = 0; k < 72; k++) {
        const t = (2 * Math.PI * k) / 72
        const x = a.x + Math.cos(ang) * Math.cos(t) * ARGOLAS.raio
        const z = a.z + Math.sin(ang) * Math.cos(t) * ARGOLAS.raio
        const y = a.y + Math.sin(t) * ARGOLAS.raio
        const dy = Math.max(piso - y, 0, y - (piso + 2.5))
        expect(doJardim(x, z)).toBeGreaterThan(0)
        expect(Math.hypot(doJardim(x, z), dy)).toBeGreaterThan(1.5)
      }
    }
    expect(doJardim(MIRANTE_DAS_NUVENS.x, MIRANTE_DAS_NUVENS.z)).toBeGreaterThan(6)
  })
})

describe('o segredo do balão', () => {
  const nuvemDoSegredo = () => {
    const c = formas.find((f) => f.nome === 'col-cil-nuvem-segredo-1')
    if (c?.forma !== 'cilindro') throw new Error('sem col-cil-nuvem-segredo-1')
    return c
  }

  test('a nuvem fica a 12–15 m acima do chão, com a âncora em cima do colisor e lugar para o cesto', () => {
    const a = ancora('segredo-balao')
    const c = nuvemDoSegredo()
    expect(a.y - TAMPO).toBeGreaterThanOrEqual(12)
    expect(a.y - TAMPO).toBeLessThanOrEqual(15)
    const piso = pisoEm(formas, a.x, a.z, -100)
    expect(piso.nome).toBe(c.nome)
    expect(piso.y).toBeCloseTo(a.y, 2)
    // O cesto (1,1 m) cabe no tampo, e de pé ali nada bate no corpo.
    expect(c.raio).toBeGreaterThan(Math.SQRT1_2 * 1.1)
    const corpo = new Vector3(a.x, a.y + CENTRO_DO_CORPO + 0.05, a.z)
    expect(formas.filter((f) => f !== c && bate(f, corpo)).map((f) => f.nome)).toEqual([])
  })

  test('o balão chega lá: abaixo do teto e dentro da volta dele', () => {
    const a = ancora('segredo-balao')
    expect(a.y - TAMPO).toBeLessThan(BALAO.teto)
    expect(Math.hypot(a.x, a.z)).toBeLessThan(BALAO.raio)
  })

  test('o planador não chega: de nenhum lugar que se pisa, descendo 1 m a cada 3 m, se alcança a nuvem', () => {
    const a = ancora('segredo-balao')
    const c = nuvemDoSegredo()
    const pulo = 1.5
    const problemas: string[] = []
    for (const f of formas) {
      if (f === c) continue
      // O tampo de cada plataforma vai 2,4 m mais alto no ciclo.
      const subida = f.nome.startsWith('col-cil-plataforma-') ? PLATAFORMAS_DAS_NUVENS.altura : 0
      const topo = topoDaForma(f) + subida + pulo
      const r = f.forma === 'caixa' ? Math.hypot(f.meio[0], f.meio[2]) : f.raio
      const d = Math.max(0, Math.hypot(f.posicao[0] - a.x, f.posicao[2] - a.z) - r - c.raio)
      if (topo - d / 3 >= a.y) problemas.push(`${f.nome} (${topo.toFixed(1)} a ${d.toFixed(1)} m)`)
    }
    expect(problemas).toEqual([])
  })

  test('não bate nas argolas, nas plataformas, no jardim nem nas constelações', async () => {
    const a = ancora('segredo-balao')
    const c = nuvemDoSegredo()
    // Cada argola: o anel de 4,2 m de raio em pé, mais o balão (2,35) de folga.
    for (const g of argolasNaIlha(TAMPO)) {
      const d = Math.hypot(g.x - a.x, g.y - a.y, g.z - a.z)
      expect(d).toBeGreaterThan(ARGOLAS.raio + ARGOLAS.tubo + c.raio + 2.35)
    }
    for (const f of formas)
      if (f.forma === 'cilindro' && f.nome.startsWith('col-cil-plataforma-'))
        expect(Math.hypot(f.posicao[0] - a.x, f.posicao[2] - a.z)).toBeGreaterThan(
          f.raio + c.raio + 3,
        )
    const m = meioDoJardim()
    expect(a.y - m.y).toBeGreaterThan(10)
    const ceu = await carregarGlb(arquivoDaIlha('nuvens-constelacoes.glb'))
    ceu.updateMatrixWorld(true)
    let perto = Infinity
    ceu.traverse((o) => {
      if (/^constelacao-\d+$/.test(o.name)) {
        const p = o.getWorldPosition(new Vector3())
        perto = Math.min(perto, p.distanceTo(a))
      }
    })
    expect(perto).toBeGreaterThan(10)
  })
})
