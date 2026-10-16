import { afterEach, describe, expect, it } from 'bun:test'
import { createEmptyProject } from '../core/project'
import { createProLanguageService } from '../monaco/pro/languageService'
import type { ProLanguageQueries } from '../monaco/pro/protocol'
import type { ProLanguageSession } from '../monaco/pro/session'
import { setProjectStorageNamespace } from './projectStorageRuntime'
import { createProjectStore } from './projectStore'
import { applyProEditorChange, listProSessionApplications, undoProApplication } from './proRevision'
import {
  applyPreparedProWorkspaceOperation,
  applyProTextEdits,
  prepareProWorkspaceOperation,
} from './proWorkspaceOperations'

afterEach(() => setProjectStorageNamespace(''))

function fixture() {
  const store = createProjectStore()
  store.getState().setProject({
    ...createEmptyProject('workspace-game', 'Jogo'),
    kind: 'pro',
    mode: 'code',
    proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
    tree: {
      src: { kind: 'dir' },
      empty: { kind: 'dir' },
      'src/main.ts': {
        kind: 'file',
        content: 'import { speed } from "./config"; console.log(speed)',
      },
      'src/config.ts': { kind: 'file', content: 'export const speed = 4' },
      'index.html': { kind: 'file', content: '<script src="/src/main.ts"></script>' },
    },
  })
  const service = createProLanguageService({})
  const language: Pick<ProLanguageSession, 'requestForTree'> = {
    async requestForTree<K extends keyof ProLanguageQueries>(
      tree: Parameters<ProLanguageSession['requestForTree']>[0],
      method: K,
      ...args: ProLanguageQueries[K]['args']
    ): Promise<ProLanguageQueries[K]['result']> {
      service.update(
        Object.fromEntries(
          Object.entries(tree).flatMap(([path, node]) =>
            node.kind === 'file' ? [[path, node.content]] : [],
          ),
        ),
      )
      // This test exercises the same typed request boundary as the worker, with the real TS engine.
      const request = { method, args }
      if (request.method === 'symbols')
        return service.symbols(String(args[0])) as ProLanguageQueries[K]['result']
      if (request.method === 'renameFile')
        return service.renameFile(
          String(args[0]),
          String(args[1]),
        ) as ProLanguageQueries[K]['result']
      if (request.method === 'renameSymbol')
        return service.renameSymbol(
          String(args[0]),
          Number(args[1]),
          String(args[2]),
        ) as ProLanguageQueries[K]['result']
      throw new Error(`Unexpected request: ${method}`)
    },
  }
  const prepare = (intent: Parameters<typeof prepareProWorkspaceOperation>[3]) =>
    prepareProWorkspaceOperation(store, 'workspace-game', language, intent)
  const apply = async (intent: Parameters<typeof prepare>[0]) => {
    const operation = await prepare(intent)
    const receipt = await applyProEditorChange(store, operation.projectId, {
      operationId: operation.id,
      change: operation.change,
      pathMap: operation.pathMap,
    })
    return { operation, receipt }
  }
  return { store, service, language, prepare, apply }
}

describe('operações documentais do workspace', () => {
  it('reviews top-level examples, rejects stale text and duplicate symbols, and recovers the whole insertion', async () => {
    const { store, service, prepare } = fixture()
    const source = store.getState().project!.tree!['src/config.ts']!
    if (source.kind !== 'file') throw new Error('fixture')
    const intent = {
      kind: 'example' as const,
      path: 'src/config.ts',
      source: source.content,
      text: 'function criarPlacar() { return 0 }',
      name: 'criarPlacar',
      label: 'placar',
    }
    await expect(prepare({ ...intent, source: '' })).rejects.toThrow('mudou')
    const operation = await prepare(intent)
    await applyPreparedProWorkspaceOperation(store, operation)
    const inserted = store.getState().project!.tree!['src/config.ts']!
    if (inserted.kind !== 'file') throw new Error('fixture')
    await expect(prepare({ ...intent, source: inserted.content })).rejects.toThrow('Já existe')
    await undoProApplication(store, operation.projectId, operation.id)
    expect(store.getState().project!.tree!['src/config.ts']).toEqual(source)
    service.dispose()
  })
  it('deletes and recovers a material with its exact identity, bytes, position and cover', async () => {
    const { store, service, prepare } = fixture()
    store.getState().addAsset({
      name: 'estrela',
      dataUrl: 'data:image/png;base64,aGVsbG8=',
      source: 'upload',
      width: 1,
      height: 1,
    })
    const asset = store.getState().project!.assets![0]!
    store.getState().setCoverAsset(asset.id)
    store.getState().setProFileContent('src/main.ts', `console.log('${asset.id}')`)
    const original = store.getState().project!
    const operation = await prepare({ kind: 'material-delete', id: asset.id })
    expect(operation.warnings[0]).toContain('src/main.ts')
    await applyPreparedProWorkspaceOperation(store, operation)
    expect(store.getState().project!.assets).toEqual([])
    expect(store.getState().project!.coverAssetName).toBeUndefined()
    expect(store.getState().project!.tree).toEqual(original.tree)
    await undoProApplication(store, operation.projectId, operation.id)
    expect(store.getState().project!.assets).toEqual(original.assets)
    expect(store.getState().project!.coverAssetName).toBe('estrela')
    service.dispose()
  })
  it('rejects a preview after a profile A → B → A switch even with the same project object', async () => {
    setProjectStorageNamespace('workspace-a')
    const { store, service, prepare } = fixture()
    const pending = await prepare({ kind: 'rename', from: 'src/config.ts', to: 'src/settings.ts' })
    const original = store.getState().project
    setProjectStorageNamespace('workspace-b')
    setProjectStorageNamespace('workspace-a')
    expect(() => applyPreparedProWorkspaceOperation(store, pending)).toThrow('perfil mudou')
    expect(store.getState().project).toBe(original)
    service.dispose()
  })
  it('recovers empty folders and case-only file renames', async () => {
    const { store, service, apply } = fixture()
    const original = store.getState().project!.tree
    const empty = await apply({ kind: 'rename', from: 'empty', to: 'Empty' })
    expect(store.getState().project!.tree!.Empty).toEqual({ kind: 'dir' })
    await undoProApplication(store, empty.operation.projectId, empty.operation.id)
    const file = await apply({ kind: 'rename', from: 'src/config.ts', to: 'src/Config.ts' })
    expect(store.getState().project!.tree!['src/Config.ts']).toBeDefined()
    await undoProApplication(store, file.operation.projectId, file.operation.id)
    expect(store.getState().project!.tree).toEqual(original)
    service.dispose()
  })
  it('moves a closed file, updates its consumer and recovers the complete document without an AI job', async () => {
    const { store, service, apply } = fixture()
    const original = store.getState().project!.tree
    const { operation } = await apply({
      kind: 'rename',
      from: 'src/config.ts',
      to: 'src/rules/settings.ts',
    })
    expect(store.getState().project!.tree!['src/main.ts']).toEqual({
      kind: 'file',
      content: 'import { speed } from "./rules/settings"; console.log(speed)',
    })
    expect(store.getState().project!.tree!['src/rules/settings.ts']).toEqual(
      original!['src/config.ts'],
    )
    expect(operation.pathMap).toEqual({ 'src/config.ts': 'src/rules/settings.ts' })
    const record = listProSessionApplications(store, operation.projectId)[0]!.record
    expect(record.source).toBe('editor')
    expect(record.jobId).toBeUndefined()
    await undoProApplication(store, operation.projectId, operation.id)
    expect(store.getState().project!.tree).toEqual(original)
    service.dispose()
  })
  it('updates relative imports inside the file being moved and handles folders', async () => {
    const { store, service, apply } = fixture()
    await apply({ kind: 'rename', from: 'src/main.ts', to: 'src/ui/main.ts' })
    expect(store.getState().project!.tree!['src/ui/main.ts']).toEqual({
      kind: 'file',
      content: 'import { speed } from "../config"; console.log(speed)',
    })
    await apply({ kind: 'rename', from: 'src/ui', to: 'ui' })
    expect(store.getState().project!.tree!['ui/main.ts']).toEqual({
      kind: 'file',
      content: 'import { speed } from "../src/config"; console.log(speed)',
    })
    service.dispose()
  })
  it('renames symbol references without changing comments or string content', async () => {
    const { store, service, apply } = fixture()
    store
      .getState()
      .setProFileContent(
        'src/main.ts',
        'import { speed } from "./config"; console.log(speed, "speed") // speed',
      )
    await apply({ kind: 'symbol', path: 'src/config.ts', offset: 14, name: 'velocity' })
    expect(store.getState().project!.tree!['src/main.ts']).toEqual({
      kind: 'file',
      content: 'import { velocity } from "./config"; console.log(velocity, "speed") // speed',
    })
    expect(service.symbols('src/config.ts').some((symbol) => symbol.name === 'speed')).toBe(true)
    expect(service.references('src/config.ts', 14).length).toBeGreaterThan(1)
    service.dispose()
  })
  it('rejects collisions and observer operations before changing any file', async () => {
    const { store, service, prepare } = fixture()
    const original = store.getState().project
    await expect(
      prepare({ kind: 'rename', from: 'src/main.ts', to: 'src/config.ts' }),
    ).rejects.toThrow('Já existe')
    store.getState().setEditingAccess('observer')
    await expect(prepare({ kind: 'delete', path: 'src' })).rejects.toThrow('observando')
    expect(store.getState().project).toBe(original)
    service.dispose()
  })
  it('rejects stale previews and recovery after later edits, preserving the new work', async () => {
    const { store, service, prepare, apply } = fixture()
    const pending = await prepare({ kind: 'delete', path: 'src/config.ts' })
    store.getState().setProFileContent('src/main.ts', '// new work')
    await expect(
      applyProEditorChange(store, pending.projectId, {
        operationId: pending.id,
        change: pending.change,
      }),
    ).rejects.toThrow()
    expect(store.getState().project!.tree!['src/config.ts']).toBeDefined()
    const { operation } = await apply({ kind: 'delete', path: 'src/config.ts' })
    store.getState().setProFileContent('src/main.ts', '// later work')
    await expect(undoProApplication(store, operation.projectId, operation.id)).rejects.toThrow()
    expect(store.getState().project!.tree!['src/main.ts']).toEqual({
      kind: 'file',
      content: '// later work',
    })
    service.dispose()
  })
  it('reports consumers when deleting and recovers a deleted directory with its files', async () => {
    const { store, service, prepare, apply } = fixture()
    expect((await prepare({ kind: 'delete', path: 'src/config.ts' })).warnings.join(' ')).toContain(
      'src/main.ts',
    )
    const original = store.getState().project!.tree
    const { operation } = await apply({ kind: 'delete', path: 'src' })
    expect(store.getState().project!.tree!.src).toBeUndefined()
    await undoProApplication(store, operation.projectId, operation.id)
    expect(store.getState().project!.tree).toEqual(original)
    service.dispose()
  })
  it('refuses overlapping edits and dependency writes', () => {
    const tree = { 'main.ts': { kind: 'file' as const, content: 'abcdef' } }
    expect(() =>
      applyProTextEdits(tree, [
        { path: 'main.ts', start: 1, length: 3, text: 'a' },
        { path: 'main.ts', start: 2, length: 2, text: 'b' },
      ]),
    ).toThrow()
    expect(() =>
      applyProTextEdits(tree, [{ path: 'node_modules/x.ts', start: 0, length: 0, text: 'x' }]),
    ).toThrow()
    expect(tree['main.ts'].content).toBe('abcdef')
  })
})
