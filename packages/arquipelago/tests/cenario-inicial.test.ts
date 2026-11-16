import { expect, test } from 'bun:test'
import { ModeloDeCatalogoSchema, validarDocumento } from '@sistemazero/molda-cenarios-core'
import { assentamentoDaPeca } from '../src/sistemas/assentamento-da-faisca'
import { catalogoInicialDaFaisca, cenarioInicialDaFaisca } from '../src/sistemas/cenario-inicial'
import { COMPOSICAO_DA_FAISCA } from '../src/sistemas/composicao-faisca'
import { LAGO_DA_FAISCA } from '../src/sistemas/lago-da-faisca'

test('catálogo importado é qualificado, válido e sem aliases duplicados', () => {
  const c = catalogoInicialDaFaisca()
  expect(c.length).toBe(93)
  expect(new Set(c.map((m) => m.id)).size).toBe(c.length)
  for (const m of c) expect(ModeloDeCatalogoSchema.safeParse(m).success).toBe(true)
})
test('importação preserva todas as posições, orientações, escalas e relações de apoio', () => {
  const d = cenarioInicialDaFaisca('a'.repeat(64))
  expect(d.instancias.length).toBe(COMPOSICAO_DA_FAISCA.length)
  const alturas = new Map<string, number>()
  for (const p of COMPOSICAO_DA_FAISCA) {
    const o = d.instancias.find((o) => o.id === p.id)!
    const y = p.apoio ? alturas.get(p.apoio)! + (p.deslocamentoY ?? 0) : assentamentoDaPeca(p).y
    alturas.set(p.id, y)
    expect(o.transformacao.posicao).toEqual({ x: p.x, y, z: p.z })
    expect(o.transformacao.rotacao.y).toBe(p.giro)
    expect(o.transformacao.escala).toBe(p.escala)
    expect(o.fisica).toBe(p.solida ?? 'nenhuma')
    if (p.apoio)
      expect(o.apoio).toEqual({
        tipo: 'objeto',
        objeto: p.apoio,
        deslocamento: p.deslocamentoY ?? 0,
      })
  }
})
test('água, marcos e JSON não perdem coordenadas no round-trip', () => {
  const d = cenarioInicialDaFaisca('a'.repeat(64))
  expect(validarDocumento(JSON.parse(JSON.stringify(d)))).toEqual(d)
  expect(d.aguas[0]!.nivel).toBe(LAGO_DA_FAISCA.agua.y)
  expect(d.aguas[0]!.centro).toEqual({ x: LAGO_DA_FAISCA.x, z: LAGO_DA_FAISCA.z })
  expect(d.marcos.find((m) => m.id === 'lugar:farol')).toBeDefined()
  expect(d.instancias.find((o) => o.id === 'farol')).toBeDefined()
  for (const o of d.instancias.filter((o) => o.sinal))
    expect(d.marcos.some((m) => m.id === o.sinal!.destino)).toBe(true)
})
