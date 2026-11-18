import { expect, it } from 'bun:test'
import { createEmptyProject } from '#core'
import { createPersistenceService } from '../../persistence/service'
import { createPendingEditorEdits } from '../../state/pendingEditorEdits'
import { createProjectStore } from '../../state/projectStore'
import { createRunPreparation } from './prepareRun'

function fixture() {
  const store = createProjectStore()
  store.getState().hydrateProject(createEmptyProject(crypto.randomUUID(), 'Antes de rodar'))
  const buffers = createPendingEditorEdits()
  let acknowledge = () => {}
  let reject = (_error: Error) => {}
  const confirmation = new Promise<void>((resolve, fail) => {
    acknowledge = resolve
    reject = fail
  })
  const writes: string[] = []
  const errors: string[] = []
  const states: boolean[] = []
  const service = createPersistenceService(
    store,
    {
      load: async () => null,
      save: async (project) => {
        writes.push(project.files?.['script.js'] ?? '')
        await confirmation
      },
    },
    { flushPendingEditorEdits: buffers.flush },
  )
  const gate = createRunPreparation({
    project: () => store.getState().project,
    flush: buffers.flush,
    save: service.save,
    pending: (value) => states.push(value),
    error: (message) => errors.push(message),
  })
  const starts: string[] = []
  const start = () => {
    starts.push(store.getState().project?.files?.['script.js'] ?? '')
  }
  return { store, buffers, gate, writes, errors, states, starts, start, acknowledge, reject }
}

it('materializes the last buffered edit and waits for durable save before running', async () => {
  const f = fixture()
  const unregister = f.buffers.register(() => {
    unregister()
    f.store.getState().setFile('script.js', 'console.log("última edição")')
  })
  const running = f.gate.run(f.start)
  expect(f.writes).toEqual(['console.log("última edição")'])
  expect(f.starts).toEqual([])
  f.acknowledge()
  await running
  expect(f.starts).toEqual(f.writes)
  expect(f.store.getState().isDirty).toBe(false)
  expect(f.states).toEqual([true, false])
})

it('a storage failure keeps the code and dirty state and does not run', async () => {
  const f = fixture()
  f.store.getState().setFile('script.js', 'código preservado')
  const running = f.gate.run(f.start)
  f.reject(new Error('Sem espaço'))
  await running
  expect(f.starts).toEqual([])
  expect(f.errors[0]).toContain('Sem espaço')
  expect(f.store.getState().isDirty).toBe(true)
  expect(f.store.getState().project?.files?.['script.js']).toBe('código preservado')
})

it('Stop cancels run intent without cancelling the save', async () => {
  const f = fixture()
  f.store.getState().setFile('script.js', 'edição antes de parar')
  const running = f.gate.run(f.start)
  f.gate.cancel()
  f.acknowledge()
  await running
  expect(f.starts).toEqual([])
  expect(f.errors).toEqual([])
  expect(f.writes).toEqual(['edição antes de parar'])
  expect(f.store.getState().isDirty).toBe(false)
})

it('a different project cannot be started by an old save', async () => {
  const f = fixture()
  const running = f.gate.run(f.start)
  f.store.getState().hydrateProject(createEmptyProject(crypto.randomUUID(), 'Outro projeto'))
  f.acknowledge()
  await running
  expect(f.starts).toEqual([])
  expect(f.errors).toHaveLength(1)
})

it('edits buffered during saving cannot run as if they were saved', async () => {
  const f = fixture()
  const running = f.gate.run(f.start)
  const unregister = f.buffers.register(() => {
    unregister()
    f.store.getState().setFile('script.js', 'edição durante a gravação')
  })
  f.acknowledge()
  await running
  expect(f.starts).toEqual([])
  expect(f.store.getState().isDirty).toBe(true)
  expect(f.errors[0]).toContain('projeto mudou')
})

it('double clicking does not enqueue another save or another run', async () => {
  const f = fixture()
  const running = f.gate.run(f.start)
  await f.gate.run(f.start)
  expect(f.writes).toHaveLength(1)
  f.acknowledge()
  await running
  expect(f.starts).toHaveLength(1)
})

it('a cancelled attempt cannot clear the pending state of a newer run', async () => {
  const f = fixture()
  const first = f.gate.run(f.start)
  f.gate.cancel()
  const second = f.gate.run(f.start)
  f.acknowledge()
  await Promise.all([first, second])
  expect(f.starts).toHaveLength(1)
  expect(f.states).toEqual([true, false, true, false])
})
