import { expect, test } from 'bun:test'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { NOMES_DAS_FACES } from '../src/mundo/carregar-aparencia'
import { pintaMoradaModel } from '../src/mundo/morada-aparencia'

test('superfícies de autoria têm UV e independem do material nomeado da arte', () => {
  const root = new Group()
  root.add(new Mesh(new BoxGeometry(1, 2, 0.5), new MeshStandardMaterial()))
  const projection = pintaMoradaModel(root)
  for (const name of Object.values(NOMES_DAS_FACES)) {
    const face = projection.root.getObjectByName(name)
    expect(face).toBeInstanceOf(Mesh)
    const mesh = face as Mesh
    const uv = mesh.geometry.getAttribute('uv')
    expect(uv.count).toBe(4)
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(0)
      expect(uv.getX(i)).toBeLessThanOrEqual(1)
      expect(uv.getY(i)).toBeGreaterThanOrEqual(0)
      expect(uv.getY(i)).toBeLessThanOrEqual(1)
    }
  }
  projection.dispose()
})
