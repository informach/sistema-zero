import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { fakeUseStore, resetFakeIdb } from '../../../testing/fakeIdbStore'

// Only the IndexedDB boundary is replaced. Reconciliation and the project store are real.
const databases = new Map<string, Map<IDBValidKey, unknown>>()
const kv = (store?: { name?: string }) => {
  const name = store?.name ?? ''
  if (!databases.has(name)) databases.set(name, new Map())
  return databases.get(name)!
}
let hold: { started: () => void; finished: Promise<void> } | undefined
let releaseHeld = () => {}
mock.module('idb-keyval', () => ({
  createStore: (name: string) => fakeUseStore(name),
  get: async (key: IDBValidKey, store?: { name?: string }) => kv(store).get(key),
  getMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    const values = keys.map((key) => kv(store).get(key))
    if (
      hold &&
      store?.name?.startsWith('sistema-zero-personal-assets-') &&
      keys.includes('asset:d1')
    ) {
      const waiting = hold
      hold = undefined
      waiting.started()
      await waiting.finished
    }
    return values
  },
  keys: async (store?: { name?: string }) => [...kv(store).keys()],
  set: async (key: IDBValidKey, value: unknown, store?: { name?: string }) => {
    kv(store).set(key, value)
  },
  setMany: async (pairs: [IDBValidKey, unknown][], store?: { name?: string }) => {
    for (const [key, value] of pairs) kv(store).set(key, value)
  },
  del: async (key: IDBValidKey, store?: { name?: string }) => {
    kv(store).delete(key)
  },
  delMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    for (const key of keys) kv(store).delete(key)
  },
  update: async (
    key: IDBValidKey,
    update: (value: unknown) => unknown,
    store?: { name?: string },
  ) => {
    kv(store).set(key, update(kv(store).get(key)))
  },
}))

const { createEmptyProject } = await import('#core')
const { javaScriptProject } = await import('../../../core/editableProject')
const { savePersonalAsset, setPersonalAssetsNamespace } = await import(
  '../../../asset-library/personal'
)
const { setStorageNamespace } = await import('../../../state/persistence')
const { useProjectStore } = await import('../../../state/projectStore')
const { DrawingSyncWatcher } = await import('../DrawingSyncWatcher')
const PNG = ['AAAA', 'BBBB', 'CCCC', 'DDDD'].map((value) => `data:image/png;base64,${value}`)
let namespace = ''
let sequence = 0
let idle: Array<() => void> = []
let clock = 0
const idleDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'requestIdleCallback')

beforeEach(() => {
  resetFakeIdb()
  databases.clear()
  localStorage.clear()
  namespace = `drawing-watcher-${++sequence}`
  setStorageNamespace(namespace)
  setPersonalAssetsNamespace(namespace)
  clock = Date.now()
  idle = []
  Object.defineProperty(globalThis, 'requestIdleCallback', {
    configurable: true,
    value: (callback: IdleRequestCallback) => {
      idle.push(() => callback({ didTimeout: false, timeRemaining: () => 50 }))
      return idle.length
    },
  })
  const project = createEmptyProject('watcher-game', 'Jogo do observador')
  project.files['script.js'] += '\nlet minhaRegra = 7;\n'
  project.assets = [
    {
      id: 'a1',
      name: 'heroi',
      kind: 'image',
      source: 'library',
      libId: 'personal:d1',
      dataUrl: PNG[0]!,
    },
  ]
  useProjectStore.setState({ project, isDirty: false, saveError: null })
  useProjectStore.getState().setEditingAccess('author')
})

afterEach(() => {
  cleanup()
  releaseHeld()
  releaseHeld = () => {}
  hold = undefined
  if (idleDescriptor) Object.defineProperty(globalThis, 'requestIdleCallback', idleDescriptor)
  else Reflect.deleteProperty(globalThis, 'requestIdleCallback')
  setStorageNamespace('')
  setPersonalAssetsNamespace('')
  useProjectStore.setState({ project: null })
})

const pixels = () => useProjectStore.getState().project?.assets?.[0]?.dataUrl
const program = () => {
  const project = javaScriptProject(useProjectStore.getState().project)
  return JSON.stringify({ files: project?.files, ir: project?.ir })
}
async function save(index: number) {
  const now = spyOn(Date, 'now').mockReturnValue(++clock)
  try {
    expect(
      (await savePersonalAsset({ id: 'd1', name: 'heroi', kind: 'image', dataUrl: PNG[index]! }))
        .ok,
    ).toBe(true)
  } finally {
    now.mockRestore()
  }
}
function signal(profile = namespace, storage = localStorage) {
  window.dispatchEvent(
    new StorageEvent('storage', { key: `sz:desenhos-alterados:${profile}`, storageArea: storage }),
  )
}
async function flushIdle() {
  await act(async () => {
    for (const run of idle.splice(0)) run()
  })
}
async function mount() {
  await save(1)
  const view = render(<DrawingSyncWatcher />)
  await flushIdle()
  await waitFor(() => expect(pixels()).toBe(PNG[1]))
  return view
}

function holdNextDrawingRead() {
  let started!: () => void
  const reading = new Promise<void>((resolve) => {
    started = resolve
  })
  const finished = new Promise<void>((resolve) => {
    releaseHeld = resolve
  })
  hold = { started, finished }
  return { reading, release: () => releaseHeld() }
}

test('um commit depois do foco atualiza o desenho e conserva o programa', async () => {
  await mount()
  const before = program()
  await save(2)
  signal()
  await flushIdle()
  await waitFor(() => expect(pixels()).toBe(PNG[2]))
  expect(program()).toBe(before)
})

test('eventos de outro perfil, sessionStorage e depois da desmontagem não escrevem no jogo', async () => {
  const view = await mount()
  await save(2)
  signal('outra-pessoa')
  signal(namespace, sessionStorage)
  await flushIdle()
  expect(pixels()).toBe(PNG[1])
  view.unmount()
  signal()
  await flushIdle()
  expect(pixels()).toBe(PNG[1])
})

test('um segundo commit durante a leitura é reconciliado depois dela sem outro foco', async () => {
  await mount()
  const before = program()
  await save(2)
  const waiting = holdNextDrawingRead()
  signal()
  await flushIdle()
  await waiting.reading
  await save(3)
  signal()
  waiting.release()
  await waitFor(() => expect(pixels()).toBe(PNG[3]))
  expect(program()).toBe(before)
})

test('desmontar durante uma leitura impede que ela altere o projeto depois', async () => {
  const view = await mount()
  const before = program()
  await save(2)
  const waiting = holdNextDrawingRead()
  signal()
  await flushIdle()
  await waiting.reading
  view.unmount()
  await act(async () => {
    waiting.release()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  expect(pixels()).toBe(PNG[1])
  expect(program()).toBe(before)
})

test('troca de perfil antes do idle não aplica a biblioteca nova ao projeto anterior', async () => {
  await mount()
  const before = program()
  await save(2)
  signal()
  setStorageNamespace('outro-perfil-antes-do-idle')
  setPersonalAssetsNamespace('outro-perfil-antes-do-idle')
  await save(3)
  await flushIdle()
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  expect(pixels()).toBe(PNG[1])
  expect(program()).toBe(before)
})

test('voltar ao perfil não reativa o observador da sessão anterior', async () => {
  await mount()
  const before = program()
  await save(2)
  signal()
  setStorageNamespace('outro-perfil-intermediario')
  setPersonalAssetsNamespace('outro-perfil-intermediario')
  setStorageNamespace(namespace)
  setPersonalAssetsNamespace(namespace)
  await flushIdle()
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  expect(pixels()).toBe(PNG[1])
  expect(program()).toBe(before)
})
