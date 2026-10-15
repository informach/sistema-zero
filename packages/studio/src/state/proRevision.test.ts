import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import {
  applyStudioProChange,
  createStudioProRevision,
  studioProDigest,
} from '@sistemazero/core/studio'
import { createEmptyProject } from '../core/project'
import { registerProjectOperation } from './projectOperations'
import { setProjectStorageNamespace } from './projectStorageRuntime'
import { createProjectStore } from './projectStore'
import { applyProRevision, captureProRevision } from './proRevision'

afterEach(() => setProjectStorageNamespace(''))

async function editable() {
  const store = createProjectStore()
  store.getState().setProject({
    ...createEmptyProject('revision-game', 'Meu jogo'),
    kind: 'pro',
    mode: 'code',
    tree: {
      'main.ts': { kind: 'file', content: 'export const score = 0' },
      empty: { kind: 'dir' },
    },
    proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
  })
  const base = await captureProRevision(store.getState().project!)
  return {
    store,
    change: {
      baseHash: base.hash,
      summary: 'Adicionar HUD',
      patches: [
        {
          path: 'main.ts',
          before: await studioProDigest(base.files['main.ts']!),
          content: 'export const score = 1',
        },
        { path: 'src/hud.ts', before: null, content: 'export const hud = true' },
      ],
    },
  }
}

describe('application to the live Studio store', () => {
  it('applies and undoes as single updates with the exact original layout', async () => {
    const { store, change } = await editable(),
      original = store.getState().project!.tree
    const snapshots: unknown[] = []
    const unsubscribe = store.subscribe((state) => snapshots.push(state.project?.tree))
    try {
      const inverse = await applyProRevision(store, 'revision-game', change)
      expect(snapshots).toHaveLength(1)
      expect(store.getState().project!.tree!['src/hud.ts']).toBeDefined()
      await applyProRevision(store, 'revision-game', inverse)
      expect(snapshots).toHaveLength(2)
      expect(store.getState().project!.tree).toEqual(original)
    } finally {
      unsubscribe()
    }
  })
  it('flushes pending terminal edits and refuses to overwrite them with the old proposal', async () => {
    const { store, change } = await editable()
    const unregister = registerProjectOperation(store, {
      projectId: 'revision-game',
      flush: async () => {
        store.getState().setProFileContent('main.ts', 'export const terminalEdit = true')
      },
    })
    try {
      await expect(applyProRevision(store, 'revision-game', change)).rejects.toThrow()
      expect(store.getState().project!.tree!['main.ts']).toEqual({
        kind: 'file',
        content: 'export const terminalEdit = true',
      })
      expect(store.getState().project!.tree!['src/hud.ts']).toBeUndefined()
    } finally {
      unregister()
    }
  })
  it('rejects a profile A → B → A change during flush even with the same project object', async () => {
    setProjectStorageNamespace('profile-a')
    const { store, change } = await editable(),
      original = store.getState().project
    const unregister = registerProjectOperation(store, {
      projectId: 'revision-game',
      flush: async () => {
        setProjectStorageNamespace('profile-b')
        setProjectStorageNamespace('profile-a')
      },
    })
    try {
      await expect(applyProRevision(store, 'revision-game', change)).rejects.toThrow('mudou')
      expect(store.getState().project).toBe(original)
    } finally {
      unregister()
    }
  })
  it('preserves metadata changed while the revision digest is in flight', async () => {
    const { store, change } = await editable()
    const digest = crypto.subtle.digest.bind(crypto.subtle)
    let resolveEntered = () => {},
      release = () => {}
    const entered = new Promise<void>((resolve) => {
      resolveEntered = resolve
    })
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const hashing = spyOn(crypto.subtle, 'digest').mockImplementation(async (...args) => {
      resolveEntered()
      await gate
      return digest(...args)
    })
    try {
      const applying = applyProRevision(store, 'revision-game', change)
      await entered
      store
        .getState()
        .setProject({ ...store.getState().project!, name: 'Nome editado durante a revisão' })
      release()
      await expect(applying).rejects.toThrow('mudou')
      expect(store.getState().project!.name).toBe('Nome editado durante a revisão')
      expect(store.getState().project!.tree!['src/hud.ts']).toBeUndefined()
    } finally {
      release()
      hashing.mockRestore()
    }
  })
})

const source = () =>
  createStudioProRevision({
    projectId: 'game1',
    templateId: 'vanilla-ts',
    devScript: 'dev',
    directories: ['src', 'empty'],
    files: { 'src/main.ts': 'export const score = 0', 'index.html': '<main>Game</main>' },
    assets: '{"version":1,"assets":[]}',
    assetFiles: {},
  })

describe('isolated Pro revisions', () => {
  it('changes several files atomically and undoes added directories without dropping empty ones', async () => {
    const base = await source()
    const change = {
      baseHash: base.hash,
      summary: 'Adicionar pontuação',
      patches: [
        {
          path: 'src/main.ts',
          before: await studioProDigest(base.files['src/main.ts']!),
          content: 'export const score = 10',
        },
        { path: 'src/ui/hud.ts', before: null, content: 'export const hud = true' },
      ],
    }
    const result = await applyStudioProChange(base, change)
    expect(base.files['src/main.ts']).toBe('export const score = 0')
    expect(result.revision.files['src/ui/hud.ts']).toBeDefined()
    expect((await applyStudioProChange(result.revision, result.inverse)).revision).toEqual(base)
  })

  it('rejects stale, forged, duplicate and traversal changes without mutating any file', async () => {
    const base = await source()
    for (const patches of [
      [{ path: 'index.html', before: null, content: 'bad' }],
      [{ path: '../index.html', before: null, content: 'bad' }],
      [{ path: 'SRC/a.ts', before: null, content: 'bad' }],
      [
        { path: 'src/a.ts', before: null, content: 'ok' },
        { path: 'src/A.ts', before: null, content: 'bad' },
      ],
      [{ path: 'public/studio-assets/manifest.json', before: null, content: '{}' }],
    ])
      await expect(
        applyStudioProChange(base, { baseHash: base.hash, summary: 'change', patches }),
      ).rejects.toThrow()
    await expect(
      applyStudioProChange(
        { ...base, files: { ...base.files, 'index.html': 'forged' } },
        {
          baseHash: base.hash,
          summary: 'change',
          patches: [{ path: 'new.ts', before: null, content: '' }],
        },
      ),
    ).rejects.toThrow()
    expect(Object.keys(base.files)).toHaveLength(2)
  })

  it('includes assets, settings and empty directories in the revision identity; order is irrelevant', async () => {
    const base = await source()
    expect(
      (
        await createStudioProRevision({
          ...base,
          files: Object.fromEntries(Object.entries(base.files).reverse()),
          directories: [...base.directories].reverse(),
        })
      ).hash,
    ).toBe(base.hash)
    expect(
      (await createStudioProRevision({ ...base, assets: '{"version":1,"assets":[{}]}' })).hash,
    ).not.toBe(base.hash)
    expect((await createStudioProRevision({ ...base, devScript: 'start' })).hash).not.toBe(
      base.hash,
    )
    expect((await createStudioProRevision({ ...base, directories: ['src'] })).hash).not.toBe(
      base.hash,
    )
  })
})
