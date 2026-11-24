import { afterEach, describe, expect, it } from 'bun:test'
import { PintaSceneSchema } from '@sistemazero/core/studio/pinta-scene'
import { createEmptyProject, PROJECT_ASSET_LIMITS, type ProjectAsset } from '#core'
import { addPintaCreationToProject } from '../components/assets/addCreationToProject'
import type { StudioPintaImportedAsset } from '../studio/pinta-library'
import { useProjectStore } from './projectStore'

const PNG = 'data:image/png;base64,AAAA'
function map(id: string): StudioPintaImportedAsset {
  return {
    id,
    name: id,
    dataUrl: PNG,
    width: 16,
    height: 16,
    libRevision: 50,
    scene: PintaSceneSchema.parse({
      version: 1,
      id,
      name: id,
      tileSize: 16,
      cols: 1,
      rows: 1,
      tilesets: [
        { id: 'ts', name: 'peças', image: PNG, columns: 1, count: 1, solid: [], platform: [] },
      ],
      layers: [
        { id: 'floor', name: 'Chão', kind: 'tiles', tilesetId: 'ts', visible: true, cells: [0] },
      ],
    }),
  }
}
function seed(assets: ProjectAsset[] = []) {
  const project = { ...createEmptyProject('pinta-world', 'Mundo'), assets }
  project.files['script.js'] += '\nconst meuPrograma = 123;'
  useProjectStore.setState({ project, editingAccess: 'author', isDirty: false, saveError: null })
  return project
}
afterEach(() =>
  useProjectStore.setState({ project: null, editingAccess: 'author', isDirty: false }),
)

describe('importação atômica de mapas ligados', () => {
  it('traz as portas com o mapa, mantém programação e atualiza sem mudar ids e nomes', () => {
    const before = seed()
    const bundle = { ...map('vila'), maps: [map('cabana')] }
    expect(addPintaCreationToProject(useProjectStore.getState(), bundle)).toBeNull()
    const first = useProjectStore.getState().project!
    expect(first.assets?.map((a) => a.libId)).toEqual(['personal:vila', 'personal:cabana'])
    expect(first.files).toBe(before.files)
    expect(first.ir).toBe(before.ir)
    expect(first.blocksState).toBe(before.blocksState)
    bundle.name = 'nome-novo'
    bundle.libRevision = 99
    expect(addPintaCreationToProject(useProjectStore.getState(), bundle)).toBeNull()
    const next = useProjectStore.getState().project!
    expect(next.assets?.map((a) => [a.id, a.name])).toEqual(
      first.assets?.map((a) => [a.id, a.name]),
    )
    expect(next.assets?.[0]?.libRevision).toBe(99)
    expect(next.files).toBe(before.files)
  })

  it('um mapa inválido recusa o lote inteiro e mantém a referência do projeto', () => {
    const before = seed()
    const error = addPintaCreationToProject(useProjectStore.getState(), {
      ...map('vila'),
      maps: [{ ...map('cabana'), scene: {} }],
    })
    expect(error).toContain('incompleto')
    expect(useProjectStore.getState().project).toBe(before)
    expect(useProjectStore.getState().isDirty).toBe(false)
  })

  it('limite total, ids repetidos e modo de observação não deixam uma importação parcial', () => {
    const assets: ProjectAsset[] = Array.from(
      { length: PROJECT_ASSET_LIMITS.maxAssetsCount - 1 },
      (_, i) => ({ id: `a${i}`, name: `a${i}`, kind: 'image', source: 'upload', dataUrl: PNG }),
    )
    const before = seed(assets)
    expect(
      addPintaCreationToProject(useProjectStore.getState(), {
        ...map('vila'),
        maps: [map('cabana')],
      }),
    ).not.toBeNull()
    expect(useProjectStore.getState().project).toBe(before)
    expect(
      addPintaCreationToProject(useProjectStore.getState(), {
        ...map('vila'),
        maps: [map('vila')],
      }),
    ).toContain('inválido')
    useProjectStore.setState({ editingAccess: 'observer' })
    expect(
      addPintaCreationToProject(useProjectStore.getState(), {
        ...map('vila'),
        maps: [map('cabana')],
      }),
    ).toContain('observação')
    expect(useProjectStore.getState().project).toBe(before)
  })
})
