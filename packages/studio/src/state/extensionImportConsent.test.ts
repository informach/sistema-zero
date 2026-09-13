import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import type { ExtensionDefinition } from '#extensions'
import * as officialExtensions from '#official-extensions'
import { fakeUseStore } from '../testing/fakeIdbStore'

// idb-keyval é mockado (IndexedDB não existe no happy-dom). O registry de mocks é
// global na suíte — replicamos o no-op padrão usado em persistence.test.ts.
mock.module('idb-keyval', () => ({
  createStore: mock((dbName: string) => fakeUseStore(dbName)),
  del: mock(async () => undefined),
  delMany: mock(async () => undefined),
  get: mock(async (): Promise<unknown> => undefined),
  getMany: mock(async (): Promise<unknown[]> => []),
  keys: mock(async (): Promise<unknown[]> => []),
  set: mock(async () => undefined),
  setMany: mock(async () => undefined),
  update: mock(async () => undefined),
}))

const { useProjectStore } = await import('./projectStore')

const baseFiles = { 'index.html': '<h1>ok</h1>', 'style.css': '', 'script.js': '' }

/** Manifesto mínimo de extensão de teste com as permissões dadas. */
function fakeExtension(id: string, permissions: string[]): ExtensionDefinition {
  return {
    manifest: {
      id,
      name: id,
      version: '1.0.0',
      description: '',
      category: 'test',
      official: true,
      enabledByDefault: false,
      permissions: permissions as never,
      docs: '',
    },
  } as unknown as ExtensionDefinition
}

describe('import: consentimento de permissões de extensão', () => {
  afterEach(() => {
    mock.restore()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('mantém uma extensão oficial com permissões da baseline', async () => {
    const { project } = await useProjectStore.getState().importProjectFromJSON({
      name: 'Com jogo 2D',
      files: baseFiles,
      installedExtensions: [{ id: 'game-2d', version: '1.0.0' }],
    })
    expect(project.installedExtensions.map((extension) => extension.id)).toEqual(['game-2d'])
  })

  it('recusa extensão desconhecida sem apagar sua declaração', async () => {
    const source = {
      name: 'Com id solto',
      files: baseFiles,
      installedExtensions: [{ id: 'extensao-inexistente', version: '9.9.9' }],
    }
    await expect(useProjectStore.getState().importProjectFromJSON(source)).rejects.toThrow(
      'Nenhuma cópia foi gravada',
    )
    expect(source.installedExtensions).toHaveLength(1)
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('recusa extensão que exige rede sem a habilitar silenciosamente', async () => {
    spyOn(officialExtensions, 'findExtension').mockImplementation((id) =>
      id === 'rede-futura' ? fakeExtension('rede-futura', ['canvas', 'network']) : undefined,
    )
    await expect(
      useProjectStore.getState().importProjectFromJSON({
        name: 'Rede',
        files: baseFiles,
        installedExtensions: [{ id: 'rede-futura', version: '1.0.0' }],
      }),
    ).rejects.toThrow('Nenhuma cópia foi gravada')
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('recusa motores de palco conflitantes sem escolher um e descartar outro', async () => {
    const source = {
      name: 'Conflito',
      files: baseFiles,
      installedExtensions: [
        { id: 'game-2d', version: '1.0.0' },
        { id: 'world-3d', version: '1.0.0' },
      ],
    }
    await expect(useProjectStore.getState().importProjectFromJSON(source)).rejects.toThrow(
      'Nenhuma cópia foi gravada',
    )
    expect(source.installedExtensions).toHaveLength(2)
  })

  it('recusa IR que usa extensões incompatíveis', async () => {
    await expect(
      useProjectStore.getState().importProjectFromJSON({
        name: 'IR conflitante',
        files: baseFiles,
        installedExtensions: [
          { id: 'world-3d', version: '1.0.0' },
          { id: 'game-3d-advanced', version: '1.0.0' },
        ],
        ir: {
          version: 2,
          html: [],
          css: [],
          behavior: { start: [], events: [], loops: [] },
          extensions: [{ extensionId: 'world-3d' }, { extensionId: 'game-3d-advanced' }],
        },
      }),
    ).rejects.toThrow('Nenhuma cópia foi gravada')
  })
})
