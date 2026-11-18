import { expect, test } from 'bun:test'
import type { CamadaDeSolo } from '@sistemazero/molda-cenarios-core/v2'
import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Matrix4 } from 'three'
import { rasterizarSoloCompilado } from '../src/compilar/pintura'

function piso() {
  return new BufferGeometry()
    .setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1], 3))
    .setAttribute(
      'mcnPesosA',
      new BufferAttribute(
        new Uint8Array([255, 0, 0, 0, 0, 255, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0]),
        4,
        true,
      ),
    )
    .setAttribute('mcnPesosB', new BufferAttribute(new Uint8Array(16), 4, true))
    .setIndex([0, 2, 1, 1, 2, 3])
}
const camadas: CamadaDeSolo[] = [
  { id: 'a', nome: 'Vermelho', cor: '#ff0000' },
  { id: 'b', nome: 'Verde', cor: '#00ff00' },
]

test('pintura interpola pesos reais em luz linear, conserva regiões e gera UVs próprios', () => {
  const g = piso(),
    antes = g.getAttribute('mcnPesosA').array.slice()
  try {
    const p = rasterizarSoloCompilado(g, new Matrix4(), camadas, new Map(), { pixelsPorMetro: 4 }),
      esquerda = [...p.pixels.slice(0, 4)],
      direita = [...p.pixels.slice(12, 16)]
    expect([p.largura, p.altura]).toEqual([4, 4])
    expect(esquerda[0]).toBeGreaterThan(230)
    expect(esquerda[1]).toBeGreaterThan(90)
    expect(direita[1]).toBeGreaterThan(230)
    expect(direita[0]).toBeGreaterThan(90)
    expect(esquerda).not.toEqual(direita)
    expect([...p.uvs]).toEqual([0, 0, 1, 0, 0, 1, 1, 1])
    expect(g.getAttribute('mcnPesosA').array).toEqual(antes)
    expect(g.getAttribute('uv')).toBeUndefined()
  } finally {
    g.dispose()
  }
})
test('textura conserva padrão repetido e origem global inclusive em coordenadas negativas', () => {
  const g = piso(),
    a = g.getAttribute('mcnPesosA')
  for (let i = 0; i < a.count; i++) a.setXYZW(i, 1, 0, 0, 0)
  const fontes = new Map([
      [
        'padrao',
        {
          largura: 2,
          altura: 1,
          pixels: new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255]),
          flipY: true,
        },
      ],
    ]),
    camada = [
      { id: 'a', nome: 'Padrão', cor: '#ffffff', textura: { id: 'padrao', repeticaoMetros: 1 } },
    ]
  try {
    const p = rasterizarSoloCompilado(g, new Matrix4(), camada, fontes, { pixelsPorMetro: 4 }),
      q = rasterizarSoloCompilado(g, new Matrix4().makeTranslation(-2, 0, 0), camada, fontes, {
        pixelsPorMetro: 4,
      })
    expect(p.pixels).toEqual(q.pixels)
    expect(p.pixels[4]).toBeGreaterThan(p.pixels[6]!)
    expect(p.pixels[8]).toBeLessThan(p.pixels[10]!)
  } finally {
    g.dispose()
  }
})
test('falta de textura, pesos inválidos, resolução excessiva e cancelamento recusam a pintura', () => {
  const g = piso()
  try {
    expect(() =>
      rasterizarSoloCompilado(
        g,
        new Matrix4(),
        [{ ...camadas[0]!, textura: { id: 'ausente', repeticaoMetros: 1 } }],
        new Map(),
      ),
    ).toThrow(/textura/)
    expect(() =>
      rasterizarSoloCompilado(g, new Matrix4().makeScale(1000, 1, 1000), camadas, new Map()),
    ).toThrow(/resolução|pixels/)
    const c = new AbortController()
    c.abort()
    expect(() =>
      rasterizarSoloCompilado(g, new Matrix4(), camadas, new Map(), { sinal: c.signal }),
    ).toThrow()
    g.getAttribute('mcnPesosA').setX(0, 0)
    expect(() => rasterizarSoloCompilado(g, new Matrix4(), camadas, new Map())).toThrow(/pesos/)
  } finally {
    g.dispose()
  }
})
