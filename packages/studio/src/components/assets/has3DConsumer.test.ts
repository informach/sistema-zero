import { expect, test } from 'bun:test'
import { RAYLIB_2D_EXTENSION } from '../../runtime/python/raylib/contract'
import { projectHas3DMaterials } from './has3DConsumer'

const python = (extensions: { id: string; version: string }[], kinds: string[]) =>
  ({
    programmingLanguage: 'python',
    installedExtensions: extensions.map((item) => ({ ...item, installedAt: 1 })),
    assets: kinds.map((kind, index) => ({ id: `a${index}`, name: `a${index}`, kind })),
  }) as never

test('Python sem Raylib: a aba 3D some, a não ser que sobre um modelo para apagar', () => {
  expect(projectHas3DMaterials(python([], []), true)).toBe(false)
  expect(projectHas3DMaterials(python([], ['image']), true)).toBe(false)
  // Tirar a Raylib 3D deixa o .glb no projeto: a aba fica para a criança poder apagá-lo.
  expect(projectHas3DMaterials(python([], ['model3d']), false)).toBe(true)
})

test('Raylib: o Molda abre a aba mesmo sem modelo (a textura entra no 2D também)', () => {
  expect(projectHas3DMaterials(python([RAYLIB_2D_EXTENSION], []), true)).toBe(true)
  expect(projectHas3DMaterials(python([RAYLIB_2D_EXTENSION], []), false)).toBe(false)
})
