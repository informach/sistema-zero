import { describe, expect, it } from 'bun:test'
import { PensaApiError } from '../core/types'
import {
  createFakeTransport,
  type FakeChatEvent,
  makeIdeaArtifact,
  makeStageView,
  makeZState,
} from '../testing/fakeTransport'
import { createChatStore, parseZState } from './chatStore'

/** Drena a fila assíncrona do fake (um macrotask fecha todos os microtasks). */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

const STAGE_PATH = '/cycles/cycle-1/stages/z'

describe('parseZState', () => {
  it('aceita o shape do contrato e rejeita objeto vazio/malformado', () => {
    expect(parseZState({})).toBeNull()
    expect(parseZState(null)).toBeNull()
    expect(parseZState({ answered: { who: true }, ready: false })).toBeNull()
    const full = makeZState({ answered: { who: true }, ready: false })
    expect(parseZState(full)).toEqual(full)
  })
})

describe('chatStore.loadStage', () => {
  it('popula messages/summary/state/chips/ideaArtifact do PensaStageView', async () => {
    const view = makeStageView({
      conversation: {
        messages: [
          { role: 'user', content: 'Um jogo de dino', at: '2026-06-30T12:00:00.000Z' },
          {
            role: 'assistant',
            content: 'Adorei! Quem joga?\nSUGESTÕES: Eu | Meus amigos',
            at: '2026-06-30T12:00:01.000Z',
          },
        ],
        summary: 'resumo antigo',
        messageCount: 12,
      },
      state: makeZState({ answered: { who: true } }),
      artifacts: [makeIdeaArtifact()],
    })
    const transport = createFakeTransport((path) => {
      if (path === STAGE_PATH) return view
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createChatStore(transport)

    await store.getState().loadStage('cycle-1')

    const state = store.getState()
    expect(state.stageLoaded).toBe(true)
    expect(state.loadingStage).toBe(false)
    expect(state.messages).toHaveLength(2)
    expect(state.summary).toBe('resumo antigo')
    expect(state.zState?.answered.who).toBe(true)
    expect(state.chips).toEqual(['Eu', 'Meus amigos'])
    expect(state.ideaArtifact?.type).toBe('idea')
    expect(transport.calls).toEqual([{ path: STAGE_PATH, method: 'GET', body: undefined }])
  })

  it('estado {} (etapa nova) vira zState null; erro vira stageError gentil', async () => {
    let fail = true
    const transport = createFakeTransport(() => {
      if (fail) throw new PensaApiError('down', 500, 'INTERNAL_ERROR')
      return makeStageView()
    })
    const store = createChatStore(transport)

    await store.getState().loadStage('cycle-1')
    expect(store.getState().stageError).not.toBeNull()
    expect(store.getState().stageError).not.toContain('down')
    expect(store.getState().stageLoaded).toBe(false)

    fail = false
    await store.getState().loadStage('cycle-1')
    expect(store.getState().stageError).toBeNull()
    expect(store.getState().stageLoaded).toBe(true)
    expect(store.getState().zState).toBeNull()
  })
})

describe('chatStore.send', () => {
  it('turno feliz: deltas acumulam, state atualiza e o done fecha mensagem + chips', async () => {
    const transport = createFakeTransport(
      (path) => {
        if (path === STAGE_PATH) return makeStageView()
        throw new Error(`rota inesperada: ${path}`)
      },
      {
        chatScript: () => [
          { kind: 'delta', text: 'Que ideia boa! ' },
          { kind: 'delta', text: 'Quem vai jogar?\n' },
          { kind: 'delta', text: 'SUGESTÕES: Eu | Meus amigos | Todo mundo' },
          { kind: 'state', state: makeZState({ answered: { who: true } }) },
          { kind: 'done' },
        ],
      },
    )
    const store = createChatStore(transport)
    await store.getState().loadStage('cycle-1')

    store.getState().send('proj-1', '  Um jogo de dino  ')

    // Mensagem otimista da criança + sending ligado antes de qualquer evento.
    expect(store.getState().sending).toBe(true)
    expect(store.getState().messages).toHaveLength(1)
    expect(store.getState().messages[0]).toMatchObject({ role: 'user', content: 'Um jogo de dino' })
    expect(store.getState().chips).toEqual([])
    expect(transport.chatCalls).toEqual([
      { projectId: 'proj-1', cycleId: 'cycle-1', stage: 'z', message: 'Um jogo de dino' },
    ])

    await flush()

    const state = store.getState()
    expect(state.sending).toBe(false)
    expect(state.streamingText).toBe('')
    expect(state.messages).toHaveLength(2)
    // A mensagem do assistente guarda o conteúdo CRU (com a linha SUGESTÕES:).
    expect(state.messages[1]?.content).toBe(
      'Que ideia boa! Quem vai jogar?\nSUGESTÕES: Eu | Meus amigos | Todo mundo',
    )
    expect(state.chips).toEqual(['Eu', 'Meus amigos', 'Todo mundo'])
    expect(state.zState?.answered.who).toBe(true)
    expect(state.chatError).toBeNull()
  })

  it('erro no stream: remove a mensagem otimista, seta chatError e retry reenvia', async () => {
    let turn = 0
    const transport = createFakeTransport(
      (path) => {
        if (path === STAGE_PATH) return makeStageView()
        throw new Error(`rota inesperada: ${path}`)
      },
      {
        chatScript: (): FakeChatEvent[] => {
          turn += 1
          if (turn === 1) {
            return [
              { kind: 'delta', text: 'Come' },
              { kind: 'error', error: new PensaApiError('ia caiu', 503, 'PENSA_AI_UNAVAILABLE') },
            ]
          }
          return [{ kind: 'delta', text: 'Agora foi!' }, { kind: 'done' }]
        },
      },
    )
    const store = createChatStore(transport)
    await store.getState().loadStage('cycle-1')

    store.getState().send('proj-1', 'Um jogo de nave')
    await flush()

    let state = store.getState()
    expect(state.sending).toBe(false)
    expect(state.messages).toHaveLength(0) // otimista removida
    expect(state.streamingText).toBe('')
    expect(state.chatError).not.toBeNull()
    expect(state.chatError).not.toContain('ia caiu')
    expect(state.lastFailedMessage).toBe('Um jogo de nave')

    store.getState().retry('proj-1')
    expect(store.getState().chatError).toBeNull()
    await flush()

    state = store.getState()
    expect(transport.chatCalls).toHaveLength(2)
    expect(transport.chatCalls[1]?.message).toBe('Um jogo de nave')
    expect(state.messages).toHaveLength(2)
    expect(state.messages[1]?.content).toBe('Agora foi!')
  })

  it('transport sem streaming (lança síncrono) vira chatError gentil', async () => {
    const transport = createFakeTransport((path) => {
      if (path === STAGE_PATH) return makeStageView()
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createChatStore(transport)
    await store.getState().loadStage('cycle-1')

    store.getState().send('proj-1', 'Oi')

    expect(store.getState().sending).toBe(false)
    expect(store.getState().messages).toHaveLength(0)
    expect(store.getState().chatError).not.toBeNull()
  })

  it('cancel aborta o turno em voo e remove a mensagem otimista', async () => {
    const transport = createFakeTransport(
      (path) => {
        if (path === STAGE_PATH) return makeStageView()
        throw new Error(`rota inesperada: ${path}`)
      },
      // Sem 'done': o turno fica em voo até o abort.
      { chatScript: () => [{ kind: 'delta', text: 'Pensando...' }] },
    )
    const store = createChatStore(transport)
    await store.getState().loadStage('cycle-1')

    store.getState().send('proj-1', 'Um jogo de pegar coisas')
    await flush()
    expect(store.getState().sending).toBe(true)

    store.getState().cancel()

    expect(transport.aborted).toBe(1)
    expect(store.getState().sending).toBe(false)
    expect(store.getState().messages).toHaveLength(0)
    expect(store.getState().chatError).toBeNull()
    expect(store.getState().lastFailedMessage).toBe('Um jogo de pegar coisas')
  })

  it('não envia vazio nem com turno em andamento', async () => {
    const transport = createFakeTransport(
      (path) => {
        if (path === STAGE_PATH) return makeStageView()
        throw new Error(`rota inesperada: ${path}`)
      },
      { chatScript: () => [{ kind: 'delta', text: 'oi' }] },
    )
    const store = createChatStore(transport)
    await store.getState().loadStage('cycle-1')

    store.getState().send('proj-1', '   ')
    expect(transport.chatCalls).toHaveLength(0)

    store.getState().send('proj-1', 'Primeira')
    store.getState().send('proj-1', 'Segunda')
    expect(transport.chatCalls).toHaveLength(1)
  })
})

describe('chatStore: Carta da Ideia', () => {
  function makeTransport() {
    return createFakeTransport((path, init) => {
      if (path === STAGE_PATH) {
        return makeStageView({ state: makeZState({ ready: true }) })
      }
      if (path === '/cycles/cycle-1/artifacts/generate' && init?.method === 'POST') {
        return { artifact: makeIdeaArtifact({ version: 2 }) }
      }
      if (path === '/cycles/cycle-1/artifacts/idea/validate' && init?.method === 'POST') {
        return { artifact: makeIdeaArtifact({ status: 'validated' }) }
      }
      if (path === '/cycles/cycle-1/advance' && init?.method === 'POST') {
        return { cycle: { id: 'cycle-1', number: 1, goal: null, stage: 'e' } }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
  }

  it('generateIdea faz POST {type: idea} e guarda o artefato', async () => {
    const transport = makeTransport()
    const store = createChatStore(transport)
    await store.getState().loadStage('cycle-1')

    const ok = await store.getState().generateIdea()

    expect(ok).toBe(true)
    expect(store.getState().ideaArtifact?.version).toBe(2)
    expect(store.getState().generatingIdea).toBe(false)
    const post = transport.calls.find((c) => c.path === '/cycles/cycle-1/artifacts/generate')
    expect(post?.body).toEqual({ type: 'idea' })
  })

  it('generateIdea com 409 PENSA_NOT_READY vira ideaError gentil', async () => {
    const transport = createFakeTransport((path) => {
      if (path === STAGE_PATH) return makeStageView()
      throw new PensaApiError('not ready', 409, 'PENSA_NOT_READY')
    })
    const store = createChatStore(transport)
    await store.getState().loadStage('cycle-1')

    const ok = await store.getState().generateIdea()

    expect(ok).toBe(false)
    expect(store.getState().ideaArtifact).toBeNull()
    expect(store.getState().ideaError).toContain('respostas')
  })

  it('validateIdea atualiza o status para validated', async () => {
    const transport = makeTransport()
    const store = createChatStore(transport)
    await store.getState().loadStage('cycle-1')

    const ok = await store.getState().validateIdea()

    expect(ok).toBe(true)
    expect(store.getState().ideaArtifact?.status).toBe('validated')
    expect(
      transport.calls.some(
        (c) => c.path === '/cycles/cycle-1/artifacts/idea/validate' && c.method === 'POST',
      ),
    ).toBe(true)
  })

  it('advance faz POST {from: z} e devolve true; gate reprovado vira ideaError', async () => {
    const transport = makeTransport()
    const store = createChatStore(transport)
    await store.getState().loadStage('cycle-1')

    expect(await store.getState().advance()).toBe(true)
    const post = transport.calls.find((c) => c.path === '/cycles/cycle-1/advance')
    expect(post?.body).toEqual({ from: 'z' })

    const failing = createFakeTransport((path) => {
      if (path === STAGE_PATH) return makeStageView()
      throw new PensaApiError('gate', 409, 'PENSA_GATE_NOT_READY')
    })
    const store2 = createChatStore(failing)
    await store2.getState().loadStage('cycle-1')
    expect(await store2.getState().advance()).toBe(false)
    expect(store2.getState().ideaError).not.toBeNull()
  })
})
