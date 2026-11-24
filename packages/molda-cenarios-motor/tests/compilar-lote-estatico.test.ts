import { expect, test } from 'bun:test'
import { criarConsultaDeEntidadesDoNo } from '@sistemazero/molda-cenarios-core/compilar'
import { BoxGeometry, Matrix4, Vector3 } from 'three'
import { LoteEstaticoCompilado } from '../src/compilar/lote-estatico'

test('junção conserva transformações, UVs e identidade das faces sem alterar a fonte', () => {
  const g = new BoxGeometry(2, 1, 3),
    antes = g.getAttribute('position').array.slice(),
    lote = new LoteEstaticoCompilado()
  const matrizes = [
    new Matrix4(),
    new Matrix4().makeTranslation(6, 2, 0).multiply(new Matrix4().makeScale(-1, 2, 1)),
  ]
  for (const [i, matriz] of matrizes.entries())
    lote.adicionar({ geometria: g, matriz }, `objeto${i}`)
  const partes = lote.finalizar()
  try {
    expect(partes).toHaveLength(1)
    const p = partes[0]!,
      pos = p.geometria.getAttribute('position'),
      uv = p.geometria.getAttribute('uv')
    expect(p.geometria.hasAttribute('mcnOrigemDaJuncao')).toBe(false)
    expect(p.faixas.map((f) => [f.entidade, f.triangulos])).toEqual([
      ['objeto0', 12],
      ['objeto1', 12],
    ])
    const buscar = criarConsultaDeEntidadesDoNo({
      id: 'n',
      arquivo: 'modelo/lote.glb',
      entidade: null,
      matriz: new Matrix4().elements,
      volume: { min: { x: -1, y: -0.5, z: -1.5 }, max: { x: 7, y: 3, z: 1.5 } },
      faixas: p.faixas,
    })
    expect(buscar('lote', 0)).toBe('objeto0')
    expect(buscar('lote', 12)).toBe('objeto1')
    expect(pos.count).toBe(48)
    expect(uv.count).toBe(48)
    const esperado = g.getAttribute('position'),
      uvOriginal = g.getAttribute('uv'),
      ponto = new Vector3()
    for (let t = 0; t < 24; t++)
      for (let canto = 0; canto < 3; canto++) {
        const objeto = Math.floor(t / 12),
          local = t % 12,
          ordem = objeto === 1 ? [0, 2, 1] : [0, 1, 2],
          original = g.index!.getX(local * 3 + ordem[canto]!),
          destino = p.geometria.index!.getX(t * 3 + canto)
        ponto.fromBufferAttribute(esperado, original).applyMatrix4(matrizes[objeto]!)
        expect(new Vector3().fromBufferAttribute(pos, destino).distanceTo(ponto)).toBeLessThan(1e-6)
        expect(uv.getX(destino)).toBe(uvOriginal.getX(original))
        expect(uv.getY(destino)).toBe(uvOriginal.getY(original))
      }
    expect(g.getAttribute('position').array).toEqual(antes)
    expect(() => lote.finalizar()).toThrow(/encerrado/)
  } finally {
    for (const p of partes) p.geometria.dispose()
    lote.descartar()
    g.dispose()
  }
})

test('junção divide mais de 65 mil vértices mantendo todas as faixas', () => {
  const g = new BoxGeometry(1, 1, 1),
    lote = new LoteEstaticoCompilado()
  for (let i = 0; i < 2800; i++)
    lote.adicionar({ geometria: g, matriz: new Matrix4().makeTranslation(i, 0, 0) }, `c${i}`)
  const partes = lote.finalizar()
  try {
    expect(partes.length).toBeGreaterThan(1)
    expect(partes.every((p) => p.geometria.getAttribute('position').count <= 65000)).toBe(true)
    expect(partes.reduce((s, p) => s + p.geometria.index!.count / 3, 0)).toBe(2800 * 12)
    expect(new Set(partes.flatMap((p) => p.faixas.map((f) => f.entidade))).size).toBe(2800)
  } finally {
    for (const p of partes) p.geometria.dispose()
    lote.descartar()
    g.dispose()
  }
})

test('orçamento insuficiente e layout distinto não provocam perda silenciosa de atributos', () => {
  const g = new BoxGeometry(1, 1, 1),
    semUv = g.clone(),
    lote = new LoteEstaticoCompilado(),
    pequeno = new LoteEstaticoCompilado(100)
  semUv.deleteAttribute('uv')
  try {
    expect(() => pequeno.adicionar({ geometria: g, matriz: new Matrix4() }, 'a')).toThrow(
      /orçamento/,
    )
    lote.adicionar({ geometria: g, matriz: new Matrix4() }, 'a')
    expect(() => lote.adicionar({ geometria: semUv, matriz: new Matrix4() }, 'b')).toThrow(
      /layouts/,
    )
  } finally {
    pequeno.descartar()
    lote.descartar()
    semUv.dispose()
    g.dispose()
  }
})
