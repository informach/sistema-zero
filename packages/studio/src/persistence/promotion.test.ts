import { describe, expect, it } from 'bun:test'
import { createEmptyProject } from '#core'
import type { EditableStudioProject as Project } from '../core/editableProject'
import { createProjectStore } from '../state/projectStore'
import { createPersistenceService } from './service'

describe('promotion durability', () => {
  it('saves the original copy before persisting the Pro version', async () => {
    const store = createProjectStore()
    const source = createEmptyProject(crypto.randomUUID(), 'Original')
    store.setState({ project: source })
    const saved: Project[] = []
    const service = createPersistenceService(store, {
      load: async () => null,
      save: async (project) => {
        saved.push(project)
      },
    })
    await service.promoteToPro()
    expect(saved.map((project) => project.kind ?? 'classic')).toEqual(['classic', 'classic', 'pro'])
    expect(saved[1]!.id).not.toBe(source.id)
    expect(saved[1]!.blocksState).toEqual(source.blocksState)
    expect(saved[2]!.proMeta?.origin?.projectId).toBe(saved[1]!.id)
    expect(store.getState().isDirty).toBe(false)
  })

  it('a backup write failure leaves the original active and prevents a Pro save', async () => {
    const store = createProjectStore()
    const source = createEmptyProject(crypto.randomUUID(), 'Original')
    store.setState({ project: source })
    const saved: Project[] = []
    const service = createPersistenceService(store, {
      load: async () => null,
      save: async (project) => {
        if (project.id !== source.id) throw new Error('storage quota')
        saved.push(project)
      },
    })
    await expect(service.promoteToPro()).rejects.toThrow('storage quota')
    expect(store.getState().project).toBe(source)
    expect(saved).toHaveLength(1)
  })

  it('switching projects during save cannot promote the newly opened document', async () => {
    const store = createProjectStore()
    const source = createEmptyProject(crypto.randomUUID(), 'Original')
    const other = createEmptyProject(crypto.randomUUID(), 'Outro')
    store.setState({ project: source })
    const service = createPersistenceService(store, {
      load: async () => null,
      save: async () => {
        store.setState({ project: other })
      },
    })
    await expect(service.promoteToPro()).rejects.toThrow('mudou')
    expect(store.getState().project).toBe(other)
    expect(other.kind).not.toBe('pro')
  })
})
