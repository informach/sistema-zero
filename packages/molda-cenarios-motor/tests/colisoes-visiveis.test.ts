import { expect, test } from 'bun:test'
import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  type LineSegments,
  Matrix4,
  Vector3,
} from 'three'
import { ColisoesVisiveis } from '../src/jogo/colisoes-visiveis'
import { MundoDoTeste } from '../src/teste/colisoes'

test('inspeção coincide com a física em drawRange indexado e matriz espelhada sem tocar nas fontes', () => {
  const g = new BufferGeometry()
      .setAttribute(
        'position',
        new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 0, 1, 2, 0, 0, 2, 1], 3),
      )
      .setIndex([0, 1, 2, 3, 4, 5]),
    m = new Matrix4().makeScale(-2, 3, 1).setPosition(4, 1, -2),
    guias = new ColisoesVisiveis()
  g.setDrawRange(3, 3)
  const fonte = { geometria: g, matriz: m },
    mundo = new MundoDoTeste([fonte]),
    antes = Array.from(g.getAttribute('position').array)
  let descartouOriginal = false
  g.addEventListener('dispose', () => {
    descartouOriginal = true
  })
  try {
    expect(guias.definir([fonte])).toEqual({ fontes: 1, triangulos: 1, erro: null })
    const linhas = guias.grupo.children[0] as LineSegments,
      atributo = linhas.geometry.getAttribute('position'),
      geometria = linhas.geometry
    expect(geometria.drawRange.count).toBe(6)
    for (let i = 0; i < 6; i++) expect(atributo.getY(i)).toBe(7)
    const hit = mundo.rastrear(new Vector3(3.5, 12, -1.75), new Vector3(3.5, 0, -1.75))
    expect(hit?.ponto.y).toBeCloseTo(7, 8)
    guias.definir([fonte])
    expect(linhas.geometry).toBe(geometria)
    expect(linhas.geometry.getAttribute('position')).toBe(atributo)
    expect(Array.from(g.getAttribute('position').array)).toEqual(antes)
    guias.limpar()
    guias.descartar()
    guias.descartar()
    expect(descartouOriginal).toBe(false)
    expect(geometria.getAttribute('position')).toBeUndefined()
  } finally {
    mundo.descartar()
    guias.descartar()
    g.dispose()
  }
})
test('orçamento recusa desenho parcial antes de alocar e fontes degeneradas não ressuscitam após descarte', () => {
  const g = new BufferGeometry().setAttribute(
      'position',
      new BufferAttribute(new Float32Array(600_003 * 3), 3),
    ),
    guias = new ColisoesVisiveis(),
    f = { geometria: g, matriz: new Matrix4() }
  try {
    expect(guias.definir([f]).erro).toContain('200 mil')
    expect(
      (guias.grupo.children[0] as LineSegments).geometry.getAttribute('position'),
    ).toBeUndefined()
    expect(guias.definir([{ ...f, matriz: new Matrix4().makeScale(0, 1, 1) }]).triangulos).toBe(0)
    guias.descartar()
    expect(guias.definir([f]).triangulos).toBe(0)
    expect(guias.grupo.children).toHaveLength(0)
  } finally {
    guias.descartar()
    g.dispose()
  }
})
