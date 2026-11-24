import { expect, test } from 'bun:test'
import { RAYLIB_2D_EXTENSION } from '../../runtime/python/raylib/contract'
import { projectHas3DConsumer, projectHas3DMaterials } from './has3DConsumer'

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

// Lote 3 da missão (21/11/2026): a régua do Canvas 3D anda o estado dos blocos com pilha explícita,
// para no primeiro bloco `sz_t3d_` e só olha o TIPO (o texto de um campo não é um bloco de 3D).
const classic = (blocksState: unknown) =>
  ({ installedExtensions: [], files: { 'script.js': '' }, blocksState }) as never

function chain(length: number, lastType: string, fields: Record<string, string> = {}) {
  let next: Record<string, unknown> = { type: lastType, id: 'fim', fields }
  for (let index = length - 1; index > 0; index--)
    next = { type: 'sz_raw_js', id: `b${index}`, fields: {}, next: { block: next } }
  return { blocks: { languageVersion: 0, blocks: [next] } }
}

test('um bloco de Canvas 3D no fim de uma sequência de 20 mil blocos conta, sem estourar a pilha', () => {
  expect(projectHas3DConsumer(classic(chain(20_000, 'sz_t3d_scene')))).toBe(true)
})

test('sem bloco de Canvas 3D não conta, nem com "sz_t3d_" escrito num campo de texto', () => {
  expect(projectHas3DConsumer(classic(chain(20_000, 'sz_raw_js')))).toBe(false)
  expect(projectHas3DConsumer(classic(chain(3, 'sz_raw_js', { CODE: '// sz_t3d_scene' })))).toBe(
    false,
  )
})
