import { expect, test } from 'bun:test'
import { BoxGeometry, Color, Group, Matrix4, MeshStandardMaterial } from 'three'
import { LoteDoModelo } from '../src/lotes'

test('tonalidades de várias cópias usam uma malha e preservam material e geometria originais', () => {
  const g = new BoxGeometry(),
    m = new MeshStandardMaterial({ color: '#e8b071' }),
    pai = new Group()
  const original = m.color.clone(),
    lote = new LoteDoModelo(pai, [{ geometria: g, material: m, matriz: new Matrix4() }])
  lote.preencher([
    { id: 'a', matriz: new Matrix4(), cor: '#ff4400' },
    { id: 'b', matriz: new Matrix4().makeTranslation(2, 0, 0), cor: '#2288ff' },
  ])
  expect(lote.malhas).toHaveLength(1)
  expect(lote.malhas[0]!.geometry).toBe(g)
  expect(lote.malhas[0]!.material).toBe(m)
  expect(m.color).toEqual(original)
  for (const [i, hex] of ['#ff4400', '#2288ff'].entries()) {
    const c = new Color()
    lote.malhas[0]!.getColorAt(i, c)
    const esperado = new Color(hex)
    for (const canal of ['r', 'g', 'b'] as const) expect(c[canal]).toBeCloseTo(esperado[canal], 6)
  }
  const versao = lote.malhas[0]!.instanceColor!.version
  lote.preencher([
    { id: 'b', matriz: new Matrix4() },
    { id: 'a', matriz: new Matrix4() },
  ])
  const c = new Color()
  for (let i = 0; i < 2; i++) {
    lote.malhas[0]!.getColorAt(i, c)
    expect(c.getHexString()).toBe('ffffff')
  }
  expect(lote.malhas[0]!.instanceColor!.version).toBeGreaterThan(versao)
  lote.descartar()
  g.dispose()
  m.dispose()
})

test('cópias sem tonalidade não alocam um atributo de cor desnecessário', () => {
  const g = new BoxGeometry(),
    m = new MeshStandardMaterial(),
    pai = new Group()
  const lote = new LoteDoModelo(pai, [{ geometria: g, material: m, matriz: new Matrix4() }])
  lote.preencher([
    { id: 'a', matriz: new Matrix4() },
    { id: 'b', matriz: new Matrix4(), cor: '#FFFFFF' },
  ])
  expect(lote.malhas[0]!.instanceColor).toBeNull()
  lote.descartar()
  g.dispose()
  m.dispose()
})
