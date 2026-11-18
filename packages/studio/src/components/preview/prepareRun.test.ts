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
    dirty: () => store.getState().isDirty,
    waitMs: 60,
  })
  const starts: string[] = []
  const start = () => {
    starts.push(store.getState().project?.files?.['script.js'] ?? '')
  }
  return { store, buffers, gate, writes, states, starts, start, acknowledge, reject }
}

it('projeto sem mudança roda no mesmo instante e não grava', async () => {
  const f = fixture()
  const running = f.gate.run(f.start)
  expect(f.starts).toHaveLength(1)
  expect(f.writes).toEqual([])
  expect(f.states).toEqual([])
  await running
})

it('materializa a última edição e espera a gravação antes de rodar', async () => {
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

it('falha de gravação não impede rodar: o código fica e o selo guarda o erro', async () => {
  const f = fixture()
  f.store.getState().setFile('script.js', 'código preservado')
  const running = f.gate.run(f.start)
  f.reject(new Error('Sem espaço'))
  await running
  expect(f.starts).toEqual(['código preservado'])
  expect(f.store.getState().isDirty).toBe(true)
  expect(f.store.getState().saveError).toContain('Sem espaço')
  expect(f.states).toEqual([true, false])
})

it('gravação que não responde: roda depois do limite e a escrita segue viva', async () => {
  const f = fixture()
  f.store.getState().setFile('script.js', 'gravação lenta')
  const started = Date.now()
  await f.gate.run(f.start)
  expect(Date.now() - started).toBeLessThan(1000)
  expect(f.starts).toEqual(['gravação lenta'])
  expect(f.states).toEqual([true, false])
  expect(f.store.getState().isDirty).toBe(true)
  f.acknowledge()
  await Bun.sleep(5)
  expect(f.store.getState().isDirty).toBe(false)
})

it('Parar cancela a intenção de rodar sem cancelar a gravação', async () => {
  const f = fixture()
  f.store.getState().setFile('script.js', 'edição antes de parar')
  const running = f.gate.run(f.start)
  f.gate.cancel()
  f.acknowledge()
  await running
  expect(f.starts).toEqual([])
  expect(f.writes).toEqual(['edição antes de parar'])
  expect(f.store.getState().isDirty).toBe(false)
})

it('outro projeto não é iniciado por uma gravação antiga', async () => {
  const f = fixture()
  f.store.getState().setFile('script.js', 'projeto antigo')
  const running = f.gate.run(f.start)
  f.store.getState().hydrateProject(createEmptyProject(crypto.randomUUID(), 'Outro projeto'))
  f.acknowledge()
  await running
  expect(f.starts).toEqual([])
})

it('edição feita durante a gravação entra na execução', async () => {
  const f = fixture()
  f.store.getState().setFile('script.js', 'primeira')
  const running = f.gate.run(f.start)
  const unregister = f.buffers.register(() => {
    unregister()
    f.store.getState().setFile('script.js', 'edição durante a gravação')
  })
  f.acknowledge()
  await running
  expect(f.starts).toEqual(['edição durante a gravação'])
  expect(f.store.getState().isDirty).toBe(true)
})

it('clique duplo não enfileira outra gravação nem outra execução', async () => {
  const f = fixture()
  f.store.getState().setFile('script.js', 'uma vez')
  const running = f.gate.run(f.start)
  await f.gate.run(f.start)
  expect(f.writes).toHaveLength(1)
  f.acknowledge()
  await running
  expect(f.starts).toHaveLength(1)
})

it('tentativa cancelada não apaga o estado de espera de uma nova', async () => {
  const f = fixture()
  f.store.getState().setFile('script.js', 'duas tentativas')
  const first = f.gate.run(f.start)
  f.gate.cancel()
  const second = f.gate.run(f.start)
  f.acknowledge()
  await Promise.all([first, second])
  expect(f.starts).toHaveLength(1)
  expect(f.states).toEqual([true, false, true, false])
})
