import 'blockly/blocks'
import { afterAll, beforeAll, expect, spyOn, test } from 'bun:test'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { registerExtensionBlocks } from '../blockly/blocks'
import { ensureBlocklyInitialized } from '../blockly/setup'
import { admitRegionalProjectAssets } from '../core/pintaRegionalProjectAdmission'
import { buildProFileMap } from '../export/fileMap'
import { gameTwoDBlocks } from '../official-extensions/game-2d/blocks'
import { loadProjectById, persistProject } from '../state/persistence'
import { listAllProjects } from '../state/projectListStorage'
import {
  captureProjectStorageScope,
  getProjectStorageScope,
  setProjectStorageNamespace,
} from '../state/projectStorageRuntime'
import { loadSanitizedProjectById, useProjectStore } from '../state/projectStore'
import {
  installPngImageBitmap,
  projectedSceneMaterial,
  regionalSceneMaterial,
} from '../testing/pintaRegionalMaterialFixture'
import { buildTilemapGameProject } from './tilemapGame'

for (const projection of ['hexagonal', 'isometric'] as const) {
  test(`Jogar → Pro preserva o caminho sem extensão e reabre ${projection} no perfil`, async () => {
    const material = await projectedSceneMaterial(projection)
    const name = `meu-mapa-${projection}`
    const scope = getProjectStorageScope(`convert-projected-${crypto.randomUUID()}`)
    const source = await buildTilemapGameProject(
      { ...material, name, id: material.regional.sourceId },
      { namespace: scope.namespace },
    )
    if (!source) throw new Error('O jogo do mapa não foi criado.')
    useProjectStore.setState({ project: source, editingAccess: 'author', isDirty: false })
    try {
      await useProjectStore
        .getState()
        .convertToPro((original) => persistProject(original, {}, scope))
      const converted = useProjectStore.getState().project
      if (!converted || converted.programmingLanguage === 'python')
        throw new Error('Conversão JavaScript ausente.')
      expect(converted.kind).toBe('pro')
      expect(converted.assets?.[0]?.proPath).toBe(`public/${name}`)
      await persistProject(converted, {}, scope)
      const reopened = await loadSanitizedProjectById(
        source.id,
        getProjectStorageScope(scope.namespace),
      )
      expect(reopened?.assets).toEqual(converted.assets)
      expect(reopened?.assets?.[0]?.dataUrl).toBe(material.dataUrl)
      for (const proPath of ['public/script.js', 'public/../fora', 'public/.oculto']) {
        await expect(
          admitRegionalProjectAssets(converted.assets?.map((asset) => ({ ...asset, proPath }))),
        ).rejects.toThrow()
      }
      const { files } = await buildProFileMap(converted)
      expect(files[`public/${name}`]).toBeInstanceOf(Uint8Array)
      expect(files['public/sz-assets.js']).toBeInstanceOf(Uint8Array)
    } finally {
      useProjectStore.setState({ project: null, isDirty: false })
    }
  })

  test(`o botão Jogar cria e reabre um projeto ${projection} com o PNG 6 original`, async () => {
    const material = await projectedSceneMaterial(projection)
    const namespace = `game-projected-${crypto.randomUUID()}`
    const project = await buildTilemapGameProject(
      { ...material, id: material.regional.sourceId },
      { namespace },
    )
    expect(project).not.toBeNull()
    expect(project?.assets?.[0]?.regional?.dataVersion).toBe(6)
    expect(project?.assets?.[0]?.dataUrl).toBe(material.dataUrl)
    const reopened = await loadSanitizedProjectById(project!.id, getProjectStorageScope(namespace))
    expect(reopened?.assets?.[0]?.dataUrl).toBe(material.dataUrl)
    expect(reopened?.assets?.[0]?.regional).toEqual(material.regional)
  })
}

const originals = ['indexedDB', 'IDBKeyRange'].map(
  (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
)
let restoreBitmap: () => void
beforeAll(() => {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
  Object.defineProperty(globalThis, 'IDBKeyRange', { value: IDBKeyRange, configurable: true })
  restoreBitmap = installPngImageBitmap()
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})
afterAll(() => {
  restoreBitmap()
  setProjectStorageNamespace('')
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else Reflect.deleteProperty(globalThis, name)
  }
})

function pauseDigest() {
  const digest = crypto.subtle.digest.bind(crypto.subtle)
  let enter!: () => void
  let resume!: () => void
  const entered = new Promise<void>((done) => {
    enter = done
  })
  const paused = new Promise<void>((done) => {
    resume = done
  })
  const gate = spyOn(crypto.subtle, 'digest').mockImplementation(async (algorithm, data) => {
    enter()
    await paused
    return digest(algorithm, data)
  })
  return { entered, resume, restore: () => gate.mockRestore() }
}

test('regional game creation keeps its original profile while PNG admission is pending', async () => {
  const material = await regionalSceneMaterial()
  const payload = { ...material, id: material.regional.sourceId }
  const origin = `game-origin-${crypto.randomUUID()}`
  const next = `game-next-${crypto.randomUUID()}`
  setProjectStorageNamespace(origin)
  const gate = pauseDigest()
  try {
    const pending = buildTilemapGameProject(payload)
    await gate.entered
    setProjectStorageNamespace(next)
    gate.resume()
    const project = await pending
    expect(project).not.toBeNull()
    expect(Boolean(await loadProjectById(project!.id, getProjectStorageScope(next)))).toBe(false)
    const saved = await loadSanitizedProjectById(project!.id, getProjectStorageScope(origin))
    expect(saved?.assets?.[0]?.regional?.sha256).toBe(material.regional.sha256)
  } finally {
    gate.resume()
    gate.restore()
    setProjectStorageNamespace('')
  }
})

test('the host can create in its captured namespace without changing the active profile', async () => {
  const material = await regionalSceneMaterial()
  const origin = `game-explicit-${crypto.randomUUID()}`
  const current = `game-active-${crypto.randomUUID()}`
  setProjectStorageNamespace(current)
  try {
    const project = await buildTilemapGameProject(
      { ...material, id: material.regional.sourceId },
      { namespace: origin },
    )
    expect(project).not.toBeNull()
    expect(Boolean(await loadProjectById(project!.id, getProjectStorageScope(current)))).toBe(false)
    expect(Boolean(await loadProjectById(project!.id, getProjectStorageScope(origin)))).toBe(true)
    expect(captureProjectStorageScope().namespace).toBe(current)
  } finally {
    setProjectStorageNamespace('')
  }
})

test('retiring the host during A→B→A creates no game in either profile', async () => {
  const material = await regionalSceneMaterial()
  const origin = `game-retired-${crypto.randomUUID()}`
  const next = `game-other-${crypto.randomUUID()}`
  const owner = new AbortController()
  setProjectStorageNamespace(origin)
  const gate = pauseDigest()
  try {
    const pending = buildTilemapGameProject(
      { ...material, id: material.regional.sourceId },
      { namespace: origin, signal: owner.signal },
    ).then(
      () => 'created',
      (error: Error) => error.name,
    )
    await gate.entered
    setProjectStorageNamespace(next)
    owner.abort()
    setProjectStorageNamespace(origin)
    gate.resume()
    expect(await pending).toBe('AbortError')
    expect((await listAllProjects(getProjectStorageScope(origin))).length).toBe(0)
    expect((await listAllProjects(getProjectStorageScope(next))).length).toBe(0)
  } finally {
    gate.resume()
    gate.restore()
    setProjectStorageNamespace('')
  }
})
