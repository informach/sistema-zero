import { afterEach, beforeEach, describe, expect, it, mock, setSystemTime } from 'bun:test'
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
const {
  cancelPendingAutosavesFor,
  createPersistenceService,
  setAutosaveDelayForTests,
  setBlocksHydrationTimeoutForTests,
} = await import('./service')

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

  it('pagehide + beforeunload no mesmo fechamento flusham UMA vez só (dedupe)', async () => {
    // Ambos os listeners disparam num único unload. Sem dedupe, o onChange('flush')
    // saía DUAS vezes e o snapshot era re-persistido (isDirty segue true porque o
    // persist é async). O flag `flushed` colapsa o 2º evento.
    const saves: string[] = []
    const service = createPersistenceService(useProjectStore, {
      load: async () => null,
      save: async (project) => {
        saves.push(project.id)
      },
    })
    const reasons: Array<string | undefined> = []
    service.handlers = { onChange: (_project, ctx) => reasons.push(ctx?.reason) }
    const detach = service.attach()

    useProjectStore.getState().setProject(createEmptyProject('project-dedupe', 'Dedupe'))
    window.dispatchEvent(new Event('pagehide'))
    window.dispatchEvent(new Event('beforeunload'))
    await Bun.sleep(0)

    expect(reasons).toEqual(['flush'])
    expect(saves).toEqual(['project-dedupe'])

    detach()
  })

  it('uma edição nova após um flush re-arma o flush do próximo fechamento', async () => {
    // O dedupe não pode travar o flush para sempre: uma edição genuína (schedule)
    // re-arma. Sem isso, um flush no meio da sessão perderia tudo o que viesse
    // depois no fechamento real.
    const saves: string[] = []
    const service = createPersistenceService(useProjectStore, {
      load: async () => null,
      save: async (project) => {
        saves.push(project.name)
      },
    })
    const detach = service.attach()

    useProjectStore.getState().setProject(createEmptyProject('project-rearm', 'v1'))
    window.dispatchEvent(new Event('pagehide'))
    await Bun.sleep(0)

    // Edição nova → re-arma o flush.
    useProjectStore.getState().rename('v2')
    window.dispatchEvent(new Event('pagehide'))
    await Bun.sleep(0)

    expect(saves).toEqual(['v1', 'v2'])

    detach()
  })
})

describe('PersistenceService — hidratação pós-load', () => {
  const storedBlocksState = {
    blocks: {
      languageVersion: 0,
      blocks: [{ type: 'sz_js_console_log_text', x: 320, y: 180 }],
    },
  }
  const liveBlocksState = {
    blocks: {
      languageVersion: 0,
      blocks: [{ type: 'sz_js_console_log_text', x: 10, y: 10 }],
    },
  }

  afterEach(() => {
    setAutosaveDelayForTests(null)
    setBlocksHydrationTimeoutForTests(null)
    useProjectStore.setState({
      project: null,
      isDirty: false,
      saveError: null,
      blocksHydration: 'idle',
    })
  })

  it('restaura blocksState pesado sem marcar o projeto como sujo', async () => {
    const adapter: StudioPersistenceAdapter = {
      load: async () => null,
      loadBlocksState: mock(async () => storedBlocksState),
      save: mock(async () => undefined),
    }
    const service = createPersistenceService(useProjectStore, adapter)
    const project = { ...createEmptyProject('hydrate-blocks', 'Projeto'), blocksState: null }

    useProjectStore.getState().hydrateProject(project)
    service.hydrateAfterLoad(project)
    expect(useProjectStore.getState().blocksHydration).toBe('pending')
    await Bun.sleep(0)

    expect(useProjectStore.getState().project?.blocksState).toEqual(storedBlocksState)
    expect(useProjectStore.getState().isDirty).toBe(false)
    expect(useProjectStore.getState().blocksHydration).toBe('restored')
    expect(adapter.save).not.toHaveBeenCalled()
  })

  it('sujo com blocos VIVOS não-vazios: NÃO sobrescreve a edição viva (discarded)', async () => {
    let resolveBlocks: ((value: Project['blocksState']) => void) | undefined
    const adapter: StudioPersistenceAdapter = {
      load: async () => null,
      loadBlocksState: () =>
        new Promise((resolve) => {
          resolveBlocks = resolve
        }),
      save: mock(async () => undefined),
    }
    const service = createPersistenceService(useProjectStore, adapter)
    const project = { ...createEmptyProject('hydrate-dirty', 'Projeto'), blocksState: null }

    useProjectStore.getState().hydrateProject(project)
    service.hydrateAfterLoad(project)
    // O aluno montou blocos DE VERDADE enquanto a partição carregava: o
    // trabalho vivo vence o layout salvo mais antigo.
    useProjectStore.getState().setBlocksState(liveBlocksState)
    resolveBlocks?.(storedBlocksState)
    await Bun.sleep(0)

    expect(useProjectStore.getState().project?.blocksState).toEqual(liveBlocksState)
    expect(useProjectStore.getState().isDirty).toBe(true)
    expect(useProjectStore.getState().blocksHydration).toBe('discarded')
  })

  it('sujo mas com blocos vivos VAZIOS (edição foi em arquivo): restaura mesmo assim', async () => {
    // Mudança deliberada (10/07): antes, QUALQUER sujeira pulava a restauração —
    // uma edição rápida de código na janela de abertura apagava os blocos para
    // sempre. Um workspace vazio não codifica trabalho do aluno; a edição de
    // arquivo é preservada (o patch só troca blocksState).
    let resolveBlocks: ((value: Project['blocksState']) => void) | undefined
    const adapter: StudioPersistenceAdapter = {
      load: async () => null,
      loadBlocksState: () =>
        new Promise((resolve) => {
          resolveBlocks = resolve
        }),
      save: mock(async () => undefined),
    }
    const service = createPersistenceService(useProjectStore, adapter)
    const project = { ...createEmptyProject('hydrate-dirty-empty', 'Projeto'), blocksState: null }

    useProjectStore.getState().hydrateProject(project)
    service.hydrateAfterLoad(project)
    useProjectStore.getState().setFile('script.js', 'console.log("editado");\n')
    resolveBlocks?.(storedBlocksState)
    await Bun.sleep(0)

    const state = useProjectStore.getState()
    expect(state.project?.blocksState).toEqual(storedBlocksState)
    expect(state.project?.files['script.js']).toBe('console.log("editado");\n')
    expect(state.isDirty).toBe(true)
    expect(state.blocksHydration).toBe('restored')
  })

  it("partição inexistente (null) vira status 'empty' — definitivo, sem tranca", async () => {
    const adapter: StudioPersistenceAdapter = {
      load: async () => null,
      loadBlocksState: mock(async () => null),
      save: mock(async () => undefined),
    }
    const service = createPersistenceService(useProjectStore, adapter)
    const project = { ...createEmptyProject('hydrate-empty', 'Projeto'), blocksState: null }

    useProjectStore.getState().hydrateProject(project)
    service.hydrateAfterLoad(project)
    await Bun.sleep(0)

    expect(useProjectStore.getState().blocksHydration).toBe('empty')
    expect(useProjectStore.getState().project?.blocksState).toBeNull()
  })

  it('adapter SEM loadBlocksState: status fica idle e nada é trancado', async () => {
    const saved: Project[] = []
    const adapter: StudioPersistenceAdapter = {
      load: async () => null,
      save: async (project) => {
        saved.push(project)
      },
    }
    const service = createPersistenceService(useProjectStore, adapter)
    setAutosaveDelayForTests(AUTOSAVE_TEST_DELAY_MS)
    const detach = service.attach()
    const project = {
      ...createEmptyProject('hydrate-no-loader', 'Projeto'),
      blocksState: liveBlocksState,
    }

    useProjectStore.getState().hydrateProject(project)
    service.hydrateAfterLoad(project)
    expect(useProjectStore.getState().blocksHydration).toBe('idle')

    // Edição real → autosave: o snapshot vai COMPLETO (sem strip).
    useProjectStore.getState().setBlocksState(liveBlocksState)
    await waitForAutosave()
    expect(saved.at(-1)?.blocksState).toEqual(liveBlocksState)

    detach()
  })

  it('TRANCA: enquanto a partição hidrata, autosave/onChange vão SEM blocksState', async () => {
    let resolveBlocks: ((value: Project['blocksState']) => void) | undefined
    const saved: Project[] = []
    const changed: Project[] = []
    const adapter: StudioPersistenceAdapter = {
      load: async () => null,
      loadBlocksState: () =>
        new Promise((resolve) => {
          resolveBlocks = resolve
        }),
      save: async (project) => {
        saved.push(project)
      },
    }
    const service = createPersistenceService(useProjectStore, adapter)
    service.handlers = { onChange: (project) => changed.push(project) }
    setAutosaveDelayForTests(AUTOSAVE_TEST_DELAY_MS)
    const detach = service.attach()
    const project = { ...createEmptyProject('hydrate-strip', 'Projeto'), blocksState: null }

    useProjectStore.getState().hydrateProject(project)
    service.hydrateAfterLoad(project)
    // Reconstrução derivada (ex.: reabrir na Ponte) enquanto a partição real
    // ainda carrega: o snapshot persistido NÃO pode carregar esse estado.
    useProjectStore.getState().setBlocksState(liveBlocksState)
    await waitForAutosave()

    expect(saved.length).toBeGreaterThan(0)
    expect(saved.at(-1)?.blocksState).toBeNull()
    expect(changed.at(-1)?.blocksState).toBeNull()
    // O projeto VIVO segue com os blocos derivados (a tranca é só no write).
    expect(useProjectStore.getState().project?.blocksState).toEqual(liveBlocksState)

    // Resolvida a hidratação (vivo não-vazio → discarded), os saves voltam ao
    // normal: o estado vivo passa a ser a verdade e É persistido.
    resolveBlocks?.(storedBlocksState)
    await Bun.sleep(0)
    expect(useProjectStore.getState().blocksHydration).toBe('discarded')
    await service.save()
    expect(saved.at(-1)?.blocksState).toEqual(liveBlocksState)

    detach()
  })

  it("falha na leitura tranca a partição na sessão ('failed'); resolução tardia restaura", async () => {
    setBlocksHydrationTimeoutForTests(10)
    let resolveBlocks: ((value: Project['blocksState']) => void) | undefined
    const saved: Project[] = []
    const adapter: StudioPersistenceAdapter = {
      load: async () => null,
      loadBlocksState: () =>
        new Promise((resolve) => {
          resolveBlocks = resolve
        }),
      save: async (project) => {
        saved.push(project)
      },
    }
    const service = createPersistenceService(useProjectStore, adapter)
    const project = { ...createEmptyProject('hydrate-timeout', 'Projeto'), blocksState: null }

    useProjectStore.getState().hydrateProject(project)
    service.hydrateAfterLoad(project)
    // Estoura o timeout: 'pending' → 'failed' (UI destrava, tranca continua).
    await Bun.sleep(50)
    expect(useProjectStore.getState().blocksHydration).toBe('failed')

    // Um save durante 'failed' ainda protege a partição.
    useProjectStore.getState().setBlocksState(liveBlocksState)
    await service.save()
    expect(saved.at(-1)?.blocksState).toBeNull()

    // A leitura resolve TARDE: com o vivo não-vazio, vira 'discarded' (trabalho
    // vivo vence) e a tranca abre.
    resolveBlocks?.(storedBlocksState)
    await Bun.sleep(0)
    expect(useProjectStore.getState().blocksHydration).toBe('discarded')
    await service.save()
    expect(saved.at(-1)?.blocksState).toEqual(liveBlocksState)
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
    setSystemTime()
    setAutosaveDelayForTests(null)
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('a cerca só libera um id reaproveitado depois da janela de graça', async () => {
    // A marca de exclusão é uma CERCA temporária, não um bloqueio permanente.
    // Durante a janela ela não pode ser retirada nem pelo save explícito: esse
    // save pode vir de uma referência obsoleta e ressuscitar o projeto apagado.
    // Depois da janela, a poda lazy libera o id e limita o crescimento do Map.
    let saved = 0
    const adapter: StudioPersistenceAdapter = {
      load: async () => null,
      save: async () => {
        saved += 1
      },
    }
    const service = createPersistenceService(useProjectStore, adapter)
    setAutosaveDelayForTests(AUTOSAVE_TEST_DELAY_MS)

    const deletedAt = Date.now()
    cancelPendingAutosavesFor('project-reuse')

    // O mesmo id continua bloqueado durante a janela de segurança.
    useProjectStore.getState().setProject(createEmptyProject('project-reuse', 'Reuso'))
    await service.save()
    expect(saved).toBe(0)
    expect(useProjectStore.getState().isDirty).toBe(true)

    // A poda é lazy: a próxima consulta após 60 s remove a marca antiga.
    setSystemTime(new Date(deletedAt + 60_001))
    await service.save()
    expect(saved).toBe(1)
    expect(useProjectStore.getState().isDirty).toBe(false)
  })
})
