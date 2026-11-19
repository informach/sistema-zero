import { expect, test } from 'bun:test'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three'
import { prepararImagensDoGlb } from '../src/compilar/imagens-glb'

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
  const r = prepararImagensDoGlb(raiz)
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
