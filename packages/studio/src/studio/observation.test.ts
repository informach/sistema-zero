import { describe, expect, test } from 'bun:test'
import { createEmptyProject } from '#core'
import { createPersistenceService, setAutosaveDelayForTests } from '../persistence/service'
import { createProjectStore } from '../state/projectStore'

describe('Studio observation boundary', () => {
  test('late editor mutations cannot replace an observed snapshot', () => {
    const store = createProjectStore()
    const project = createEmptyProject('01ARZ3NDEKTSV4RRFFQ69G5FAV', 'Autoria da criança')
    store.getState().hydrateProject(project)
    store.getState().setEditingAccess('observer')
    store.getState().setFile('script.js', 'throw new Error("late edit")')
    expect(store.getState().project).toBe(project)
    expect(store.getState().isDirty).toBe(false)
    const observed = { ...project, name: 'Revisão confirmada' }
    store.getState().hydrateProject(observed)
    expect(store.getState().project).toBe(observed)
    expect(store.getState().isDirty).toBe(false)
    store.getState().setEditingAccess('author')
    store.getState().setFile('script.js', 'console.log("back")')
    expect(store.getState().project?.files?.['script.js']).toBe('console.log("back")')
  })
  test('suspension cancels debounce and suppresses unmount writes', async () => {
    setAutosaveDelayForTests(10)
    try {
      const store = createProjectStore()
      const service = createPersistenceService(store, null)
      const changes: string[] = []
      service.handlers.onChange = (project) => {
        changes.push(project.files?.['script.js'] ?? '')
      }
      const detach = service.attach()
      store.getState().hydrateProject(createEmptyProject('01ARZ3NDEKTSV4RRFFQ69G5FAW', 'Teste'))
      store.getState().setFile('script.js', 'pending')
      service.suspend()
      await Bun.sleep(40)
      await expect(service.save()).rejects.toThrow('observação')
      detach()
      expect(changes).toEqual([])
      service.resume()
      await service.save()
      expect(changes).toEqual(['pending'])
    } finally {
      setAutosaveDelayForTests(null)
    }
  })
})
