import { describe, expect, it } from 'bun:test'
import { PensaApiError } from '../core/types'
import {
  createFakeTransport,
  makeChecklistItem,
  makeChecklistItems,
  makeChecklistSeedArtifact,
  makeGamification,
  makeIdeaArtifact,
  makeStageView,
} from '../testing/fakeTransport'
import { createStageOStore } from './stageOStore'

/** Drena os microtasks pendentes (a busca da Carta da Ideia é fire-and-forget). */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

const STAGE_PATH = '/cycles/cycle-1/stages/o'
const GENERATE_PATH = '/cycles/cycle-1/artifacts/generate'
const ADVANCE_PATH = '/cycles/cycle-1/advance'
const Z_STAGE_PATH = '/cycles/cycle-1/stages/z'

describe('stageOStore.loadStage', () => {
  it('sem artefato checklist_seed: hasSeed false; com artefato: true (itens nulos)', async () => {
    const fresh = createStageOStore(
      createFakeTransport((path) => {
        if (path === STAGE_PATH) return makeStageView({ stage: 'o' })
        throw new Error(`rota inesperada: ${path}`)
      }),
    )
    await fresh.getState().loadStage('cycle-1')
    expect(fresh.getState().stageLoaded).toBe(true)
    expect(fresh.getState().hasSeed).toBe(false)

    const reloaded = createStageOStore(
      createFakeTransport((path) => {
        if (path === STAGE_PATH) {
          return makeStageView({ stage: 'o', artifacts: [makeChecklistSeedArtifact()] })
        }
        throw new Error(`rota inesperada: ${path}`)
      }),
    )
    await reloaded.getState().loadStage('cycle-1')
    expect(reloaded.getState().hasSeed).toBe(true)
    // Seed salva mas view sem itens vivos (edge raro) → fallback do re-seed.
    expect(reloaded.getState().items).toBeNull()
  })

  it('RELOAD re-hidrata os checks VIVOS da view (progresso preservado)', async () => {
    const live = makeChecklistItems().map((item, i) => (i === 0 ? { ...item, done: true } : item))
    const store = createStageOStore(
      createFakeTransport((path) => {
        if (path === STAGE_PATH) {
          return makeStageView({
            stage: 'o',
            artifacts: [makeChecklistSeedArtifact()],
            checklist: live,
          })
        }
        throw new Error(`rota inesperada: ${path}`)
      }),
    )
    await store.getState().loadStage('cycle-1')
    expect(store.getState().hasSeed).toBe(true)
    expect(store.getState().items).toHaveLength(live.length)
    expect(store.getState().items?.[0]?.done).toBe(true)
  })

  it('erro vira stageError gentil', async () => {
    const store = createStageOStore(
      createFakeTransport(() => {
        throw new PensaApiError('down', 500, 'INTERNAL_ERROR')
      }),
    )
    await store.getState().loadStage('cycle-1')
    expect(store.getState().stageError).not.toBeNull()
    expect(store.getState().stageError).not.toContain('down')
  })
})

describe('stageOStore.generateChecklist', () => {
  it('POST {type: checklist_seed, projectId} → itens com ids reais', async () => {
    const transport = createFakeTransport((path, init) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'o' })
      if (path === GENERATE_PATH && init?.method === 'POST') return { items: makeChecklistItems() }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageOStore(transport)
    await store.getState().loadStage('cycle-1')

    expect(await store.getState().generateChecklist('proj-1')).toBe(true)

    const generate = transport.calls.find((call) => call.path === GENERATE_PATH)
    expect(generate?.body).toEqual({ type: 'checklist_seed', projectId: 'proj-1' })
    expect(store.getState().items).toHaveLength(5)
    expect(store.getState().hasSeed).toBe(true)
  })

  it('erro vira generateError gentil e devolve false', async () => {
    const store = createStageOStore(
      createFakeTransport((path) => {
        if (path === STAGE_PATH) return makeStageView({ stage: 'o' })
        throw new PensaApiError('boom', 500, 'INTERNAL_ERROR')
      }),
    )
    await store.getState().loadStage('cycle-1')
    expect(await store.getState().generateChecklist('proj-1')).toBe(false)
    expect(store.getState().generateError).not.toBeNull()
  })
})

describe('stageOStore.toggleItem', () => {
  it('toggle OTIMISTA (muda antes da resposta) e absorve o item canônico', async () => {
    let release: (() => void) | null = null
    const transport = createFakeTransport((path, init) => {
      if (path === '/checklist/check-1' && init?.method === 'PATCH') {
        return new Promise((resolve) => {
          release = () =>
            resolve({
              item: makeChecklistItem({ done: true, doneAt: '2026-07-01T10:00:00.000Z' }),
            })
        })
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageOStore(transport)
    store.setState({
      cycleId: 'cycle-1',
      stageLoaded: true,
      hasSeed: true,
      items: makeChecklistItems(),
    })

    const promise = store.getState().toggleItem('check-1', true)
    // Otimista: o check muda ANTES do PATCH responder.
    expect(store.getState().items?.find((i) => i.id === 'check-1')?.done).toBe(true)

    if (!release) throw new Error('PATCH não capturado')
    ;(release as () => void)()
    expect(await promise).toBe(true)

    const patch = transport.calls.find((call) => call.method === 'PATCH')
    expect(patch?.path).toBe('/checklist/check-1')
    expect(patch?.body).toEqual({ done: true })
    expect(store.getState().items?.find((i) => i.id === 'check-1')?.doneAt).toBe(
      '2026-07-01T10:00:00.000Z',
    )
  })

  it('rollback no erro: o check volta como estava + toggleError gentil', async () => {
    const store = createStageOStore(
      createFakeTransport(() => {
        throw new PensaApiError('boom', 500, 'INTERNAL_ERROR')
      }),
    )
    store.setState({
      cycleId: 'cycle-1',
      stageLoaded: true,
      hasSeed: true,
      items: makeChecklistItems(),
    })

    expect(await store.getState().toggleItem('check-1', true)).toBe(false)

    expect(store.getState().items?.find((i) => i.id === 'check-1')?.done).toBe(false)
    expect(store.getState().toggleError).not.toBeNull()
    expect(store.getState().toggleError).not.toContain('boom')
  })
})

describe('stageOStore.advance', () => {
  it('POST {from: o} → launched + gamificação + Carta da Ideia em segundo plano', async () => {
    const transport = createFakeTransport((path, init) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'o' })
      if (path === ADVANCE_PATH && init?.method === 'POST') {
        return {
          cycle: { id: 'cycle-1', number: 1, goal: null, stage: 'done' },
          gamification: makeGamification({
            xpAwarded: 30,
            badgesUnlocked: [
              { slug: 'pensa-first-launch', unlockedAt: '2026-07-01T10:00:00.000Z' },
            ],
          }),
        }
      }
      if (path === Z_STAGE_PATH) {
        return makeStageView({ stage: 'z', artifacts: [makeIdeaArtifact()] })
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageOStore(transport)
    await store.getState().loadStage('cycle-1')

    expect(await store.getState().advance()).toBe(true)

    const post = transport.calls.find((call) => call.path === ADVANCE_PATH)
    expect(post?.body).toEqual({ from: 'o' })
    expect(store.getState().launched).toBe(true)
    expect(store.getState().gamification?.xpAwarded).toBe(30)
    expect(store.getState().gamification?.badgesUnlocked).toHaveLength(1)

    await flush()
    expect(store.getState().ideaText).toContain('Dino')
  })

  it('falha da carta não estraga a festa; gate reprovado vira advanceError', async () => {
    const transport = createFakeTransport((path, init) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'o' })
      if (path === ADVANCE_PATH && init?.method === 'POST') {
        return { cycle: { id: 'cycle-1', number: 1, goal: null, stage: 'done' } }
      }
      throw new PensaApiError('boom', 500, 'INTERNAL_ERROR')
    })
    const store = createStageOStore(transport)
    await store.getState().loadStage('cycle-1')
    expect(await store.getState().advance()).toBe(true)
    await flush()
    expect(store.getState().launched).toBe(true)
    expect(store.getState().ideaText).toBeNull()
    expect(store.getState().gamification).toBeNull()

    const failing = createFakeTransport((path) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'o' })
      throw new PensaApiError('gate', 409, 'PENSA_GATE_NOT_READY')
    })
    const store2 = createStageOStore(failing)
    await store2.getState().loadStage('cycle-1')
    expect(await store2.getState().advance()).toBe(false)
    expect(store2.getState().launched).toBe(false)
    expect(store2.getState().advanceError).not.toBeNull()
  })
})
