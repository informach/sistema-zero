import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import type { ExtensionDefinition } from '#extensions'
import * as officialExtensions from '#official-extensions'

// idb-keyval é mockado (IndexedDB não existe no happy-dom). O registry de mocks é
// global na suíte — replicamos o no-op padrão usado em persistence.test.ts.
mock.module('idb-keyval', () => ({
  createStore: mock(() => ({ name: 'test-store' })),
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
      examples: [],
    },
  } as unknown as ExtensionDefinition
}

describe('import: consentimento de permissões de extensão', () => {
  afterEach(() => {
    mock.restore()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('mantém extensão oficial que declara só permissões da baseline (game-2d)', async () => {
    // game-2d declara canvas/keyboard/mouse/audio — tudo baseline → preservada.
    const { project: imported } = await useProjectStore.getState().importProjectFromJSON({
      name: 'Com jogo 2D',
      files: baseFiles,
      installedExtensions: [{ id: 'game-2d', version: '1.0.0' }],
    })

    expect(imported.installedExtensions.map((e) => e.id)).toContain('game-2d')
  })

  it('mantém id de extensão desconhecido (inerte — o preview o ignora)', async () => {
    // Sem manifesto = nenhuma permissão declarada → passa (não é vetor sem runtime).
    const { project: imported } = await useProjectStore.getState().importProjectFromJSON({
      name: 'Com id solto',
      files: baseFiles,
      installedExtensions: [{ id: 'extensao-inexistente', version: '9.9.9' }],
    })

    expect(imported.installedExtensions.map((e) => e.id)).toContain('extensao-inexistente')
  })

  it('DESCARTA extensão cujo manifesto declara permissão fora da baseline (network)', async () => {
    // Fail-closed do consentimento: simula uma FUTURA extensão que declara
    // `network`. Abrir o .json de um estranho não pode habilitá-la em silêncio.
    spyOn(officialExtensions, 'findExtension').mockImplementation((id: string) =>
      id === 'rede-futura' ? fakeExtension('rede-futura', ['canvas', 'network']) : undefined,
    )

    const { project: imported } = await useProjectStore.getState().importProjectFromJSON({
      name: 'Com extensão de rede',
      files: baseFiles,
      installedExtensions: [
        { id: 'rede-futura', version: '1.0.0' },
        { id: 'extensao-inexistente', version: '1.0.0' },
      ],
    })

    const ids = imported.installedExtensions.map((e) => e.id)
    expect(ids).not.toContain('rede-futura')
    // O id desconhecido (sem manifesto após o spy) continua passando.
    expect(ids).toContain('extensao-inexistente')
  })
})
