import { describe, expect, it } from 'bun:test'
import { PensaApiError } from '../core/types'
import {
  createFakeTransport,
  makeCycle,
  makeDetail,
  makeListProject,
} from '../testing/fakeTransport'
import { createProjectStore } from './projectStore'

describe('projectStore', () => {
  it('loadProjects popula a lista via GET /projects', async () => {
    const transport = createFakeTransport((path) => {
      if (path === '/projects') return { projects: [makeListProject()] }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createProjectStore(transport)

    await store.getState().loadProjects()

    const state = store.getState()
    expect(state.projects).toHaveLength(1)
    expect(state.projects[0]?.name).toBe('Aventura do Dino')
    expect(state.projectsLoaded).toBe(true)
    expect(state.loadingList).toBe(false)
    expect(state.listError).toBeNull()
    expect(transport.calls).toEqual([{ path: '/projects', method: 'GET', body: undefined }])
  })

  it('erro do transport no load vira estado de erro gentil (com retry possível)', async () => {
    let fail = true
    const transport = createFakeTransport(() => {
      if (fail) throw new PensaApiError('down', 500, 'INTERNAL_ERROR')
      return { projects: [] }
    })
    const store = createProjectStore(transport)

    await store.getState().loadProjects()
    expect(store.getState().listError).not.toBeNull()
    expect(store.getState().listError).not.toContain('down')
    expect(store.getState().loadingList).toBe(false)
    expect(store.getState().projectsLoaded).toBe(false)

    // Retry limpa o erro e carrega.
    fail = false
    await store.getState().loadProjects()
    expect(store.getState().listError).toBeNull()
    expect(store.getState().projectsLoaded).toBe(true)
  })

  it('createProject faz POST com nome trimado, entra na lista e abre o projeto', async () => {
    const detail = makeDetail({ id: 'proj-9', name: 'Novo Jogo' })
    const transport = createFakeTransport((path, init) => {
      if (path === '/projects' && init?.method === 'POST') return { project: detail }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createProjectStore(transport)

    const created = await store.getState().createProject('  Novo Jogo  ', 'game')

    expect(created).toBe(true)
    expect(transport.calls[0]?.body).toEqual({ name: 'Novo Jogo', kind: 'game' })
    const state = store.getState()
    expect(state.projects[0]?.id).toBe('proj-9')
    expect(state.activeProjectId).toBe('proj-9')
    expect(state.detail?.name).toBe('Novo Jogo')
    expect(state.creating).toBe(false)
  })

  it('erro no create (ex.: cota) vira createError e devolve false', async () => {
    const transport = createFakeTransport(() => {
      throw new PensaApiError('quota', 409, 'PENSA_QUOTA_EXCEEDED')
    })
    const store = createProjectStore(transport)

    const created = await store.getState().createProject('Meu Jogo', 'game')

    expect(created).toBe(false)
    expect(store.getState().createError).toContain('Arquive')
    expect(store.getState().activeProjectId).toBeNull()
  })

  it('openProject carrega o detalhe; erro vira detailError', async () => {
    const transport = createFakeTransport((path) => {
      if (path === '/projects/proj-1') return { project: makeDetail() }
      throw new PensaApiError('sumiu', 404, 'PENSA_NOT_FOUND')
    })
    const store = createProjectStore(transport)

    await store.getState().openProject('proj-1')
    expect(store.getState().detail?.id).toBe('proj-1')
    expect(store.getState().detailError).toBeNull()

    await store.getState().openProject('proj-2')
    expect(store.getState().detail).toBeNull()
    expect(store.getState().detailError).not.toBeNull()

    store.getState().closeProject()
    expect(store.getState().activeProjectId).toBeNull()
    expect(store.getState().detailError).toBeNull()
  })

  it('renameProject atualiza lista e detalhe aberto via PATCH', async () => {
    const renamed = makeDetail({ name: 'Nome Novo', currentCycle: makeCycle({ stage: 'e' }) })
    const transport = createFakeTransport((path, init) => {
      if (path === '/projects') return { projects: [makeListProject()] }
      if (path === '/projects/proj-1' && init?.method === 'PATCH') return { project: renamed }
      if (path === '/projects/proj-1') return { project: makeDetail() }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createProjectStore(transport)
    await store.getState().loadProjects()
    await store.getState().openProject('proj-1')

    const ok = await store.getState().renameProject('proj-1', '  Nome Novo  ')

    expect(ok).toBe(true)
    const patch = transport.calls.find((c) => c.method === 'PATCH')
    expect(patch?.body).toEqual({ name: 'Nome Novo' })
    expect(store.getState().projects[0]?.name).toBe('Nome Novo')
    expect(store.getState().projects[0]?.stage).toBe('e')
    expect(store.getState().detail?.name).toBe('Nome Novo')
  })

  it('archiveProject tira o projeto da lista (só ativos aparecem)', async () => {
    const transport = createFakeTransport((path, init) => {
      if (path === '/projects') {
        return { projects: [makeListProject(), makeListProject({ id: 'proj-2', name: 'Outro' })] }
      }
      if (path === '/projects/proj-1' && init?.method === 'PATCH') {
        expect(init.body).toEqual({ status: 'archived' })
        return { project: makeDetail({ status: 'archived' }) }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createProjectStore(transport)
    await store.getState().loadProjects()

    const ok = await store.getState().archiveProject('proj-1')

    expect(ok).toBe(true)
    expect(store.getState().projects.map((p) => p.id)).toEqual(['proj-2'])
    expect(store.getState().mutatingId).toBeNull()
  })

  it('erro no rename vira mutateError e devolve false', async () => {
    const transport = createFakeTransport(() => {
      throw new PensaApiError('sumiu', 404, 'PENSA_NOT_FOUND')
    })
    const store = createProjectStore(transport)

    const ok = await store.getState().renameProject('proj-1', 'Novo Nome')

    expect(ok).toBe(false)
    expect(store.getState().mutateError).not.toBeNull()
    expect(store.getState().mutatingId).toBeNull()
  })

  it('createCycle: POST {goal} → absorve o detalhe (Versão N+1 no Z)', async () => {
    const cycleTwo = makeCycle({ id: 'cycle-2', number: 2, goal: 'Mais fases', stage: 'z' })
    const upgraded = makeDetail({
      cycles: [makeCycle({ stage: 'done' }), cycleTwo],
      currentCycle: cycleTwo,
    })
    const transport = createFakeTransport((path, init) => {
      if (path === '/projects/proj-1') return { project: makeDetail() }
      if (path === '/projects/proj-1/cycles' && init?.method === 'POST') {
        return { project: upgraded }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createProjectStore(transport)
    await store.getState().openProject('proj-1')

    const ok = await store.getState().createCycle('proj-1', '  Mais fases  ')

    expect(ok).toBe(true)
    const post = transport.calls.find((call) => call.method === 'POST')
    expect(post?.path).toBe('/projects/proj-1/cycles')
    expect(post?.body).toEqual({ goal: 'Mais fases' })
    // Detalhe + lista absorvidos: o mapa volta ao Z da versão nova.
    expect(store.getState().detail?.currentCycle.number).toBe(2)
    expect(store.getState().detail?.currentCycle.stage).toBe('z')
    expect(store.getState().creatingCycle).toBe(false)
  })

  it('setBuildEnv: PATCH {buildEnv} → absorve o detalhe novo (lista + detalhe aberto)', async () => {
    const chosen = makeDetail({ buildEnv: 'studio' })
    const transport = createFakeTransport((path, init) => {
      if (path === '/projects/proj-1' && init?.method === 'PATCH') return { project: chosen }
      if (path === '/projects/proj-1') return { project: makeDetail({ buildEnv: null }) }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createProjectStore(transport)
    await store.getState().openProject('proj-1')
    expect(store.getState().detail?.buildEnv).toBeNull()

    const ok = await store.getState().setBuildEnv('proj-1', 'studio')

    expect(ok).toBe(true)
    const patch = transport.calls.find((call) => call.method === 'PATCH')
    expect(patch?.path).toBe('/projects/proj-1')
    expect(patch?.body).toEqual({ buildEnv: 'studio' })
    expect(store.getState().detail?.buildEnv).toBe('studio')
    expect(store.getState().settingBuildEnv).toBe(false)
    expect(store.getState().buildEnvError).toBeNull()
  })

  it('erro no setBuildEnv vira buildEnvError gentil e devolve false', async () => {
    const transport = createFakeTransport(() => {
      throw new PensaApiError('sumiu', 404, 'PENSA_NOT_FOUND')
    })
    const store = createProjectStore(transport)

    const ok = await store.getState().setBuildEnv('proj-1', 'embedded')

    expect(ok).toBe(false)
    expect(store.getState().buildEnvError).not.toBeNull()
    expect(store.getState().buildEnvError).not.toContain('sumiu')
    expect(store.getState().settingBuildEnv).toBe(false)
  })

  it('erro no createCycle (ciclo anterior não done) vira createCycleError', async () => {
    const transport = createFakeTransport(() => {
      throw new PensaApiError('não done', 409, 'PENSA_CYCLE_NOT_DONE')
    })
    const store = createProjectStore(transport)

    const ok = await store.getState().createCycle('proj-1', 'Mais fases')

    expect(ok).toBe(false)
    expect(store.getState().createCycleError).not.toBeNull()
    expect(store.getState().createCycleError).not.toContain('não done')
    expect(store.getState().creatingCycle).toBe(false)
  })
})
