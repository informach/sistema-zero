import { expect, test } from 'bun:test'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three'
import { prepararAcabamentoDoGlb } from '../src/compilar/acabamento-glb'

test('PNG portátil não altera materiais, imagens ou metadados das fontes e restaura a raiz', () => {
  const textura = new Texture(),
    material = new MeshStandardMaterial({ map: textura }),
    g = new BoxGeometry(1, 1, 1),
    a = new Mesh(g, material),
    b = new Mesh(g, material),
    raiz = new Group().add(a, b)
  textura.userData = { mimeType: 'image/webp', origem: 'catálogo' }
  let materiaisDescartados = 0,
    texturasDescartadas = 0
  const r = prepararAcabamentoDoGlb(raiz)
  try {
    const copia = a.material
    expect(copia).not.toBe(material)
    expect(b.material).toBe(copia)
    expect(copia.map).not.toBe(textura)
    expect(copia.map!.source).toBe(textura.source)
    expect(copia.map!.userData.mimeType).toBe('image/png')
    expect(textura.userData).toEqual({ mimeType: 'image/webp', origem: 'catálogo' })
    copia.addEventListener('dispose', () => materiaisDescartados++)
    copia.map!.addEventListener('dispose', () => texturasDescartadas++)
  } finally {
    r.descartar()
    r.descartar()
  }
  expect(a.material).toBe(material)
  expect(b.material).toBe(material)
  expect(materiaisDescartados).toBe(1)
  expect(texturasDescartadas).toBe(1)
  material.dispose()
  textura.dispose()
  g.dispose()
})

test('acabamento facetado usa normais por face no GLB sem perder a geometria original', () => {
  const g = new BoxGeometry(1, 1, 1),
    material = new MeshStandardMaterial({ flatShading: true }),
    m = new Mesh(g, material),
    r = prepararAcabamentoDoGlb(m)
  try {
    expect(m.geometry).not.toBe(g)
    expect(m.geometry.hasAttribute('normal')).toBe(false)
    expect(m.geometry.getAttribute('position').array).toEqual(g.getAttribute('position').array)
    expect(m.geometry.index!.array).toEqual(g.index!.array)
    expect(g.hasAttribute('normal')).toBe(true)
  } finally {
    r.descartar()
  }
  expect(m.geometry).toBe(g)
  g.dispose()
  material.dispose()
})

test('normal morph de material facetado não desaparece silenciosamente na exportação', () => {
  const g = new BoxGeometry(1, 1, 1),
    material = new MeshStandardMaterial({ flatShading: true }),
    m = new Mesh(g, material)
  g.morphAttributes.normal = [g.getAttribute('normal').clone()]
  try {
    expect(() => {
      const r = prepararAcabamentoDoGlb(m)
      r.descartar()
    }).toThrow(/morphs de normal/)
    expect(m.material).toBe(material)
    expect(m.geometry).toBe(g)
    expect(g.morphAttributes.normal).toHaveLength(1)
  } finally {
    g.dispose()
    material.dispose()
  }
})
