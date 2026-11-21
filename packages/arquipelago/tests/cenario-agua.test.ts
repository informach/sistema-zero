import { expect, test } from 'bun:test'
import {
  apoioDepoisDeTransformar,
  escalaUniformeDoGesto,
  executarLote,
} from '@sistemazero/molda-cenarios-core'
import { assentarInstancias } from '../src/molda/importacao-v1/apoio'
import { catalogoInicialDaFaisca, cenarioInicialDaFaisca } from '../src/sistemas/cenario-inicial'

test('mover, girar e escalar o lago leva a ponte vinculada sem perder a intenção de apoio', () => {
  const d = cenarioInicialDaFaisca('a'.repeat(64)),
    ponte = d.instancias.find((p) => p.id === 'ponte-lago')!,
    a = d.aguas[0]!,
    antes = structuredClone(a),
    catalogo = new Map(catalogoInicialDaFaisca().map((m) => [m.id, m]))
  d.instancias = [ponte]
  a.centro = { x: 70, z: 140 }
  a.giro = Math.PI / 2
  a.escala = 1.5
  a.nivel += 1
  const atual = assentarInstancias(d, catalogo, () => 4)[0]!
  expect(atual.transformacao.posicao.x).toBeCloseTo(70)
  expect(atual.transformacao.posicao.z).toBeCloseTo(140)
  expect(atual.transformacao.posicao.y).toBeCloseTo(
    a.nivel + (ponte.transformacao.posicao.y - antes.nivel) * 1.5,
  )
  expect(atual.transformacao.escala).toBeCloseTo(ponte.transformacao.escala * 1.5)
  const novo = structuredClone(atual.transformacao)
  novo.posicao.x += 2
  const apoio = apoioDepoisDeTransformar(ponte, novo, atual.transformacao, d)
  d.instancias = [{ ...ponte, apoio, transformacao: novo }]
  expect(assentarInstancias(d, catalogo, () => 4)[0]!.transformacao.posicao.x).toBeCloseTo(72)
  expect(() =>
    executarLote(
      { documento: d, revisao: 0 },
      { revisaoEsperada: 0, comandos: [{ tipo: 'agua.remover', id: a.id }] },
    ),
  ).toThrow('Água de apoio')
})
test('escala uniforme aceita diminuir pelo manipulador e apoio considera inclinação completa', () => {
  expect(escalaUniformeDoGesto({ x: 0.7, y: 1, z: 1 }, 1)).toBeCloseTo(0.7)
  expect(escalaUniformeDoGesto({ x: 1, y: 1.3, z: 1 }, 1)).toBeCloseTo(1.3)
  const d = cenarioInicialDaFaisca('a'.repeat(64)),
    p = d.instancias.find((p) => p.id === 'poco')!,
    catalogo = new Map(catalogoInicialDaFaisca().map((m) => [m.id, m]))
  p.apoio = { tipo: 'terreno', referencia: 'volume', deslocamento: 0, inclinar: false }
  p.transformacao.rotacao.z = Math.PI / 2
  p.transformacao.escala = 1
  d.instancias = [p]
  const r = assentarInstancias(d, catalogo, () => 4)[0]!
  expect(r.transformacao.posicao.y + catalogo.get(p.modelo)!.min[0]).toBeCloseTo(4)
})
