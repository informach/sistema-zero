import { beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { type Object3D, Quaternion, Vector3 } from 'three'
import { COLISORES_DO_FAROL } from '../src/mundo/colisao-da-ilha-central'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { colisoresNoLugar, lugarDoQuadroNoFarol } from '../src/mundo/lugar-do-quadro'
import { ALTURA_DA_TERRA, alturaDaIlha, FAROL, GRAVIDADE } from '../src/mundo/medidas'
import { LOTE_DA_CASA_GRANDE } from '../src/sistemas/construcao/lote'
import {
  alcanceMaximoDoPulo,
  alturaDoPulo,
  beiradaMaximaDoPulo,
  CORPO,
} from '../src/sistemas/corpo'
import { BORDA, beiradaMaximaAgarrando } from '../src/sistemas/modos/borda'
import { EQUILIBRIO } from '../src/sistemas/modos/equilibrio'
import { ESCADA } from '../src/sistemas/modos/escada'
import { PERCURSO_DO_CUME } from '../src/sistemas/percurso'
import { PLANADOR } from '../src/sistemas/planador'
import { bate, carregarGlb, type Forma, pisoEm, topoDaForma, topoEm } from './ajuda-colisores'

/**
 * A subida final por fora do Farol (pedido "A subida final pelo Farol",
 * `docs/plans/2026-10-30-arquipelago-pedidos-de-arte.md`), no molde de `subida-ao-cume.test.ts`:
 * as âncoras do percurso em cima dos colisores reais do `farol.glb` (mais o cilindro da torre, que
 * é do código), cada trecho com o modo certo (escada, quina, equilíbrio, corrente de ar com o
 * planador) e nada encostado na porta, nas pedras do pé nem no quadro do Farol.
 * Tudo no referencial do grupo `Farol` (y = 0 no pé da torre).
 */

/** O vão mais largo de patins (medido pela dona no código, 31/10/2026). */
const VAO_DOS_PATINS = 4.24
/** O alto do cilindro da torre (`COLISORES_DO_FAROL`): a varanda onde se pisa. */
const torre = COLISORES_DO_FAROL[0] as Forma
const ALTO_DA_TORRE = topoDaForma(torre)

let raiz: Object3D
let formas: Forma[]
let doArquivo: Forma[]
const p = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`farol.glb sem a âncora ${nome}`)
  return { x: o.position.x, y: o.position.y, z: o.position.z }
}
/** O chão da ilha debaixo do ponto (x, z) do grupo Farol. */
const chao = (x: number, z: number) => alturaDaIlha(FAROL.x + x, FAROL.z + z) - ALTURA_DA_TERRA
/**
 * O piso em (x, z) onde os pés ficam: o alto de forma mais alto que não passa de `ate` (o mirante
 * fica por cima do deque 1, bem mais alto), ou o chão da ilha.
 */
const piso = (x: number, z: number, ate = Number.POSITIVE_INFINITY) =>
  pisoEm(
    formas.filter((c) => {
      const y = topoEm(c, x, z)
      return y === undefined || y <= ate + 0.05
    }),
    x,
    z,
    chao(x, z),
  )
/** O corpo de pé com os pés em (x, y, z) cabe? (devolve quem bate) */
const quemBate = (x: number, y: number, z: number, lista = formas) =>
  lista.find((c) => bate(c, new Vector3(x, y + CORPO.doCentroAoPe + CORPO.folga, z)))?.nome
const daSubida = (nome: string) => /subida|escada-reta|lanterna-farol/.test(nome)

beforeAll(async () => {
  raiz = await carregarGlb(join(import.meta.dir, '..', 'src', 'assets', 'mundo', 'farol.glb'))
  raiz.updateMatrixWorld(true)
  doArquivo = lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha')
  formas = [...doArquivo, torre]
})

describe('a subida final por fora do Farol', () => {
  test('o andaime é filho do nó farol e traz as âncoras e os colisores do pedido', () => {
    let pai = raiz.getObjectByName('subida')?.parent ?? null
    while (pai && pai.name !== 'farol') pai = pai.parent
    expect(pai?.name).toBe('farol')
    const nomes = [
      'escada-1-base',
      'escada-1-topo',
      'escada-1-saida',
      'borda-1-a',
      'borda-1-b',
      'borda-1-fora',
      'borda-2-a',
      'borda-2-b',
      'borda-2-fora',
      'equilibrio-1-a',
      'equilibrio-1-b',
      'corrente-de-ar',
      'corrente-de-ar-topo',
      'subida-farol-largada',
      ...[1, 2, 3, 4, 5, 6].map((i) => `subida-farol-${i}`),
      ...[1, 2, 3, 4, 5].map((i) => `vagalume-farol-${i}`),
    ]
    for (const n of nomes) expect(raiz.getObjectByName(n), n).toBeDefined()
    expect(doArquivo.some((c) => c.nome === 'col-escada-reta-1')).toBe(true)
    expect(doArquivo.filter((c) => c.nome.startsWith('col-deque-subida-'))).toHaveLength(5)
    expect(doArquivo.some((c) => c.nome === 'col-viga-subida-1')).toBe(true)
  })

  test('a largada fica no chão livre, perto do pé da escada', () => {
    const l = p('subida-farol-largada')
    expect(Math.abs(l.y - chao(l.x, l.z))).toBeLessThan(0.02)
    expect(piso(l.x, l.z).nome).toBeUndefined()
    expect(quemBate(l.x, l.y, l.z)).toBeUndefined()
    const base = p('escada-1-base')
    expect(Math.hypot(base.x - l.x, base.z - l.z)).toBeLessThan(
      PERCURSO_DO_CUME.distanciaParaDesistir,
    )
  })

  test('cada parada fica em cima de um colisor, subindo, com o corpo de pé cabendo', () => {
    let antes = p('subida-farol-largada').y
    for (let i = 1; i <= 6; i++) {
      const d = p(`subida-farol-${i}`)
      expect(d.y, `subida-farol-${i}`).toBeGreaterThanOrEqual(antes)
      antes = d.y
      const embaixo = piso(d.x, d.z, d.y)
      expect(embaixo.nome, `subida-farol-${i}`).toBeDefined()
      expect(Math.abs(embaixo.y - d.y), `subida-farol-${i}`).toBeLessThan(0.02)
      expect(quemBate(d.x, d.y, d.z), `subida-farol-${i}`).toBeUndefined()
    }
    // A última é a varanda: o alto da torre, no anel em volta da lanterna.
    const varanda = p('subida-farol-6')
    expect(piso(varanda.x, varanda.z, varanda.y).nome).toBe('col-cil-farol')
    expect(varanda.y).toBeCloseTo(ALTO_DA_TORRE, 2)
  })

  test('escada reta: alta demais para o pulo, do chão ao deque 1, com o corpo livre na subida', () => {
    const base = p('escada-1-base')
    const topo = p('escada-1-topo')
    const saida = p('escada-1-saida')
    expect(Math.abs(base.y - chao(base.x, base.z))).toBeLessThan(0.02)
    expect(topo.y - base.y).toBeGreaterThan(beiradaMaximaDoPulo(GRAVIDADE) + 0.3)
    expect(piso(saida.x, saida.z, topo.y).nome).toMatch(/^col-deque-subida-/)
    expect(Math.abs(piso(saida.x, saida.z, topo.y).y - topo.y)).toBeLessThan(0.02)
    // Quem sobe fica do lado oposto ao da saída, a `afastamento` da escada, sem bater em nada.
    const d = Math.hypot(base.x - saida.x, base.z - saida.z)
    const nx = (base.x - saida.x) / d
    const nz = (base.z - saida.z) / d
    for (let y = base.y; y <= topo.y; y += 0.2) {
      const x = base.x + nx * ESCADA.afastamento
      const z = base.z + nz * ESCADA.afastamento
      expect(quemBate(x, y, z), `na escada a ${y.toFixed(1)}`).toBeUndefined()
    }
    // O colisor dos degraus está entre o pé e o alto (só para o corpo).
    const degraus = doArquivo.find((c) => c.nome === 'col-escada-reta-1') as Forma
    expect(topoDaForma(degraus)).toBeCloseTo(topo.y, 1)
  })

  for (const i of [1, 2]) {
    test(`quina ${i}: só agarrando, com espaço embaixo, pendurado e em cima`, () => {
      const a = p(`borda-${i}-a`)
      const b = p(`borda-${i}-b`)
      const fora = p(`borda-${i}-fora`)
      const L = Math.hypot(b.x - a.x, b.z - a.z)
      const ux = (b.x - a.x) / L
      const uz = (b.z - a.z) / L
      let nx = -uz
      let nz = ux
      if ((fora.x - a.x) * nx + (fora.z - a.z) * nz < 0) {
        nx = -nx
        nz = -nz
      }
      expect(L).toBeGreaterThan(2 * BORDA.longeDaPonta + 0.5)
      for (let s = BORDA.longeDaPonta; s <= L - BORDA.longeDaPonta + 1e-6; s += 0.1) {
        const qx = a.x + ux * s
        const qz = a.z + uz * s
        const q = a.y
        // Em cima: a quina é a borda do deque de cima, e o corpo cabe de pé lá dentro.
        const cx = qx - nx * BORDA.paraDentro
        const cz = qz - nz * BORDA.paraDentro
        expect(Math.abs(piso(cx, cz, q).y - q)).toBeLessThan(0.02)
        expect(quemBate(cx, q, cz)).toBeUndefined()
        // Pendurado: o meio do corpo a `daParede` para fora e `maosAcimaDoCentro` abaixo da quina.
        const hx = qx + nx * BORDA.daParede
        const hz = qz + nz * BORDA.daParede
        const centro = q - BORDA.maosAcimaDoCentro
        const pendurado = formas.find((c) => bate(c, new Vector3(hx, centro, hz)))
        expect(pendurado?.nome, `pendurado em s=${s.toFixed(1)}`).toBeUndefined()
        // Embaixo: o deque de baixo, com folga para os pés de quem está pendurado.
        const baixo = piso(hx, hz, q - 1)
        expect(baixo.nome).toMatch(/^col-deque-subida-/)
        expect(centro - CORPO.doCentroAoPe - baixo.y).toBeGreaterThan(0.3)
        // Do deque de baixo, só agarrando: mais alta que o pulo, ao alcance das mãos no alto dele.
        expect(q - baixo.y).toBeGreaterThan(beiradaMaximaDoPulo(GRAVIDADE) + 0.3)
        expect(q - baixo.y).toBeLessThan(beiradaMaximaAgarrando(GRAVIDADE) - 0.5)
        const maosNoAlto =
          baixo.y + CORPO.doCentroAoPe + alturaDoPulo(GRAVIDADE) + BORDA.maosAcimaDoCentro
        expect(maosNoAlto).toBeGreaterThan(q + BORDA.alcanceDeAltura)
        // Quem pula de pé no deque, encostado na quina por fora, fica ao alcance de fora dela.
        expect(BORDA.daParede).toBeLessThan(BORDA.alcanceDeFora)
        expect(quemBate(hx, baixo.y, hz)).toBeUndefined()
      }
    })
  }

  test('equilíbrio: a viga é o único caminho do deque 3 ao 4 (o vão passa do pulo, até de patins)', () => {
    const a = p('equilibrio-1-a')
    const b = p('equilibrio-1-b')
    const L = Math.hypot(b.x - a.x, b.z - a.z)
    for (let t = EQUILIBRIO.longeDaPonta; t <= L - EQUILIBRIO.longeDaPonta; t += 0.2) {
      const x = a.x + ((b.x - a.x) * t) / L
      const z = a.z + ((b.z - a.z) * t) / L
      const embaixo = piso(x, z, a.y)
      expect(embaixo.nome).toBe('col-viga-subida-1')
      expect(Math.abs(embaixo.y - a.y)).toBeLessThan(0.02)
      expect(quemBate(x, a.y, z)).toBeUndefined()
      // Um passo para o lado já não tem chão perto: a viga é estreita.
      for (const lado of [-1, 1]) {
        const fx = x + (-(b.z - a.z) / L) * lado * (EQUILIBRIO.deLadoParaEntrar + 0.2)
        const fz = z + ((b.x - a.x) / L) * lado * (EQUILIBRIO.deLadoParaEntrar + 0.2)
        expect(piso(fx, fz, a.y).y).toBeLessThan(a.y - 1.5)
      }
    }
    // As pontas da viga nos deques 3 e 4, e o vão entre eles maior que qualquer pulo.
    const noA = piso(a.x + (a.x - b.x) * (0.3 / L), a.z + (a.z - b.z) * (0.3 / L), a.y)
    const noB = piso(b.x + (b.x - a.x) * (0.3 / L), b.z + (b.z - a.z) * (0.3 / L), b.y)
    expect(noA.nome).toBe('col-deque-subida-3')
    expect(noB.nome).toBe('col-deque-subida-4')
    expect(L).toBeGreaterThan(alcanceMaximoDoPulo(CORPO.correr, GRAVIDADE) + 0.1)
    expect(L).toBeGreaterThan(VAO_DOS_PATINS + 0.1)
    const d3 = doArquivo.find((c) => c.nome === 'col-deque-subida-3') as Forma
    const d4 = doArquivo.find((c) => c.nome === 'col-deque-subida-4') as Forma
    if (d3.forma !== 'caixa' || d4.forma !== 'caixa') throw new Error('deques são caixas')
    const vaoX = d3.posicao[0] - d3.meio[0] - (d4.posicao[0] + d4.meio[0])
    expect(vaoX).toBeGreaterThan(VAO_DOS_PATINS + 0.1)
    // Do deque 4 nada mais perto que o pulo leva a outro lugar alto (só a viga e a corrente).
    for (const c of doArquivo) {
      if (c === d4 || c === d3 || c.nome === 'col-viga-subida-1' || c.forma !== 'caixa') continue
      if (Math.abs(topoDaForma(c) - topoDaForma(d4)) > 1.5) continue
      const dx = Math.abs(c.posicao[0] - d4.posicao[0]) - c.meio[0] - d4.meio[0]
      const dz = Math.abs(c.posicao[2] - d4.posicao[2]) - c.meio[2] - d4.meio[2]
      expect(Math.max(dx, dz), c.nome).toBeGreaterThan(VAO_DOS_PATINS)
    }
  })

  test('corrente de ar: do deque 4, com o planador, até o mirante na altura da varanda', () => {
    const base = p('corrente-de-ar')
    const topo = p('corrente-de-ar-topo')
    expect(piso(base.x, base.z, base.y).nome).toBe('col-deque-subida-4')
    expect(Math.abs(piso(base.x, base.z, base.y).y - base.y)).toBeLessThan(0.02)
    expect(topo.y).toBeGreaterThan(ALTO_DA_TORRE + 1)
    // Sem a corrente nada chega ao alto: todo deque do caminho fica mais baixo que o pulo dá.
    for (let i = 1; i <= 4; i++)
      expect(ALTO_DA_TORRE - p(`subida-farol-${i}`).y).toBeGreaterThan(
        beiradaMaximaDoPulo(GRAVIDADE) + 0.5,
      )
    // Plana do alto da corrente para o mirante (a direito, na velocidade do planador): passa por cima
    // de tudo, pousa no mirante ou na varanda e nunca dentro da lanterna.
    const alvo = p('subida-farol-5')
    const d = Math.hypot(alvo.x - topo.x, alvo.z - topo.z)
    const passo = 0.05
    let pousou: string | undefined
    for (let t = 0; t < 4; t += passo) {
      const andou = PLANADOR.velocidade * t
      const x = topo.x + ((alvo.x - topo.x) / d) * andou
      const z = topo.z + ((alvo.z - topo.z) / d) * andou
      const pes = topo.y - PLANADOR.descida * t
      const embaixo = piso(x, z, pes)
      if (pes <= embaixo.y + 0.01) {
        pousou = embaixo.nome
        break
      }
      expect(quemBate(x, pes, z, formas), `no voo em ${andou.toFixed(1)} m`).toBeUndefined()
    }
    expect(['col-deque-subida-5', 'col-cil-farol']).toContain(pousou ?? '')
    // A corrente fica longe da torre: do chão ninguém pula nela (a base é o tampo do deque 4).
    expect(Math.hypot(base.x, base.z)).toBeGreaterThan(
      torre.forma === 'cilindro' ? torre.raio + 3 : 3,
    )
  })

  test('os vagalumes ficam no caminho, ao alcance de quem passa', () => {
    const r = PERCURSO_DO_CUME.raioDoVagalume
    const meioAcima = (x: number, y: number, z: number) =>
      y - (piso(x, z, y - CORPO.doCentroAoPe).y + CORPO.doCentroAoPe)
    // 1: na escada, no meio da altura, na frente de quem sobe.
    const v1 = p('vagalume-farol-1')
    const base = p('escada-1-base')
    expect(Math.hypot(v1.x - base.x, v1.z - base.z)).toBeLessThan(ESCADA.afastamento + r)
    expect(v1.y).toBeGreaterThan(base.y + CORPO.doCentroAoPe)
    expect(v1.y).toBeLessThan(p('escada-1-topo').y + CORPO.doCentroAoPe)
    // 2 a 4: em cima do deque 2, do 3 e da viga, logo acima do meio do corpo.
    for (const i of [2, 3, 4]) {
      const v = p(`vagalume-farol-${i}`)
      expect(meioAcima(v.x, v.y, v.z)).toBeCloseTo(0.2, 1)
      expect(meioAcima(v.x, v.y, v.z)).toBeLessThan(r)
    }
    // 5: dentro da coluna da corrente, entre a base e o topo.
    const v5 = p('vagalume-farol-5')
    const c = p('corrente-de-ar')
    expect(Math.hypot(v5.x - c.x, v5.z - c.z)).toBeLessThan(0.5)
    expect(v5.y).toBeGreaterThan(c.y + CORPO.doCentroAoPe)
    expect(v5.y).toBeLessThan(p('corrente-de-ar-topo').y + CORPO.doCentroAoPe)
  })

  test('nada da subida encosta na porta, nas pedras do pé nem no quadro do Farol', () => {
    const novos = doArquivo.filter((c) => daSubida(c.nome))
    expect(novos.length).toBeGreaterThan(10)
    const pedras = doArquivo.filter((c) => c.nome.startsWith('col-cil-pedra-farol-'))
    const lugar = lugarDoQuadroNoFarol()
    const doQuadro = (colisoresNoLugar(lugar) as Forma[]).map((c) => ({
      ...c,
      posicao: [c.posicao[0] - FAROL.x, c.posicao[1] - ALTURA_DA_TERRA, c.posicao[2] - FAROL.z],
    })) as Forma[]
    // A porta: a folha (0,72 m) gira para fora em volta da dobradiça; nada até 1,5 m dela.
    const porta = raiz.getObjectByName('porta') as Object3D
    const dobradica = porta.position
    // Amostra cada forma nova por pontos (o meio e as quinas de cima e de baixo).
    for (const c of novos) {
      const pts: Vector3[] = []
      const meio = new Vector3(...c.posicao)
      if (c.forma === 'caixa') {
        for (const sx of [-1, 0, 1])
          for (const sy of [-1, 1])
            for (const sz of [-1, 0, 1])
              pts.push(
                new Vector3(sx * c.meio[0], sy * c.meio[1], sz * c.meio[2])
                  .applyQuaternion(new Quaternion(...c.rotacao))
                  .add(meio),
              )
      } else {
        for (const sy of [-1, 1]) pts.push(meio.clone().add(new Vector3(0, sy * c.meiaAltura, 0)))
      }
      for (const q of pts) {
        // A folha vai do pé (a dobradiça) a uns 1,5 m acima dele.
        if (q.y < dobradica.y + 2)
          expect(Math.hypot(q.x - dobradica.x, q.z - dobradica.z), c.nome).toBeGreaterThan(1.5)
        for (const pedra of pedras) {
          if (pedra.forma !== 'cilindro') continue
          const alto = q.y <= topoDaForma(pedra) && q.y >= pedra.posicao[1] - pedra.meiaAltura
          if (!alto) continue
          const folga = Math.hypot(q.x - pedra.posicao[0], q.z - pedra.posicao[2]) - pedra.raio
          expect(folga, `${c.nome} x ${pedra.nome}`).toBeGreaterThan(0.05)
        }
        for (const k of doQuadro)
          expect(Math.hypot(q.x - k.posicao[0], q.z - k.posicao[2]), c.nome).toBeGreaterThan(1.5)
      }
    }
    // A frente da porta (PORTA_DO_FINAL, a 3,5 m da torre) e a do quadro continuam sem a subida
    // por cima até a altura do corpo (a busca de caminho em colisao-da-ilha-central confere o resto).
    for (const c of novos) {
      for (const [x, z] of [
        [2.8, 2.1],
        [
          lugar.x - FAROL.x + Math.sin(lugar.giro) * 1.6,
          lugar.z - FAROL.z + Math.cos(lugar.giro) * 1.6,
        ],
      ] as const)
        expect(topoEm(c, x, z), c.nome).toBeUndefined()
    }
  })

  test('o que fica dentro do lote grande cai no pé do farol (a parte ocupada do lote)', () => {
    const lote = LOTE_DA_CASA_GRANDE
    const farol = lote.ocupadas.find((o) => o.nome === 'o farol')?.ret
    if (!farol) throw new Error('lote sem o farol ocupado')
    for (const c of doArquivo.filter((k) => daSubida(k.nome))) {
      const mx = c.forma === 'caixa' ? c.meio[0] : c.raio
      const mz = c.forma === 'caixa' ? c.meio[2] : c.raio
      const giro = new Quaternion(...c.rotacao)
      for (const [dx, dz] of [
        [-mx, -mz],
        [mx, -mz],
        [-mx, mz],
        [mx, mz],
      ] as const) {
        const q = new Vector3(dx, 0, dz).applyQuaternion(giro)
        const x = FAROL.x + c.posicao[0] + q.x
        const z = FAROL.z + c.posicao[2] + q.z
        const a = lote.area
        if (x < a.x0 || x > a.x1 || z < a.z0 || z > a.z1) continue
        expect(x >= farol.x0 && x <= farol.x1 && z >= farol.z0 && z <= farol.z1, c.nome).toBe(true)
      }
    }
  })
})
