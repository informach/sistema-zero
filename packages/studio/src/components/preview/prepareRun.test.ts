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
  const errors: string[] = []
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
    error: (value) => {
      if (value) errors.push(value)
    },
    dirty: () => store.getState().isDirty,
  })
  const starts: string[] = []
  const start = () => {
    starts.push(store.getState().project?.files?.['script.js'] ?? '')
  }
  return { store, buffers, gate, writes, states, errors, starts, start, acknowledge, reject }
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

it('falha de gravação impede rodar uma revisão não confirmada e preserva o código', async () => {
  const f = fixture()
  f.store.getState().setFile('script.js', 'código preservado')
  const running = f.gate.run(f.start)
  f.reject(new Error('Sem espaço'))
  await running
  expect(f.starts).toEqual([])
  expect(f.errors).toEqual(['Sem espaço'])
  expect(f.store.getState().isDirty).toBe(true)
  expect(f.store.getState().saveError).toContain('Sem espaço')
  expect(f.states).toEqual([true, false])
})

it('gravação lenta nunca autoriza uma execução antes da confirmação', async () => {
  const f = fixture()
  f.store.getState().setFile('script.js', 'gravação lenta')
  const running = f.gate.run(f.start)
  await Bun.sleep(80)
  expect(f.starts).toEqual([])
  expect(f.states).toEqual([true])
  expect(f.store.getState().isDirty).toBe(true)
  f.acknowledge()
  await running
  expect(f.starts).toEqual(['gravação lenta'])
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

it('edição feita durante a gravação é confirmada antes de entrar na execução', async () => {
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
  expect(f.writes).toEqual(['primeira', 'edição durante a gravação'])
  expect(f.store.getState().isDirty).toBe(false)
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

it('uma segunda revisão aguarda sua própria confirmação, não a confirmação da primeira', async () => {
  const store = createProjectStore()
  store.getState().hydrateProject(createEmptyProject(crypto.randomUUID(), 'Duas revisões'))
  const acknowledgements: Array<() => void> = []
  const writes: string[] = []
  const starts: string[] = []
  const service = createPersistenceService(store, {
    load: async () => null,
    save: (snapshot) => {
      writes.push(snapshot.files?.['script.js'] ?? '')
      return new Promise<void>((resolve) => acknowledgements.push(resolve))
    },
  })
  const gate = createRunPreparation({
    project: () => store.getState().project,
    dirty: () => store.getState().isDirty,
    flush: () => {},
    save: service.save,
    pending: () => {},
    error: (message) => {
      if (message) throw new Error(message)
    },
  })
  store.getState().setFile('script.js', 'primeira')
  const running = gate.run((snapshot) => starts.push(snapshot.files?.['script.js'] ?? ''))
  store.getState().setFile('script.js', 'segunda')
  acknowledgements[0]?.()
  await Bun.sleep(5)
  expect(writes).toEqual(['primeira', 'segunda'])
  expect(starts).toEqual([])
  acknowledgements[1]?.()
  await running
  expect(starts).toEqual(['segunda'])
  expect(store.getState().isDirty).toBe(false)
})

it('uma escrita que não confirma nem altera a revisão produz erro em vez de repetir para sempre', async () => {
  const project = { id: 'não-confirmado' }
  const errors: Array<string | null> = []
  let writes = 0
  let starts = 0
  const gate = createRunPreparation({
    project: () => project,
    dirty: () => true,
    flush: () => {},
    save: async () => {
      writes++
    },
    pending: () => {},
    error: (message) => errors.push(message),
  })
  await gate.run(() => {
    starts++
  })
  expect(writes).toBe(1)
  expect(starts).toBe(0)
  expect(errors.at(-1)).toContain('não confirmou')
})
