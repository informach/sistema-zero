import { describe, expect, it } from 'bun:test'
import type { PensaProjectDetailView } from '../core/types'
import { PensaApiError } from '../core/types'
import {
  createFakeTransport,
  makeDetail,
  makeGamification,
  makeMissionPlanArtifact,
  makeStageView,
  makeTask,
  makeTasks,
} from '../testing/fakeTransport'
import { createStageRStore } from './stageRStore'

const STAGE_PATH = '/cycles/cycle-1/stages/r'
const GENERATE_PATH = '/cycles/cycle-1/artifacts/generate'
const ADVANCE_PATH = '/cycles/cycle-1/advance'

describe('stageRStore.loadStage', () => {
  it('sem artefato mission_plan: hasPlan false (hero de criar as missões)', async () => {
    const transport = createFakeTransport((path) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'r' })
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageRStore(transport)

    await store.getState().loadStage('cycle-1')

    expect(store.getState().stageLoaded).toBe(true)
    expect(store.getState().hasPlan).toBe(false)
    expect(store.getState().tasks).toBeNull()
  })

  it('com artefato mission_plan mas sem tasks vivas: hasPlan true (fallback do Recriar)', async () => {
    const transport = createFakeTransport((path) => {
      if (path === STAGE_PATH) {
        return makeStageView({ stage: 'r', artifacts: [makeMissionPlanArtifact()] })
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageRStore(transport)

    await store.getState().loadStage('cycle-1')

    expect(store.getState().hasPlan).toBe(true)
    expect(store.getState().tasks).toBeNull()
  })

  it('RELOAD re-hidrata o quadro VIVO da view (colunas preservadas, sem re-gerar)', async () => {
    const live = makeTasks().map((t, i) =>
      i === 0
        ? { ...t, column: 'done' as const }
        : i === 1
          ? { ...t, column: 'doing' as const }
          : t,
    )
    const transport = createFakeTransport((path) => {
      if (path === STAGE_PATH) {
        return makeStageView({ stage: 'r', artifacts: [makeMissionPlanArtifact()], tasks: live })
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageRStore(transport)

    await store.getState().loadStage('cycle-1')

    expect(store.getState().hasPlan).toBe(true)
    expect(store.getState().tasks).toHaveLength(3)
    expect(store.getState().tasks?.[0]?.column).toBe('done')
    expect(store.getState().tasks?.[1]?.column).toBe('doing')
  })

  it('erro vira stageError gentil (sem vazar a mensagem técnica)', async () => {
    const transport = createFakeTransport(() => {
      throw new PensaApiError('down', 500, 'INTERNAL_ERROR')
    })
    const store = createStageRStore(transport)

    await store.getState().loadStage('cycle-1')

    expect(store.getState().stageLoaded).toBe(false)
    expect(store.getState().stageError).not.toBeNull()
    expect(store.getState().stageError).not.toContain('down')
  })
})

describe('stageRStore.generateMissions', () => {
  it('POST {type: mission_plan, projectId} → tasks com ids reais + hasPlan', async () => {
    const transport = createFakeTransport((path, init) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'r' })
      if (path === GENERATE_PATH && init?.method === 'POST') return { tasks: makeTasks() }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageRStore(transport)
    await store.getState().loadStage('cycle-1')

    expect(await store.getState().generateMissions('proj-1')).toBe(true)

    const generate = transport.calls.find((call) => call.path === GENERATE_PATH)
    expect(generate?.body).toEqual({ type: 'mission_plan', projectId: 'proj-1' })
    expect(store.getState().tasks).toHaveLength(3)
    expect(store.getState().hasPlan).toBe(true)
  })

  it('erro vira generateError gentil e devolve false', async () => {
    const transport = createFakeTransport((path) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'r' })
      throw new PensaApiError('ia caiu', 502, 'PENSA_AI_UNAVAILABLE')
    })
    const store = createStageRStore(transport)
    await store.getState().loadStage('cycle-1')

    expect(await store.getState().generateMissions('proj-1')).toBe(false)
    expect(store.getState().generateError).not.toBeNull()
    expect(store.getState().generateError).not.toContain('ia caiu')
    expect(store.getState().tasks).toBeNull()
  })
})

describe('stageRStore.moveTask', () => {
  function makeLoadedStore(respond: Parameters<typeof createFakeTransport>[0]) {
    const transport = createFakeTransport(respond)
    const store = createStageRStore(transport)
    store.setState({ cycleId: 'cycle-1', stageLoaded: true, hasPlan: true, tasks: makeTasks() })
    return { transport, store }
  }

  it('move OTIMISTA (muda antes da resposta) e absorve a task canônica', async () => {
    let release: (() => void) | null = null
    const { transport, store } = makeLoadedStore((path, init) => {
      if (path === '/tasks/task-1' && init?.method === 'PATCH') {
        return new Promise((resolve) => {
          release = () =>
            resolve({ task: makeTask({ column: 'doing', position: 0, notes: 'canônica' }) })
        })
      }
      throw new Error(`rota inesperada: ${path}`)
    })

    const promise = store.getState().moveTask('task-1', 'doing')
    // Otimista: a coluna muda ANTES do PATCH responder.
    expect(store.getState().tasks?.find((t) => t.id === 'task-1')?.column).toBe('doing')
    expect(store.getState().movingTaskId).toBe('task-1')

    if (!release) throw new Error('PATCH não capturado')
    ;(release as () => void)()
    expect(await promise).toBe(true)

    const patch = transport.calls.find((call) => call.method === 'PATCH')
    expect(patch?.path).toBe('/tasks/task-1')
    expect(patch?.body).toEqual({ column: 'doing', position: 0 })
    // Resposta canônica substitui a task local.
    expect(store.getState().tasks?.find((t) => t.id === 'task-1')?.notes).toBe('canônica')
    expect(store.getState().movingTaskId).toBeNull()
  })

  it('rollback no erro: a task volta para a coluna original + moveError gentil', async () => {
    const { store } = makeLoadedStore(() => {
      throw new PensaApiError('boom', 500, 'INTERNAL_ERROR')
    })

    expect(await store.getState().moveTask('task-1', 'doing')).toBe(false)

    expect(store.getState().tasks?.find((t) => t.id === 'task-1')?.column).toBe('backlog')
    expect(store.getState().moveError).not.toBeNull()
    expect(store.getState().moveError).not.toContain('boom')
  })

  it('regra 1-em-doing: mover para doing com a coluna ocupada recusa sem rede', async () => {
    const { transport, store } = makeLoadedStore(() => {
      throw new Error('não deveria chamar a rede')
    })
    store.setState({
      tasks: [makeTask({ id: 'task-1', column: 'doing' }), makeTask({ id: 'task-2' })],
    })

    expect(await store.getState().moveTask('task-2', 'doing')).toBe(false)
    expect(transport.calls).toHaveLength(0)
    expect(store.getState().tasks?.find((t) => t.id === 'task-2')?.column).toBe('backlog')
  })

  it('swapDoing: a atual volta ao backlog e a nova assume (dois PATCHes)', async () => {
    const { transport, store } = makeLoadedStore((path, init) => {
      if (init?.method === 'PATCH' && path === '/tasks/task-1') {
        return { task: makeTask({ id: 'task-1', column: 'backlog', position: 1 }) }
      }
      if (init?.method === 'PATCH' && path === '/tasks/task-2') {
        return { task: makeTask({ id: 'task-2', column: 'doing', position: 0 }) }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    store.setState({
      tasks: [makeTask({ id: 'task-1', column: 'doing' }), makeTask({ id: 'task-2' })],
    })

    expect(await store.getState().swapDoing('task-2')).toBe(true)

    const patches = transport.calls.filter((call) => call.method === 'PATCH')
    expect(patches.map((call) => call.path)).toEqual(['/tasks/task-1', '/tasks/task-2'])
    expect(patches[0]?.body).toMatchObject({ column: 'backlog' })
    expect(patches[1]?.body).toMatchObject({ column: 'doing' })
    expect(store.getState().tasks?.find((t) => t.id === 'task-1')?.column).toBe('backlog')
    expect(store.getState().tasks?.find((t) => t.id === 'task-2')?.column).toBe('doing')
  })
})

describe('stageRStore — autoria manual (add/editar/apagar/reordenar/notas/sugerir mais)', () => {
  function loaded(respond: Parameters<typeof createFakeTransport>[0]) {
    const transport = createFakeTransport(respond)
    const store = createStageRStore(transport)
    store.setState({ cycleId: 'cycle-1', stageLoaded: true, hasPlan: true, tasks: makeTasks() })
    return { transport, store }
  }

  const draft = {
    title: 'Nova missão',
    mission: { steps: [{ text: 'Passo 1' }], doneWhen: ['Deu certo'] },
  }

  it('addTask: POST /tasks e ANEXA os cards devolvidos (não zera o quadro)', async () => {
    const { transport, store } = loaded((path, init) => {
      if (path === '/cycles/cycle-1/tasks' && init?.method === 'POST') {
        return { tasks: [makeTask({ id: 'task-9', title: 'Nova missão' })] }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const antes = store.getState().tasks?.length ?? 0

    expect(await store.getState().addTask(draft)).toBe(true)
    const post = transport.calls.find((c) => c.method === 'POST')
    expect(post?.path).toBe('/cycles/cycle-1/tasks')
    expect(post?.body).toEqual({ tasks: [draft] })
    expect(store.getState().tasks).toHaveLength(antes + 1)
    expect(store.getState().tasks?.at(-1)?.title).toBe('Nova missão')
  })

  it('editTask: PATCH de conteúdo substitui pela task canônica', async () => {
    const { transport, store } = loaded((path, init) => {
      if (path === '/tasks/task-1' && init?.method === 'PATCH') {
        return { task: makeTask({ id: 'task-1', title: 'Editada' }) }
      }
      throw new Error(`rota inesperada: ${path}`)
    })

    expect(await store.getState().editTask('task-1', { ...draft, title: 'Editada' })).toBe(true)
    const patch = transport.calls.find((c) => c.method === 'PATCH')
    expect(patch?.body).toMatchObject({ title: 'Editada', mission: draft.mission })
    expect(store.getState().tasks?.find((t) => t.id === 'task-1')?.title).toBe('Editada')
  })

  it('removeTask: some OTIMISTA; rollback no erro', async () => {
    const okStore = loaded((path, init) => {
      if (path === '/tasks/task-1' && init?.method === 'DELETE') return { ok: true }
      throw new Error(`rota inesperada: ${path}`)
    })
    const antes = okStore.store.getState().tasks?.length ?? 0
    expect(await okStore.store.getState().removeTask('task-1')).toBe(true)
    expect(okStore.store.getState().tasks?.some((t) => t.id === 'task-1')).toBe(false)
    expect(okStore.store.getState().tasks).toHaveLength(antes - 1)

    const failStore = loaded(() => {
      throw new PensaApiError('boom', 500, 'INTERNAL_ERROR')
    })
    expect(await failStore.store.getState().removeTask('task-1')).toBe(false)
    // Rollback: o card volta.
    expect(failStore.store.getState().tasks?.some((t) => t.id === 'task-1')).toBe(true)
    expect(failStore.store.getState().taskActionError).not.toBeNull()
  })

  it('reorderTask: PATCH de position dentro da coluna; borda recusa sem rede', async () => {
    const { transport, store } = loaded((path, init) => {
      if (path === '/tasks/task-1' && init?.method === 'PATCH') {
        return { task: makeTask({ id: 'task-1', position: 1 }) }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    // task-1 é o 1º do backlog → não sobe.
    expect(await store.getState().reorderTask('task-1', 'up')).toBe(false)
    expect(transport.calls).toHaveLength(0)
    // Descer manda o PATCH de position.
    expect(await store.getState().reorderTask('task-1', 'down')).toBe(true)
    const patch = transport.calls.find((c) => c.method === 'PATCH')
    expect(patch?.body).toEqual({ position: 1 })
  })

  it('setTaskNotes: PATCH otimista das notas', async () => {
    const { transport, store } = loaded((path, init) => {
      if (path === '/tasks/task-1' && init?.method === 'PATCH') {
        return { task: makeTask({ id: 'task-1', notes: 'lembrete' }) }
      }
      throw new Error(`rota inesperada: ${path}`)
    })

    expect(await store.getState().setTaskNotes('task-1', 'lembrete')).toBe(true)
    const patch = transport.calls.find((c) => c.method === 'PATCH')
    expect(patch?.body).toEqual({ notes: 'lembrete' })
    expect(store.getState().tasks?.find((t) => t.id === 'task-1')?.notes).toBe('lembrete')
  })

  it('suggestMoreMissions: POST generate {append:true} e ANEXA (não substitui)', async () => {
    const { transport, store } = loaded((path, init) => {
      if (path === GENERATE_PATH && init?.method === 'POST') {
        return { tasks: [makeTask({ id: 'task-9', title: 'Mais uma' })] }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const antes = store.getState().tasks?.length ?? 0

    expect(await store.getState().suggestMoreMissions('proj-1')).toBe(true)
    const post = transport.calls.find((c) => c.method === 'POST')
    expect(post?.body).toMatchObject({ type: 'mission_plan', projectId: 'proj-1', append: true })
    expect(store.getState().tasks).toHaveLength(antes + 1)
  })
})

describe('stageRStore.ensureStudioProject', () => {
  it('sem a capability: devolve null e não toca a rede (degrade)', async () => {
    const transport = createFakeTransport(() => {
      throw new Error('não deveria chamar a rede')
    })
    const store = createStageRStore(transport)

    expect(await store.getState().ensureStudioProject(makeDetail())).toBeNull()
    expect(transport.calls).toHaveLength(0)
  })

  it('projeto já semeado: devolve o id existente sem criar de novo', async () => {
    const transport = createFakeTransport(() => {
      throw new Error('não deveria chamar a rede')
    })
    let created = 0
    const store = createStageRStore(transport, {
      createStudioProject: async () => {
        created += 1
        return 'studio-9'
      },
    })

    const id = await store
      .getState()
      .ensureStudioProject(makeDetail({ studioProjectId: 'studio-1' }))

    expect(id).toBe('studio-1')
    expect(created).toBe(0)
    expect(transport.calls).toHaveLength(0)
  })

  it('semeia com o nome do jogo → PATCH {studioProjectId} → absorve o detail', async () => {
    const updated: PensaProjectDetailView[] = []
    const transport = createFakeTransport((path, init) => {
      if (path === '/projects/proj-1' && init?.method === 'PATCH') {
        return { project: makeDetail({ studioProjectId: 'studio-1' }) }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const names: string[] = []
    const store = createStageRStore(transport, {
      createStudioProject: async (name) => {
        names.push(name)
        return 'studio-1'
      },
      onProjectUpdated: (project) => updated.push(project),
    })

    const id = await store.getState().ensureStudioProject(makeDetail({ name: 'Dino Turbo' }))

    expect(id).toBe('studio-1')
    expect(names).toEqual(['Dino Turbo'])
    const patch = transport.calls.find((call) => call.method === 'PATCH')
    expect(patch?.path).toBe('/projects/proj-1')
    expect(patch?.body).toEqual({ studioProjectId: 'studio-1' })
    expect(updated).toHaveLength(1)
    expect(updated[0]?.studioProjectId).toBe('studio-1')
  })

  it('falha (create ou PATCH) → null + seedError gentil (sem travar a missão)', async () => {
    const transport = createFakeTransport(() => {
      throw new PensaApiError('boom', 500, 'INTERNAL_ERROR')
    })
    const store = createStageRStore(transport, {
      createStudioProject: async () => 'studio-1',
    })

    expect(await store.getState().ensureStudioProject(makeDetail())).toBeNull()
    expect(store.getState().seeding).toBe(false)
    expect(store.getState().seedError).not.toBeNull()
    expect(store.getState().seedError).not.toContain('boom')
  })
})

describe('stageRStore.advance', () => {
  it('POST {from: r} e guarda o delta de gamificação da resposta', async () => {
    const transport = createFakeTransport((path, init) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'r' })
      if (path === ADVANCE_PATH && init?.method === 'POST') {
        return {
          cycle: { id: 'cycle-1', number: 1, goal: null, stage: 'o' },
          gamification: makeGamification({ xpAwarded: 15 }),
        }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageRStore(transport)
    await store.getState().loadStage('cycle-1')

    expect(await store.getState().advance()).toBe(true)

    const post = transport.calls.find((call) => call.path === ADVANCE_PATH)
    expect(post?.body).toEqual({ from: 'r' })
    expect(store.getState().gamification?.xpAwarded).toBe(15)
  })

  it('gamification ausente/null → delta null (fail-open); gate vira advanceError', async () => {
    const transport = createFakeTransport((path, init) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'r' })
      if (path === ADVANCE_PATH && init?.method === 'POST') {
        return { cycle: { id: 'cycle-1', number: 1, goal: null, stage: 'o' }, gamification: null }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageRStore(transport)
    await store.getState().loadStage('cycle-1')
    expect(await store.getState().advance()).toBe(true)
    expect(store.getState().gamification).toBeNull()

    const failing = createFakeTransport((path) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'r' })
      throw new PensaApiError('gate', 409, 'PENSA_GATE_NOT_READY')
    })
    const store2 = createStageRStore(failing)
    await store2.getState().loadStage('cycle-1')
    expect(await store2.getState().advance()).toBe(false)
    expect(store2.getState().advanceError).not.toBeNull()
  })
})
