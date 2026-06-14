import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Project } from '#core'
import { createEmptyProject } from '#core'
import type { StudioPersistenceAdapter } from './types'

// bun:test não isola module mocks por arquivo, e o registro é compartilhado pela
// suíte. O `projectStore` importa idb-keyval no topo; este no-op garante que
// importá-lo aqui não toque o IndexedDB (inexistente no happy-dom). Sem restore
// de propósito, igual aos demais arquivos de persistência.
mock.module('idb-keyval', () => ({
  createStore: mock(() => ({ name: 'test-store' })),
  del: mock(async () => undefined),
  delMany: mock(async () => undefined),
  get: mock(async (): Promise<unknown> => undefined),
  getMany: mock(async (): Promise<unknown[]> => []),
  keys: mock(async (): Promise<unknown[]> => []),
  set: mock(async () => undefined),
  setMany: mock(async () => undefined),
  // `update` é usado por settingsStore.ts; o registry de mocks é global na suíte.
  update: mock(async () => undefined),
}))

const { createProjectStore, useProjectStore } = await import('../state/projectStore')
const { cancelPendingAutosavesFor, createPersistenceService, setAutosaveDelayForTests } =
  await import('./service')

// Sem fake timers no bun:test: encurta o debounce do autosave e espera com
// timers reais (folga de 5x para máquinas lentas/CI).
const AUTOSAVE_TEST_DELAY_MS = 10
const waitForAutosave = () => Bun.sleep(AUTOSAVE_TEST_DELAY_MS * 5)

/**
 * Adapter de teste com `save` GATEADO: cada chamada fica pendurada até o teste
 * liberá-la por ordem de chegada, e registra a ordem em que cada projeto foi
 * EFETIVAMENTE confirmado (resolveu). Permite provar que dois saves do mesmo id
 * não intercalam e confirmam na ordem de emissão.
 */
function gatedAdapter() {
  const calledWith: Project[] = []
  const committed: string[] = []
  const releases: Array<() => void> = []
  const adapter: StudioPersistenceAdapter = {
    load: async () => null,
    save: (project) =>
      new Promise<void>((resolve) => {
        calledWith.push(project)
        releases.push(() => {
          committed.push(project.name)
          resolve()
        })
      }),
  }
  return {
    adapter,
    calledWith,
    committed,
    /** Libera o N-ésimo `save` que CHEGOU ao adapter (índice 0 = o primeiro). */
    release(index: number) {
      releases[index]?.()
    },
  }
}

describe('PersistenceService — mutex por id (ordem de confirmação)', () => {
  beforeEach(() => {
    setAutosaveDelayForTests(AUTOSAVE_TEST_DELAY_MS)
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  afterEach(() => {
    setAutosaveDelayForTests(null)
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('dois saves rápidos do mesmo id não intercalam e confirmam EM ORDEM', async () => {
    const gate = gatedAdapter()
    const service = createPersistenceService(useProjectStore, gate.adapter)

    // v1: projeto carregado; save explícito captura este snapshot.
    const v1 = { ...createEmptyProject('project-race', 'v1') }
    useProjectStore.getState().setProject(v1)
    const saveA = service.save()

    // O save A já chegou ao adapter e está pendurado.
    await Bun.sleep(0)
    expect(gate.calledWith).toHaveLength(1)
    expect(gate.calledWith[0]?.name).toBe('v1')

    // v2: edição seguinte; segundo save explícito captura o novo snapshot. Como
    // o adapter.save de A ainda está em voo, B fica ENFILEIRADO no mutex do id —
    // não pode chegar ao adapter antes de A confirmar.
    useProjectStore.getState().setFile('script.js', 'console.log("v2");\n')
    useProjectStore.getState().rename('v2')
    const saveB = service.save()

    await Bun.sleep(0)
    // B ainda não chegou ao adapter: o mutex segura a confirmação remota fora de
    // ordem (o POST antigo não pode sobrescrever o novo).
    expect(gate.calledWith).toHaveLength(1)

    // Libera A → só então B alcança o adapter.
    gate.release(0)
    await saveA
    await Bun.sleep(0)
    expect(gate.calledWith).toHaveLength(2)
    expect(gate.calledWith[1]?.name).toBe('v2')

    // Libera B.
    gate.release(1)
    await saveB

    // Confirmação na ordem de emissão, sem o save antigo vencer a corrida.
    expect(gate.committed).toEqual(['v1', 'v2'])
  })

  it('o 2º save NÃO chega ao adapter enquanto o 1º está em voo (mutex segura)', async () => {
    // Sem a serialização, o segundo `service.save()` chamaria `adapter.save`
    // imediatamente (concorrente) e `calledWith` teria 2 entradas já aqui. Com o
    // mutex, B fica preso na fila do id até A confirmar — é o que evita o POST
    // antigo vencer a corrida e sobrescrever a edição nova.
    const gate = gatedAdapter()
    const service = createPersistenceService(useProjectStore, gate.adapter)

    useProjectStore.getState().setProject({ ...createEmptyProject('project-race2', 'v1') })
    const saveA = service.save()
    await Bun.sleep(0)

    useProjectStore.getState().rename('v2')
    const saveB = service.save()
    await Bun.sleep(0)

    // Só A chegou ao adapter; B está preso no mutex do id.
    expect(gate.calledWith.map((p) => p.name)).toEqual(['v1'])

    gate.release(0)
    await saveA
    await Bun.sleep(0)
    gate.release(1)
    await saveB

    expect(gate.committed).toEqual(['v1', 'v2'])
  })
})

describe('PersistenceService — ctx.reason do onChange', () => {
  beforeEach(() => {
    setAutosaveDelayForTests(AUTOSAVE_TEST_DELAY_MS)
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  afterEach(() => {
    setAutosaveDelayForTests(null)
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it("o autosave do debounce emite onChange com reason 'autosave'", async () => {
    const reasons: Array<string | undefined> = []
    const service = createPersistenceService(useProjectStore, null)
    service.handlers = { onChange: (_project, ctx) => reasons.push(ctx?.reason) }
    const detach = service.attach()

    useProjectStore.getState().setProject(createEmptyProject('project-auto', 'Auto'))
    await waitForAutosave()

    expect(reasons).toEqual(['autosave'])

    detach()
  })

  it("o flush de fechamento (pagehide) emite onChange com reason 'flush'", async () => {
    const reasons: Array<string | undefined> = []
    const service = createPersistenceService(useProjectStore, null)
    service.handlers = { onChange: (_project, ctx) => reasons.push(ctx?.reason) }
    const detach = service.attach()

    useProjectStore.getState().setProject(createEmptyProject('project-flush', 'Flush'))
    // Dispara o flush ANTES do debounce: o único onChange vem do caminho de
    // fechamento, com reason 'flush' (o host troca para sendBeacon/keepalive).
    window.dispatchEvent(new Event('pagehide'))

    expect(reasons).toEqual(['flush'])

    detach()
  })

  it("o salvar explícito emite onChange com reason 'flush'", async () => {
    const reasons: Array<string | undefined> = []
    const service = createPersistenceService(useProjectStore, null)
    service.handlers = { onChange: (_project, ctx) => reasons.push(ctx?.reason) }

    useProjectStore.getState().setProject(createEmptyProject('project-save', 'Save'))
    await service.save()

    expect(reasons).toEqual(['flush'])
  })
})

describe('PersistenceService — exclusão cross-instância (sem ressurreição)', () => {
  afterEach(() => {
    setAutosaveDelayForTests(null)
  })

  it('um projeto editado/enfileirado numa instância NÃO é re-persistido após outra instância apagá-lo (e é descarregado)', async () => {
    setAutosaveDelayForTests(AUTOSAVE_TEST_DELAY_MS)
    // Duas instâncias do <Studio> com o MESMO projeto aberto (stores separadas).
    const storeA = createProjectStore()
    const storeB = createProjectStore()
    let savedA = 0
    let savedB = 0
    const serviceA = createPersistenceService(storeA, {
      load: async () => null,
      save: async () => {
        savedA += 1
      },
    })
    const serviceB = createPersistenceService(storeB, {
      load: async () => null,
      save: async () => {
        savedB += 1
      },
    })
    const detachA = serviceA.attach()
    const detachB = serviceB.attach()

    // Instância B continua editando o projeto (autosave enfileirado, sujo).
    storeB.getState().setProject(createEmptyProject('shared-doomed', 'Editando em B'))
    expect(storeB.getState().isDirty).toBe(true)

    // Instância A apaga o projeto: o mesmo fan-out que deleteProject usa
    // (cancelPendingAutosavesFor) deve cancelar o timer de B E descarregar o
    // projeto de B (project:null), fechando a janela de ressurreição.
    cancelPendingAutosavesFor('shared-doomed')

    // B foi descarregado: nenhum projeto carregado, nada sujo.
    expect(storeB.getState().project).toBeNull()
    expect(storeB.getState().isDirty).toBe(false)

    // Passado o debounce, B não persiste o projeto apagado.
    await waitForAutosave()
    expect(savedB).toBe(0)
    expect(savedA).toBe(0)

    detachA()
    detachB()
  })

  it('continuar editando após o delete NÃO ressuscita o projeto (schedule não limpa a cerca)', async () => {
    setAutosaveDelayForTests(AUTOSAVE_TEST_DELAY_MS)
    let saved = 0
    const store = createProjectStore()
    const service = createPersistenceService(store, {
      load: async () => null,
      save: async () => {
        saved += 1
      },
    })
    const detach = service.attach()

    store.getState().setProject(createEmptyProject('doomed-edit', 'Doomed'))
    // Delete chega: cerca ativa + descarrega o projeto desta instância.
    cancelPendingAutosavesFor('doomed-edit')
    expect(store.getState().project).toBeNull()

    // Simula um caminho que re-instala o MESMO id e segue editando SEM passar
    // pelos caminhos legítimos de re-criação (que usam ULID novo). O autosave
    // do schedule NÃO pode limpar a cerca — senão o save em voo re-persistiria.
    store.getState().setProject({
      ...createEmptyProject('doomed-edit', 'Editado após delete'),
    })
    store.getState().setFile('script.js', 'console.log("ainda digitando");\n')

    await waitForAutosave()
    // A cerca ainda vale (dentro da janela de graça) → persistAndMark aborta.
    expect(saved).toBe(0)

    detach()
  })
})

describe('PersistenceService — cerca de exclusão limitada (sem vazamento)', () => {
  afterEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('a cerca não bloqueia permanentemente um id reaproveitado (save tira a marca)', async () => {
    // A marca de exclusão é uma CERCA temporária, não um bloqueio permanente: um
    // id que volta a ser editado/salvo é des-cercado (schedule/save chamam
    // deletedProjects.delete). Junto com a poda lazy por janela de graça, isso
    // mantém o Map limitado em vez de vazar um ULID por exclusão para sempre.
    let saved = 0
    const adapter: StudioPersistenceAdapter = {
      load: async () => null,
      save: async () => {
        saved += 1
      },
    }
    const service = createPersistenceService(useProjectStore, adapter)
    setAutosaveDelayForTests(AUTOSAVE_TEST_DELAY_MS)

    // Marca o id como excluído (cerca ativa).
    cancelPendingAutosavesFor('project-reuse')

    // Reaproveita o MESMO id com um projeto vivo: o save explícito tira a cerca
    // e persiste normalmente.
    useProjectStore.getState().setProject(createEmptyProject('project-reuse', 'Reuso'))
    await service.save()

    expect(saved).toBe(1)
    expect(useProjectStore.getState().isDirty).toBe(false)

    setAutosaveDelayForTests(null)
  })
})
