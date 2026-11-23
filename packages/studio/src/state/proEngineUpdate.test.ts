import { afterEach, expect, test } from 'bun:test'
import { studioProDigest } from '@sistemazero/core/studio/pro-revision'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject, type Project, type ProjectAsset } from '../core/project'
import { proRegionalEngineCopy } from '../modes/pro/pintaRegionalProRuntime'
import {
  currentProEngineCopies,
  type ProEngineExtensionId,
  type ProEngineInventory,
  type ProEngineVariant,
  proEngineCopyPath,
  proEngineUpdatePlan,
} from '../modes/pro/proEngineCopies'
import { convertClassicToProTree } from './convertToPro'
import { persistProject } from './persistence'
import {
  PRO_ENGINE_UPDATE_LABEL,
  PRO_ENGINE_UPDATE_SAVE_FAILED,
  updateProEngineCopies,
} from './proEngineUpdate'
import { setProHistoryRecorder } from './proHistoryRecorder'
import { registerProjectPersistence } from './projectOperations'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { createProjectStore, loadSanitizedProjectById } from './projectStore'

const stores: ReturnType<typeof createProjectStore>[] = []
afterEach(() => {
  for (const store of stores.splice(0)) setProHistoryRecorder(store, null)
})

function database(): ProjectStorageScope {
  const identity = `pro-engine-${crypto.randomUUID()}`
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(identity, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return {
    identity,
    namespace: '',
    store: async (mode, callback) =>
      callback((await opening).transaction('kv', mode).objectStore('kv')),
  }
}

const image: ProjectAsset = {
  id: 'heroi',
  name: 'heroi',
  kind: 'image',
  source: 'upload',
  proPath: 'public/heroi.png',
  width: 1,
  height: 1,
  dataUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
}
const blocksState = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: 'sz_js_console_log_text',
        id: 'bloco-da-crianca',
        x: 10,
        y: 20,
        fields: { VALUE: 'oi' },
      },
    ],
  },
}

/** Um motor "antigo": o texto de agora com outra assinatura, reconhecido só pelo inventário dado. */
async function olderEngine(id: ProEngineExtensionId, variant: ProEngineVariant) {
  const content = `/* motor publicado antes */\n${(await currentProEngineCopies(id))[variant]}`
  const digest = await studioProDigest(content)
  const hashes = (wanted: ProEngineVariant) => (wanted === variant ? [digest] : [])
  const listed = { completo: hashes('completo'), 'sem-cenario-pinta': hashes('sem-cenario-pinta') }
  const none = { completo: [], 'sem-cenario-pinta': [] }
  const known: ProEngineInventory = {
    'game-2d': id === 'game-2d' ? listed : none,
    'game-2d-advanced': id === 'game-2d-advanced' ? listed : none,
  }
  return { content, known }
}

/** Um jogo 2D convertido para o Pro, gravado no IndexedDB e aberto num editor com persistência local. */
async function openConvertedPro(id: ProEngineExtensionId, engine: (current: string) => string) {
  const scope = database()
  const classic: Project = {
    ...createEmptyProject(`convertido-${id}`, 'Meu jogo'),
    assets: [image],
    blocksState,
    installedExtensions: [{ id, version: '2.0.0', installedAt: 1 }],
    files: {
      'index.html': '<canvas id="jogo"></canvas>',
      'style.css': 'body{margin:0}',
      'script.js': 'window.PROGRAMA_DA_CRIANCA = "continua";',
    },
  }
  const tree = await convertClassicToProTree(classic)
  const path = proEngineCopyPath(id)
  const node = tree[path]
  if (node?.kind !== 'file') throw new Error('A conversão não escreveu o motor.')
  const project: Project = {
    ...classic,
    kind: 'pro',
    mode: 'code',
    tree: { ...tree, [path]: { kind: 'file', content: engine(node.content) } },
    proMeta: {
      templateId: 'vanilla-vite',
      devScript: 'dev',
      origin: { projectId: classic.id, revision: 0 },
    },
  }
  await persistProject(project, {}, scope)
  const store = createProjectStore()
  stores.push(store)
  const opened = await loadSanitizedProjectById(project.id, scope)
  if (!opened) throw new Error('O projeto convertido não reabriu.')
  store.getState().hydrateProject(opened)
  let failure: Error | null = null
  registerProjectPersistence(store, {
    localScope: scope,
    scopeIdentity: scope.identity,
    load: (id) => loadSanitizedProjectById(id, scope),
    save: async (next) => {
      if (failure) throw failure
      await persistProject(next, {}, scope)
    },
  })
  const history: Array<{ tree: unknown; trigger: string; label?: string }> = []
  setProHistoryRecorder(store, (before, trigger, info) =>
    history.push({ tree: before, trigger, label: info.label }),
  )
  return {
    scope,
    store,
    path,
    history,
    original: store.getState().project!,
    stored: () => loadSanitizedProjectById(project.id, scope),
    failSaves(error: Error) {
      failure = error
    },
  }
}

const withoutEngine = (tree: Record<string, unknown> | undefined, path: string) => {
  const { [path]: _engine, ...rest } = tree ?? {}
  return rest
}

for (const [id, variant] of [
  ['game-2d', 'sem-cenario-pinta'],
  ['game-2d-advanced', 'completo'],
] as const) {
  test(`${id}: uma cópia antiga intacta (${variant}) recebe o motor de agora e o resto do projeto fica igual`, async () => {
    const older = await olderEngine(id, variant)
    const opened = await openConvertedPro(id, () => older.content)
    const { store, path, original, history } = opened
    expect(await proRegionalEngineCopy(original.tree, id)).toBe('changed')
    expect(await proEngineUpdatePlan(original.tree)).toBeNull()
    const plan = await proEngineUpdatePlan(original.tree, older.known)
    expect(plan).toEqual([
      {
        path,
        extensionId: id,
        variant,
        before: older.content,
        content: (await currentProEngineCopies(id))[variant],
      },
    ])
    const published: string[] = []
    expect(
      await updateProEngineCopies(store, {
        known: older.known,
        onPublish: (tree) => {
          const node = tree[path]
          published.push(node?.kind === 'file' ? node.content : '')
        },
      }),
    ).toBe(true)
    const updated = store.getState().project!
    const engine = (await currentProEngineCopies(id))[variant]
    expect(updated.tree?.[path]).toEqual({ kind: 'file', content: engine })
    expect(published).toEqual([engine])
    expect(withoutEngine(updated.tree, path)).toEqual(withoutEngine(original.tree, path))
    for (const key of [
      'files',
      'assets',
      'blocksState',
      'installedExtensions',
      'proMeta',
      'extraFiles',
      'name',
    ] as const)
      expect(updated[key]).toEqual(original[key])
    expect(store.getState().isDirty).toBe(false)
    // Uma única versão no Histórico do projeto: a árvore de antes, com o nome da troca.
    expect(history).toEqual([
      { tree: original.tree, trigger: 'operation', label: PRO_ENGINE_UPDATE_LABEL },
    ])
    const stored = await opened.stored()
    expect(stored?.tree).toEqual(updated.tree)
    expect(stored?.blocksState).toEqual(original.blocksState)
    expect(stored?.assets).toEqual(original.assets)
    expect(stored?.files).toEqual(original.files)
    // Depois da troca o cenário regional reconhece o motor, e não há mais nada a oferecer.
    expect(await proRegionalEngineCopy(updated.tree, id)).toBe('current')
    expect(await proEngineUpdatePlan(updated.tree, older.known)).toBeNull()
    expect(await updateProEngineCopies(store, { known: older.known })).toBe(false)
    expect(history).toHaveLength(1)
  })
}

test('uma cópia editada pela criança não é oferecida nem trocada, nem junto de outra intacta', async () => {
  const older = await olderEngine('game-2d', 'sem-cenario-pinta')
  const edited = await openConvertedPro('game-2d', (current) => `${current}\n// meu ajuste`)
  expect(await proEngineUpdatePlan(edited.original.tree, older.known)).toBeNull()
  expect(await updateProEngineCopies(edited.store, { known: older.known })).toBe(false)
  expect(edited.store.getState().project).toBe(edited.original)
  expect((await edited.stored())?.tree).toEqual(edited.original.tree)
  expect(edited.history).toEqual([])

  // Dois motores no projeto: um intacto e antigo, outro editado. Nada é trocado.
  const both = await openConvertedPro('game-2d', () => older.content)
  const kit = proEngineCopyPath('game-2d-advanced')
  const tree = {
    ...both.original.tree,
    [kit]: {
      kind: 'file' as const,
      content: `${(await currentProEngineCopies('game-2d-advanced')).completo}\n// meu ajuste`,
    },
  }
  expect(await proEngineUpdatePlan(tree, older.known)).toBeNull()
  // Um caminho do motor que virou pasta também não é uma cópia que o Estúdio escreveu.
  expect(
    await proEngineUpdatePlan(
      { ...both.original.tree, [kit]: { kind: 'dir' as const } },
      older.known,
    ),
  ).toBeNull()
})

test('se a gravação falha, o projeto fica como estava: no editor, no disco e no Histórico', async () => {
  const older = await olderEngine('game-2d', 'sem-cenario-pinta')
  const opened = await openConvertedPro('game-2d', () => older.content)
  const { store, path, original, history } = opened
  opened.failSaves(new DOMException('Quota injetada na gravação.', 'QuotaExceededError'))
  const published: string[] = []
  await expect(
    updateProEngineCopies(store, {
      known: older.known,
      onPublish: (tree) => {
        const node = tree[path]
        published.push(node?.kind === 'file' ? node.content : '')
      },
    }),
  ).rejects.toThrow(PRO_ENGINE_UPDATE_SAVE_FAILED)
  const live = store.getState().project!
  expect(live.tree).toEqual(original.tree)
  for (const key of ['files', 'assets', 'blocksState', 'installedExtensions', 'proMeta'] as const)
    expect(live[key]).toEqual(original[key])
  // O editor mostrou o motor novo e voltou ao antigo.
  expect(published).toEqual([
    (await currentProEngineCopies('game-2d'))['sem-cenario-pinta'],
    older.content,
  ])
  expect((await opened.stored())?.tree).toEqual(original.tree)
  expect(history).toEqual([])
  // A oferta continua: a criança pode tentar de novo quando o aparelho voltar a gravar.
  expect(await proEngineUpdatePlan(live.tree, older.known)).not.toBeNull()
})

test('com o motor de agora, o observador ou um projeto sem motor, não há nada a trocar', async () => {
  const current = await openConvertedPro('game-2d', (engine) => engine)
  const older = await olderEngine('game-2d', 'sem-cenario-pinta')
  expect(await proEngineUpdatePlan(current.original.tree, older.known)).toBeNull()
  expect(await updateProEngineCopies(current.store, { known: older.known })).toBe(false)
  expect(current.store.getState().project).toBe(current.original)
  expect(current.history).toEqual([])

  const observed = await openConvertedPro('game-2d', () => older.content)
  observed.store.getState().setEditingAccess('observer')
  await expect(updateProEngineCopies(observed.store, { known: older.known })).rejects.toThrow(
    'observação',
  )
  expect(observed.store.getState().project).toBe(observed.original)

  expect(await proEngineUpdatePlan({ 'index.html': { kind: 'file', content: '' } })).toBeNull()
})
