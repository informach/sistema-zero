import { beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { Box3, Group, type Mesh, type Object3D, Vector3 } from 'three'
import {
  CADA_NO_SOZINHO,
  carregarGlb,
  emendasAbertas,
  sobreposicoes,
} from '../scripts/faces-coplanares'

/**
 * As janelas na parede cortada (`arte/casa/kit.py`, 31/10/2026). Pedido dela: no Construir todas as
 * paredes viram as baixas, e a janela virava parede lisa baixa (a criança não via a janela nem
 * conseguia apagá-la). Agora cada janela tem a versão baixa no `casa-paredes.glb`, com a largura,
 * a origem e as colunas da alta e a altura da parede cortada da família: no alto dela, o peitoril,
 * o pé da moldura e a faixa de vidro (`vidroJanela`); no lambri, a grande com a floreira por fora,
 * como a alta (a em arco e a redonda altas não têm floreira, e as baixas seguem as altas).
 * No jogo: x igual, y para cima, z = -y do Blender (o lado de fora, -Y no Blender, é +z aqui).
 */
const CASA = join(import.meta.dir, '..', 'src', 'assets', 'casa')
const FAMILIAS = ['lambri', 'lisa'] as const
const TIPOS = ['grande', 'arco', 'redonda'] as const
const LARGURA = { grande: 3, arco: 2, redonda: 1 } as const
/** O que é da floreira (terra, folhagem e flores). */
const DA_FLOREIRA = /^(terra|copa|copaClara|petala.*|miolo)$/

let raiz: Object3D
const fontes = new Map<string, Object3D>()

beforeAll(async () => {
  raiz = await carregarGlb(join(CASA, 'casa-paredes.glb'))
  for (const o of raiz.children) fontes.set(o.name, o)
})

function no(nome: string): Object3D {
  const o = fontes.get(nome)
  if (!o) throw new Error(`sem o nó ${nome}`)
  return o
}

/** As malhas do nó, cada uma com o nome do material (o three divide o nó por material). */
function malhas(nome: string): { material: string; caixa: Box3 }[] {
  const out: { material: string; caixa: Box3 }[] = []
  no(nome).traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const mats = Array.isArray(m.material) ? m.material : [m.material]
    for (const x of mats) out.push({ material: x.name, caixa: new Box3().setFromObject(m) })
  })
  return out
}

function alturaMaxima(nome: string, conta: (material: string) => boolean = () => true): number {
  return Math.max(
    ...malhas(nome)
      .filter((m) => conta(m.material))
      .map((m) => m.caixa.max.y),
  )
}

const baixa = (tipo: string, fam: string) => `parede-janela-${tipo}-${fam}-baixa`

describe('as janelas na parede cortada', () => {
  test('os seis nós existem, e nenhum nó de antes sumiu', () => {
    for (const fam of FAMILIAS)
      for (const tipo of TIPOS) {
        no(baixa(tipo, fam))
        no(`parede-janela-${tipo}-${fam}`)
      }
    for (const fam of FAMILIAS)
      for (const t of ['parede', 'parede-porta', 'quina'])
        for (const s of ['', '-baixa']) no(`${t}-${fam}${s}`)
  })

  for (const fam of FAMILIAS)
    for (const tipo of TIPOS)
      test(`${baixa(tipo, fam)}: a altura da parede cortada, a largura e a origem da janela alta`, () => {
        const nome = baixa(tipo, fam)
        // A floreira não conta (pode passar um pouco); as molduras sobem 2 cm acima do topo.
        const topo = alturaMaxima(`parede-${fam}-baixa`)
        expect(
          Math.abs(alturaMaxima(nome, (m) => !DA_FLOREIRA.test(m)) - topo),
        ).toBeLessThanOrEqual(0.02 + 1e-4)
        // Mesma largura e mesma origem (o meio do vão) da janela alta: a parede vai de -n/2 a n/2.
        const alta = new Box3().setFromObject(no(`parede-janela-${tipo}-${fam}`))
        const c = new Box3().setFromObject(no(nome))
        expect(c.min.x).toBeCloseTo(alta.min.x, 3)
        expect(c.max.x).toBeCloseTo(alta.max.x, 3)
        expect(c.max.x - c.min.x).toBeCloseTo(LARGURA[tipo], 3)
        // O pé da parede no mesmo lugar da parede cortada (com o alicerce no lambri).
        expect(c.min.y).toBeCloseTo(new Box3().setFromObject(no(`parede-${fam}-baixa`)).min.y, 3)
      })

  for (const fam of FAMILIAS)
    for (const tipo of TIPOS)
      test(`${baixa(tipo, fam)}: o vidro no alto da parede cortada (faixa azul vista de cima)`, () => {
        const vidro = malhas(baixa(tipo, fam)).filter((m) => m.material === 'vidroJanela')
        expect(vidro.length).toBeGreaterThan(0)
        const topo = alturaMaxima(`parede-${fam}-baixa`)
        for (const v of vidro) {
          expect(v.caixa.max.y).toBeLessThan(topo)
          expect(v.caixa.max.y).toBeGreaterThan(topo - 0.02)
          // Larga o bastante para aparecer de cima: pelo menos 12 cm de espessura.
          expect(v.caixa.max.z - v.caixa.min.z).toBeGreaterThanOrEqual(0.12)
        }
      })

  test('no lambri, a floreira com flores por fora onde a alta tem (a grande); dentro, nada', () => {
    const temFloreira = (nome: string) => malhas(nome).some((m) => m.material === 'terra')
    for (const tipo of TIPOS) {
      expect(temFloreira(baixa(tipo, 'lambri'))).toBe(temFloreira(`parede-janela-${tipo}-lambri`))
      expect(temFloreira(baixa(tipo, 'lisa'))).toBe(false)
    }
    const nome = baixa('grande', 'lambri')
    const plantas = malhas(nome).filter((m) => DA_FLOREIRA.test(m.material))
    expect(plantas.map((m) => m.material)).toContain('terra')
    expect(plantas.some((m) => m.material.startsWith('petala'))).toBe(true)
    // Por fora: o lado de fora (-Y no Blender) é +z no jogo, além da face da parede (0,10).
    for (const p of plantas) expect(p.caixa.min.z).toBeGreaterThan(0.1)
  })

  test('cada nó sozinho: nenhuma face coplanar nem emenda em T no arquivo inteiro', () => {
    const par = (x: { a: string; b: string }) => `${x.a} x ${x.b}`
    expect(sobreposicoes(raiz, CADA_NO_SOZINHO).map(par)).toEqual([])
    expect(emendasAbertas(raiz, CADA_NO_SOZINHO).map(par)).toEqual([])
  })

  /**
   * Como `janelas_baixas` de `cenas.py`: por família, um cômodo 10 × 3 com a frente cortada (as
   * três janelas baixas entre paredes baixas), a direita cortada e depois em pé, o fundo e a
   * esquerda em pé com as janelas altas, e uma fileira com cada janela alta ao lado da baixa e de
   * uma parede em pé, com as quinas onde a altura muda. Giro como o do Blender (em z = em y).
   */
  function janelasMontadas(): Group {
    const cena = new Group()
    let n = 0
    const por = (nome: string, x: number, y: number, giro = 0) => {
      const g = new Group()
      g.name = `${nome}#${n++}`
      g.position.set(x, 0, -y)
      g.rotation.y = (giro * Math.PI) / 180
      g.add(no(nome).clone(true))
      cena.add(g)
    }
    const corrida = (
      eixo: 'x' | 'y',
      fixo: number,
      inicio: number,
      pecas: [string, number][],
      dentro: 1 | -1,
    ) => {
      let pos = inicio
      const giro = eixo === 'x' ? (dentro > 0 ? 0 : 180) : dentro > 0 ? -90 : 90
      for (const [nome, larg] of pecas) {
        const c = pos + larg / 2
        if (eixo === 'x') por(nome, c, fixo, giro)
        else por(nome, fixo, c, giro)
        pos += larg
      }
    }
    for (const [x0, fam] of [
      [0, 'lambri'],
      [20, 'lisa'],
    ] as const) {
      const B = `parede-${fam}-baixa`
      const P = `parede-${fam}`
      const [JG, JA, JR] = TIPOS.map((t) => `parede-janela-${t}-${fam}`) as [string, string, string]
      corrida(
        'x',
        0,
        x0,
        [
          [B, 1],
          [`${JG}-baixa`, 3],
          [B, 1],
          [`${JA}-baixa`, 2],
          [B, 1],
          [`${JR}-baixa`, 1],
          [B, 1],
        ],
        1,
      )
      corrida(
        'x',
        3,
        x0,
        [
          [JG, 3],
          [P, 1],
          [JA, 2],
          [P, 1],
          [JR, 1],
          [P, 1],
          [P, 1],
        ],
        -1,
      )
      corrida(
        'y',
        x0,
        0,
        [
          [P, 1],
          [P, 1],
          [P, 1],
        ],
        1,
      )
      corrida(
        'y',
        x0 + 10,
        0,
        [
          [B, 1],
          [B, 1],
          [P, 1],
        ],
        -1,
      )
      for (const [x, y, alta] of [
        [0, 0, true],
        [10, 0, false],
        [10, 2, true],
        [0, 3, true],
        [10, 3, true],
      ] as const)
        por(`quina-${fam}${alta ? '' : '-baixa'}`, x0 + x, y)
      corrida(
        'x',
        -6,
        x0,
        [
          [JG, 3],
          [`${JG}-baixa`, 3],
          [P, 1],
          [JA, 2],
          [`${JA}-baixa`, 2],
          [P, 1],
          [JR, 1],
          [`${JR}-baixa`, 1],
          [P, 1],
        ],
        1,
      )
      for (const x of [0, 3, 6, 9, 11, 13, 14, 15]) por(`quina-${fam}`, x0 + x, -6)
    }
    cena.updateMatrixWorld(true)
    return cena
  }

  test('montadas ao lado de paredes baixas, altas, janelas altas e quinas: nada coplanar, nenhuma emenda em T', () => {
    const cena = janelasMontadas()
    const par = (x: { a: string; b: string }) => `${x.a} x ${x.b}`
    expect(sobreposicoes(cena).map(par)).toEqual([])
    expect(emendasAbertas(cena).map(par)).toEqual([])
  })

  test('as pontas da janela baixa só têm vértices no pé e no topo, como a parede cortada vizinha', () => {
    for (const fam of FAMILIAS) {
      const alturasDaPonta = (nome: string, x: number) => {
        const ys = new Set<number>()
        const v = new Vector3()
        no(nome).traverse((o) => {
          const m = o as Mesh
          if (!m.isMesh) return
          const mats = Array.isArray(m.material) ? m.material : [m.material]
          if (!mats.some((x) => x.name === 'paredeDentro')) return
          const pos = m.geometry.getAttribute('position')
          if (!pos) return
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
            if (Math.abs(v.x - x) < 1e-4) ys.add(Math.round(v.y * 1000) / 1000)
          }
        })
        return [...ys].sort((a, b) => a - b)
      }
      const vizinha = alturasDaPonta(`parede-${fam}-baixa`, 0.5)
      for (const tipo of TIPOS) {
        const meia = LARGURA[tipo] / 2
        expect(alturasDaPonta(baixa(tipo, fam), meia)).toEqual(vizinha)
        expect(alturasDaPonta(baixa(tipo, fam), -meia)).toEqual(vizinha)
      }
    }
  })
})
