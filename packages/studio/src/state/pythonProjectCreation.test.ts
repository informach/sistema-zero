import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { pythonEnvironmentFixture } from './fixtures/pythonEnvironment'
import { listAllProjects } from './persistence'
import { captureProjectStorageScope, setProjectStorageNamespace } from './projectStorageRuntime'
import { createProjectStore, loadSanitizedProjectById } from './projectStore'

test('free Python creation persists a new native document with Programação and no installed extensions', async () => {
  const oldIdb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  const oldScope = captureProjectStorageScope()
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
  setProjectStorageNamespace(`python-create-${crypto.randomUUID()}`)
  try {
    const fixture = await pythonEnvironmentFixture('classic')
    const context = {
      catalog: fixture.environment.catalog,
      runtime: fixture.project.runtime,
      releaseStatus: 'active' as const,
    }
    const store = createProjectStore()
    for (const kind of ['classic', 'pro'] as const) {
      const project = await store
        .getState()
        .createPythonProject('Meu Python', kind, context, { isCurrent: () => true })
      expect(project.programmingLanguage).toBe('python')
      expect(project.kind).toBe(kind)
      expect(project.installedExtensions).toEqual([])
      expect(project.id).not.toBe(fixture.project.id)
      expect(await loadSanitizedProjectById(project.id)).toMatchObject({
        id: project.id,
        programmingLanguage: 'python',
        kind,
        runtime: context.runtime,
      })
    }
    expect((await listAllProjects()).length).toBe(2)
    expect(store.getState().project).toBeNull()
  } finally {
    setProjectStorageNamespace(oldScope.namespace)
    if (oldIdb) Object.defineProperty(globalThis, 'indexedDB', oldIdb)
    else Reflect.deleteProperty(globalThis, 'indexedDB')
  }
})

test('cancelled or changed creation scope cannot persist Python under a different profile', async () => {
  const oldIdb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  const oldScope = captureProjectStorageScope()
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
  const namespace = `python-create-${crypto.randomUUID()}`
  setProjectStorageNamespace(namespace)
  try {
    const fixture = await pythonEnvironmentFixture('classic')
    const context = {
      catalog: fixture.environment.catalog,
      runtime: fixture.project.runtime,
      releaseStatus: 'active' as const,
    }
    const store = createProjectStore()
    await expect(
      store
        .getState()
        .createPythonProject('Cancelado', 'classic', context, { isCurrent: () => false }),
    ).rejects.toThrow()
    let checks = 0
    await expect(
      store.getState().createPythonProject('Outro perfil', 'classic', context, {
        isCurrent: () => {
          if (++checks === 2) {
            setProjectStorageNamespace(`${namespace}-b`)
            setProjectStorageNamespace(namespace)
          }
          return true
        },
      }),
    ).rejects.toThrow()
    expect(await listAllProjects()).toEqual([])
    setProjectStorageNamespace(`${namespace}-b`)
    expect(await listAllProjects()).toEqual([])
  } finally {
    setProjectStorageNamespace(oldScope.namespace)
    if (oldIdb) Object.defineProperty(globalThis, 'indexedDB', oldIdb)
    else Reflect.deleteProperty(globalThis, 'indexedDB')
  }
})
