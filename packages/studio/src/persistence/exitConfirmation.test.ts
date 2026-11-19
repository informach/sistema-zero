import { expect, test } from 'bun:test'
import { createEmptyProject } from '../core/project'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import { createProjectStore } from '../state/projectStore'
import { createPersistenceService } from './service'

for (const recoverable of [false, true]) {
  test(`beforeunload requests native confirmation only without a confirmed exit copy: ${recoverable}`, () => {
    const store = createProjectStore()
    const project = createEmptyProject(crypto.randomUUID(), 'Alterações não confirmadas')
    store.getState().setProject(project)
    const scope: ProjectStorageScope = {
      namespace: '',
      identity: `exit-prompt-${crypto.randomUUID()}`,
      store: () => Promise.reject(new Error('No native write expected in service contract test')),
    }
    const service = createPersistenceService(store, {
      localScope: scope,
      scopeIdentity: scope.identity,
      load: async () => null,
      save: async () => {},
      flushOnExit: async () => {},
      exitRecoveryStatus: () => ({
        recoverable,
        error: 'A cópia de recuperação não coube. Salve antes de fechar.',
      }),
    })
    const detach = service.attach()
    try {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(!recoverable)
      expect(store.getState().project).toBe(project)
      expect(store.getState().isDirty).toBe(true)
      if (!recoverable) expect(store.getState().saveError).toContain('não coube')
    } finally {
      detach()
    }
  })
}

test('an external adapter retains its existing exit contract', () => {
  const store = createProjectStore()
  store.getState().setProject(createEmptyProject(crypto.randomUUID(), 'Host externo'))
  const service = createPersistenceService(store, {
    load: async () => null,
    save: async () => {},
    flushOnExit: async () => {},
  })
  const detach = service.attach()
  try {
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(store.getState().isDirty).toBe(true)
  } finally {
    detach()
  }
})
