import { beforeAll, describe, expect, test } from 'bun:test'
import { statSync } from 'node:fs'
import { Box3, type BufferGeometry, type Material, Mesh, type Object3D, Vector3 } from 'three'
import { emendasAbertas, sobreposicoes } from '../scripts/faces-coplanares'
import { ARQUIVOS_DAS_ILHAS_MEDIAS } from '../src/mundo/ilhas-medias.gerado'
import { arquivoDaIlha, carregarGlb, jsonDoGlb } from './ajuda-colisores'

/**
 * As versões médias das ilhas (lacunas, 01/11/2026, as ilhas em três versões; `arte/ilhas/medias.py`):
 * a que se vê da ponte, no lugar da silhueta, até a completa entrar no fim da ponte. Sai da completa,
 * então tem a mesma altura e a mesma largura (a troca não muda o tamanho), nenhum nó de colisão (a
 * leve segue colidindo), nenhum clipe, um nó só e os materiais da completa (a tinta da ilha e as luzes
 * da noite valem para ela também), com no máximo uns 45% dos triângulos.
 */
const ILHAS = ['bosque', 'vila-doce', 'recife', 'pico', 'vale-dos-dinos', 'nuvens'] as const
const TETO_TRIANGULOS = 16_000
const TETO_KB = 640
const PROPORCAO_MAXIMA = 0.5
const DIFERENCA_MAXIMA = 0.05

function desenho(raiz: Object3D): Mesh[] {
  const lista: Mesh[] = []
  raiz.traverse((o) => {
    if (o instanceof Mesh && !o.name.startsWith('col-') && !o.name.startsWith('escalada-'))
      lista.push(o)
  })
  return lista
}

function caixaDe(raiz: Object3D): Box3 {
  raiz.updateMatrixWorld(true)
  const caixa = new Box3()
  const v = new Vector3()
  for (const m of desenho(raiz)) {
    const pos = (m.geometry as BufferGeometry).getAttribute('position')
    for (let i = 0; i < pos.count; i++)
      caixa.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld))
  }
  return caixa
}

function triangulos(raiz: Object3D): number {
  let n = 0
  for (const m of desenho(raiz)) {
    const g = m.geometry as BufferGeometry
    n += (g.index?.count ?? g.getAttribute('position').count) / 3
  }
  return n
}

function materiais(raiz: Object3D): Set<string> {
  const nomes = new Set<string>()
  for (const m of desenho(raiz))
    for (const mat of Array.isArray(m.material) ? m.material : [m.material])
      nomes.add((mat as Material).name)
  return nomes
}

const lidas = new Map<string, { media: Object3D; completa: Object3D }>()

beforeAll(async () => {
  for (const ilha of ILHAS) {
    lidas.set(ilha, {
      media: await carregarGlb(arquivoDaIlha(`${ilha}-media.glb`)),
      completa: await carregarGlb(arquivoDaIlha(`${ilha}.glb`)),
    })
  }
}, 30_000)

test('as seis ilhas do anel têm a versão média, e o jogo liga todas', () => {
  expect(Object.keys(ARQUIVOS_DAS_ILHAS_MEDIAS).sort()).toEqual([...ILHAS].sort())
})

describe.each(ILHAS)('%s', (ilha) => {
  const lida = () => lidas.get(ilha) as { media: Object3D; completa: Object3D }

  test('um nó só, sem colisão, sem âncora e sem clipe', () => {
    const json = jsonDoGlb(arquivoDaIlha(`${ilha}-media.glb`))
    expect(json.nodes.map((n) => n.name)).toEqual(['ilha-media'])
    expect(json.nodes[0]?.mesh).toBeDefined()
    expect(json.animations ?? []).toEqual([])
  })

  test('dentro do teto e bem mais leve que a completa', () => {
    const tris = triangulos(lida().media)
    expect(tris).toBeLessThanOrEqual(TETO_TRIANGULOS)
    expect(tris / triangulos(lida().completa)).toBeLessThanOrEqual(PROPORCAO_MAXIMA)
    expect(statSync(arquivoDaIlha(`${ilha}-media.glb`)).size / 1024).toBeLessThanOrEqual(TETO_KB)
  })

  test('a mesma altura e a mesma largura da completa, no mesmo lugar (menos de 5%)', () => {
    const a = caixaDe(lida().completa)
    const b = caixaDe(lida().media)
    expect(Math.abs(b.max.y - a.max.y) / a.max.y).toBeLessThan(DIFERENCA_MAXIMA)
    for (const eixo of ['x', 'z'] as const) {
      const largura = a.max[eixo] - a.min[eixo]
      expect(Math.abs(b.min[eixo] - a.min[eixo]) / largura).toBeLessThan(DIFERENCA_MAXIMA)
      expect(Math.abs(b.max[eixo] - a.max[eixo]) / largura).toBeLessThan(DIFERENCA_MAXIMA)
    }
  })

  test('nenhum par novo de faces coplanares nem de emenda em T (o pisca-pisca)', () => {
    // Pelo material: na média tudo é um nó só. Os pares da completa (no Bosque, os pendentes de
    // `faces-coplanares.test.ts`) podem continuar; par novo, não.
    const pares = (raiz: Object3D) =>
      new Set(
        [...sobreposicoes(raiz), ...emendasAbertas(raiz)].map((p) =>
          [p.a, p.b]
            .map((x) => x.split('/').at(-1))
            .sort()
            .join(' x '),
        ),
      )
    const daCompleta = pares(lida().completa)
    expect([...pares(lida().media)].filter((p) => !daCompleta.has(p))).toEqual([])
  }, 120_000)

  test('só os materiais da completa (a tinta e as luzes da noite seguem pelo nome)', () => {
    const daCompleta = materiais(lida().completa)
    for (const nome of materiais(lida().media)) expect(daCompleta.has(nome)).toBe(true)
  })
})
