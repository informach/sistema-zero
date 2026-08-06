import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { type JSX, useEffect } from 'react'
import { createEmptyProject } from '#core'
import { useHighlightStore } from '../../state/highlightStore'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore } from '../../state/projectStore'
import type { StudioLayout } from '../../studio/layoutContext'
import { StudioLayoutProvider } from '../../studio/layoutContext'
import type {
  StudioTutorAdapter,
  StudioTutorConfig,
  StudioTutorLessonReference,
} from '../../studio/tutor'
import { StudioTutorProvider, useStudioTutor } from '../../studio/tutor'
import { ZappyPanel } from './ZappyPanel'

const WIDE: StudioLayout = { width: 1000, isNarrow: false, isCompact: false }

function OpenTutor(): null {
  const { setOpen } = useStudioTutor()
  useEffect(() => setOpen(true), [setOpen])
  return null
}

function renderPanel(
  adapter: StudioTutorAdapter,
  options: Omit<StudioTutorConfig, 'adapter'> = {},
): JSX.Element {
  const config: StudioTutorConfig = { adapter, ...options }
  return (
    <StudioLayoutProvider value={WIDE}>
      <StudioTutorProvider value={config}>
        <OpenTutor />
        <ZappyPanel />
      </StudioTutorProvider>
    </StudioLayoutProvider>
  )
}

function response() {
  return {
    id: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e099',
    text: 'Tente novamente com este bloco.',
    scope: 'block' as const,
    blockReferences: [],
    createdAt: new Date().toISOString(),
  }
}

/** Envelope do ask: a resposta vem com o saldo ao lado, nunca dentro dela. */
function answer(r: ReturnType<typeof response> | Record<string, unknown> = response()) {
  return { response: r as ReturnType<typeof response> }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  useProjectStore.setState({
    project: createEmptyProject('project-zappy-panel', 'Projeto Zappy'),
    isDirty: false,
    saveError: null,
  })
  useHighlightStore.getState().reset()
  useLogsStore.setState({ entries: [] })
})

afterEach(() => cleanup())

describe('ZappyPanel', () => {
  it('não envia pergunta antes de concluir o carregamento inicial do histórico', async () => {
    const history = deferred<Awaited<ReturnType<StudioTutorAdapter['loadHistory']>>>()
    let asked = 0
    const adapter: StudioTutorAdapter = {
      loadHistory: async () => history.promise,
      deleteHistory: async () => undefined,
      ask: async () => {
        asked += 1
        return answer()
      },
      feedback: async () => undefined,
    }
    const view = render(renderPanel(adapter, { cooldownMs: 0 }))
    const question = await view.findByLabelText('Sua dúvida para o Zappy')
    if (!(question instanceof HTMLTextAreaElement)) throw new Error('Campo do Zappy inválido')
    const form = question.closest('form')
    if (!form) throw new Error('Formulário do Zappy ausente')

    fireEvent.change(question, { target: { value: 'Como faço o pulo?' } })
    fireEvent.submit(form)
    expect(asked).toBe(0)

    await act(async () => {
      history.resolve({ messages: [], nextCursor: null })
      await history.promise
    })
    fireEvent.submit(form)
    await waitFor(() => expect(asked).toBe(1))
  })

  it('reutiliza o clientMessageId quando a mesma tentativa é reenviada', async () => {
    const ids: string[] = []
    const adapter: StudioTutorAdapter = {
      loadHistory: async () => ({ messages: [], nextCursor: null }),
      deleteHistory: async () => undefined,
      ask: async (input) => {
        ids.push(input.clientMessageId)
        if (ids.length === 1) throw new Error('resposta perdida')
        return answer()
      },
      feedback: async () => undefined,
    }
    const view = render(renderPanel(adapter))
    const question = await view.findByLabelText('Sua dúvida para o Zappy')
    if (!(question instanceof HTMLTextAreaElement)) throw new Error('Campo do Zappy inválido')
    const form = question.closest('form')
    if (!form) throw new Error('Formulário do Zappy ausente')

    fireEvent.change(question, { target: { value: 'Como faço o pulo?' } })
    fireEvent.submit(form)
    await waitFor(() => expect(question.value).toBe('Como faço o pulo?'))
    fireEvent.submit(form)
    await waitFor(() => expect(ids).toHaveLength(2))

    expect(ids[1]).toBe(ids[0])
  })

  it('não mantém intervalo ativo depois que o cooldown termina', async () => {
    const intervalSpy = spyOn(window, 'setInterval')

    try {
      const adapter: StudioTutorAdapter = {
        loadHistory: async () => ({ messages: [], nextCursor: null }),
        deleteHistory: async () => undefined,
        ask: async () => answer(),
        feedback: async () => undefined,
      }
      const view = render(renderPanel(adapter, { cooldownMs: 20 }))
      const question = await view.findByLabelText('Sua dúvida para o Zappy')
      if (!(question instanceof HTMLTextAreaElement)) throw new Error('Campo do Zappy inválido')
      const form = question.closest('form')
      if (!form) throw new Error('Formulário do Zappy ausente')
      fireEvent.change(question, { target: { value: 'Como faço o pulo?' } })
      fireEvent.submit(form)

      await view.findByText('Tente novamente com este bloco.')
      await waitFor(() => expect(view.getByText(/Enter envia/)).toBeTruthy(), {
        timeout: 1_000,
      })
      expect(intervalSpy.mock.calls.some((call) => call[1] === 250)).toBe(false)
    } finally {
      intervalSpy.mockRestore()
    }
  })

  it('abre referência de aula navegável pelo callback do host', async () => {
    const reference: StudioTutorLessonReference = {
      courseId: 'course-1',
      courseSlug: 'logica-divertida',
      lessonId: 'lesson-1',
      title: 'Criando movimentos',
    }
    const opened: StudioTutorLessonReference[] = []
    const tutorResponse = { ...response(), lessonReferences: [reference] }
    const adapter: StudioTutorAdapter = {
      loadHistory: async () => ({
        messages: [
          {
            id: tutorResponse.id,
            role: 'assistant',
            text: tutorResponse.text,
            createdAt: tutorResponse.createdAt,
            response: tutorResponse,
          },
        ],
        nextCursor: null,
      }),
      deleteHistory: async () => undefined,
      ask: async () => answer(tutorResponse),
      feedback: async () => undefined,
    }
    const view = render(
      renderPanel(adapter, {
        openLesson: (lesson) => {
          opened.push(lesson)
        },
      }),
    )

    fireEvent.click(await view.findByText('Aula: Criando movimentos ↗'))

    expect(opened).toEqual([reference])
  })

  it('não mostra referência Blockly histórica em projeto Pro', async () => {
    const proProject = {
      ...createEmptyProject('project-pro', 'Projeto Pro'),
      kind: 'pro' as const,
      mode: 'code' as const,
      tree: { 'src/index.ts': { kind: 'file' as const, content: '' } },
    }
    useProjectStore.setState({ project: proProject })
    const tutorResponse = {
      ...response(),
      blockReferences: [
        {
          blockType: 'sz_js_log',
          name: 'mostrar no console',
          category: 'Saída',
          area: 'Código',
        },
      ],
    }
    const adapter: StudioTutorAdapter = {
      loadHistory: async () => ({
        messages: [
          {
            id: tutorResponse.id,
            role: 'assistant',
            text: tutorResponse.text,
            createdAt: tutorResponse.createdAt,
            response: tutorResponse,
          },
        ],
        nextCursor: null,
      }),
      deleteHistory: async () => undefined,
      ask: async () => answer(tutorResponse),
      feedback: async () => undefined,
    }

    const view = render(renderPanel(adapter))

    await view.findByText(tutorResponse.text)
    expect(view.queryByRole('button', { name: 'mostrar no console' })).toBeNull()
  })

  it('mostra a categoria e a subcategoria do bloco citado', async () => {
    const tutorResponse = {
      ...response(),
      blockReferences: [
        {
          blockType: 'sz_g2d_create_sprite',
          name: 'criar sprite',
          category: 'Jogo 2D',
          subcategory: '🎮 Sprites',
          area: 'Código',
        },
      ],
    }
    const adapter: StudioTutorAdapter = {
      loadHistory: async () => ({
        messages: [
          {
            id: tutorResponse.id,
            role: 'assistant',
            text: tutorResponse.text,
            createdAt: tutorResponse.createdAt,
            response: tutorResponse,
          },
        ],
        nextCursor: null,
      }),
      deleteHistory: async () => undefined,
      ask: async () => answer(tutorResponse),
      feedback: async () => undefined,
    }

    const view = render(renderPanel(adapter))

    await view.findByText('criar sprite')
    expect(view.getByText('Jogo 2D › 🎮 Sprites')).toBeTruthy()
  })

  it('não repete a categoria quando a subcategoria é igual', async () => {
    const tutorResponse = {
      ...response(),
      blockReferences: [
        {
          blockType: 'sz_js_log',
          name: 'mostrar no console',
          category: 'Programação',
          subcategory: 'Programação',
          area: 'Código',
        },
      ],
    }
    const adapter: StudioTutorAdapter = {
      loadHistory: async () => ({
        messages: [
          {
            id: tutorResponse.id,
            role: 'assistant',
            text: tutorResponse.text,
            createdAt: tutorResponse.createdAt,
            response: tutorResponse,
          },
        ],
        nextCursor: null,
      }),
      deleteHistory: async () => undefined,
      ask: async () => answer(tutorResponse),
      feedback: async () => undefined,
    }

    const view = render(renderPanel(adapter))

    await view.findByText('mostrar no console')
    expect(view.queryByText('Programação › Programação')).toBeNull()
    expect(view.getByText('Programação')).toBeTruthy()
  })

  it('exige confirmação antes de apagar todo o histórico', async () => {
    let deleted = 0
    const adapter: StudioTutorAdapter = {
      loadHistory: async () => ({
        messages: [
          {
            id: 'message-1',
            role: 'user',
            text: 'Como faço o pulo?',
            createdAt: new Date().toISOString(),
          },
        ],
        nextCursor: null,
      }),
      deleteHistory: async () => {
        deleted += 1
      },
      ask: async () => answer(),
      feedback: async () => undefined,
    }
    const view = render(renderPanel(adapter))

    fireEvent.click(await view.findByText('Apagar'))
    expect(deleted).toBe(0)

    fireEvent.click(await view.findByText('Confirmar exclusão'))
    await waitFor(() => expect(deleted).toBe(1))
  })

  it('carrega mensagens anteriores usando o cursor devolvido pelo host', async () => {
    const cursors: Array<string | undefined> = []
    const adapter: StudioTutorAdapter = {
      loadHistory: async (_projectId, before) => {
        cursors.push(before)
        return before
          ? {
              messages: [
                {
                  id: 'old-message',
                  role: 'user',
                  text: 'Mensagem anterior',
                  createdAt: '2026-08-01T12:00:00Z',
                },
              ],
              nextCursor: null,
            }
          : {
              messages: [
                {
                  id: 'new-message',
                  role: 'user',
                  text: 'Mensagem recente',
                  createdAt: '2026-08-02T12:00:00Z',
                },
              ],
              nextCursor: 'new-message',
            }
      },
      deleteHistory: async () => undefined,
      ask: async () => answer(),
      feedback: async () => undefined,
    }
    const view = render(renderPanel(adapter))

    fireEvent.click(await view.findByText('Carregar mensagens anteriores'))

    await view.findByText('Mensagem anterior')
    expect(view.getByText('Mensagem recente')).toBeTruthy()
    expect(cursors).toEqual([undefined, 'new-message'])
  })

  it('ignora resposta da pergunta quando o projeto troca durante a chamada', async () => {
    const oldAnswer = deferred<ReturnType<typeof response>>()
    const adapter: StudioTutorAdapter = {
      loadHistory: async (projectId) => ({
        messages:
          projectId === 'project-b'
            ? [
                {
                  id: 'project-b-message',
                  role: 'user',
                  text: 'Histórico do projeto B',
                  createdAt: '2026-08-02T12:00:00Z',
                },
              ]
            : [],
        nextCursor: null,
      }),
      deleteHistory: async () => undefined,
      ask: async () => answer(await oldAnswer.promise),
      feedback: async () => undefined,
    }
    const view = render(renderPanel(adapter, { cooldownMs: 0 }))
    const question = await view.findByLabelText('Sua dúvida para o Zappy')
    if (!(question instanceof HTMLTextAreaElement)) throw new Error('Campo do Zappy inválido')
    const form = question.closest('form')
    if (!form) throw new Error('Formulário do Zappy ausente')
    fireEvent.change(question, { target: { value: 'Pergunta do projeto A' } })
    fireEvent.submit(form)
    await view.findByText('Pergunta do projeto A')

    act(() => {
      useProjectStore.setState({ project: createEmptyProject('project-b', 'Projeto B') })
    })
    await view.findByText('Histórico do projeto B')
    await act(async () => {
      oldAnswer.resolve({ ...response(), text: 'Resposta atrasada do projeto A' })
      await oldAnswer.promise
    })

    expect(view.queryByText('Resposta atrasada do projeto A')).toBeNull()
    expect(view.getByText('Histórico do projeto B')).toBeTruthy()
  })

  it('ignora página antiga quando o projeto troca durante a paginação', async () => {
    const oldPage = deferred<Awaited<ReturnType<StudioTutorAdapter['loadHistory']>>>()
    const adapter: StudioTutorAdapter = {
      loadHistory: async (projectId, before) => {
        if (projectId === 'project-zappy-panel' && before) return oldPage.promise
        return projectId === 'project-b'
          ? {
              messages: [
                {
                  id: 'project-b-message',
                  role: 'user',
                  text: 'Histórico do projeto B',
                  createdAt: '2026-08-02T12:00:00Z',
                },
              ],
              nextCursor: null,
            }
          : { messages: [], nextCursor: 'cursor-a' }
      },
      deleteHistory: async () => undefined,
      ask: async () => answer(),
      feedback: async () => undefined,
    }
    const view = render(renderPanel(adapter))
    fireEvent.click(await view.findByText('Carregar mensagens anteriores'))

    act(() => {
      useProjectStore.setState({ project: createEmptyProject('project-b', 'Projeto B') })
    })
    await view.findByText('Histórico do projeto B')
    await act(async () => {
      oldPage.resolve({
        messages: [
          {
            id: 'old-project-message',
            role: 'user',
            text: 'Página atrasada do projeto A',
            createdAt: '2026-08-01T12:00:00Z',
          },
        ],
        nextCursor: null,
      })
      await oldPage.promise
    })

    expect(view.queryByText('Página atrasada do projeto A')).toBeNull()
    expect(view.getByText('Histórico do projeto B')).toBeTruthy()
  })

  it('chips de sugestão PREENCHEM o campo sem enviar (e só a última resposta mostra)', async () => {
    let asked = 0
    const adapter: StudioTutorAdapter = {
      loadHistory: async () => ({
        messages: [
          {
            id: 'q1',
            role: 'user',
            text: 'Como faço ele pular?',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'a1',
            role: 'assistant',
            text: 'Primeira resposta.',
            createdAt: new Date().toISOString(),
            response: {
              ...response(),
              id: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e001',
              suggestions: ['Sugestão antiga'],
            },
          },
          {
            id: 'a2',
            role: 'assistant',
            text: 'Use o bloco de pular.',
            createdAt: new Date().toISOString(),
            response: { ...response(), suggestions: ['Como faço ele atirar?'] },
          },
        ],
        nextCursor: null,
      }),
      deleteHistory: async () => undefined,
      ask: async () => {
        asked += 1
        return answer()
      },
      feedback: async () => undefined,
    }
    const view = render(renderPanel(adapter, { cooldownMs: 0 }))
    const chip = await view.findByRole('button', { name: 'Como faço ele atirar?' })
    // Só as sugestões da ÚLTIMA resposta viram chips.
    expect(view.queryByRole('button', { name: 'Sugestão antiga' })).toBeNull()
    fireEvent.click(chip)
    const question = view.getByLabelText('Sua dúvida para o Zappy')
    if (!(question instanceof HTMLTextAreaElement)) throw new Error('Campo do Zappy inválido')
    // Preenche e NÃO envia (cooldown/quota intactos; a criança revisa).
    expect(question.value).toBe('Como faço ele atirar?')
    expect(asked).toBe(0)
  })

  it('estado vazio oferece perguntas iniciais que preenchem o campo', async () => {
    const adapter: StudioTutorAdapter = {
      loadHistory: async () => ({ messages: [], nextCursor: null }),
      deleteHistory: async () => undefined,
      ask: async () => answer(),
      feedback: async () => undefined,
    }
    const view = render(renderPanel(adapter, { cooldownMs: 0 }))
    const starter = await view.findByRole('button', { name: 'Como faço meu personagem pular?' })
    fireEvent.click(starter)
    const question = view.getByLabelText('Sua dúvida para o Zappy')
    if (!(question instanceof HTMLTextAreaElement)) throw new Error('Campo do Zappy inválido')
    expect(question.value).toBe('Como faço meu personagem pular?')
  })

  const CREDITS = {
    dayLimit: 50,
    dayRemaining: 13,
    monthLimit: 500,
    monthRemaining: 300,
    monthRenewsOn: '2026-09-01',
  }

  function silentAdapter(): StudioTutorAdapter {
    return {
      loadHistory: async () => ({ messages: [], nextCursor: null }),
      deleteHistory: async () => undefined,
      ask: async () => answer(),
      feedback: async () => undefined,
    }
  }

  it('mostra quanta ajuda resta, FORA da região que é anunciada a cada resposta', async () => {
    const view = render(renderPanel(silentAdapter(), { credits: CREDITS }))
    const medidor = await view.findByText('✨ 13 ideias hoje')
    // Dentro do aria-live, o leitor de tela repetiria o contador junto de toda
    // mensagem nova. O medidor tem que ficar fora dele.
    expect(medidor.closest('[aria-live]')).toBeNull()
  })

  it('sem saber o saldo, o medidor some (nunca mostra zero)', async () => {
    const view = render(renderPanel(silentAdapter(), { credits: null }))
    await view.findByLabelText('Sua dúvida para o Zappy')
    expect(view.queryByText(/ideias/)).toBeNull()
  })

  it('equipe vê "sem limite" em vez de número', async () => {
    const view = render(
      renderPanel(silentAdapter(), {
        credits: { ...CREDITS, dayRemaining: 0, monthRemaining: 0, unlimited: true },
      }),
    )
    expect(await view.findByText('✨ ideias sem limite')).toBeTruthy()
  })

  it('uma resposta sem saldo novo NÃO zera o medidor', async () => {
    const adapter: StudioTutorAdapter = { ...silentAdapter(), ask: async () => answer() }
    const view = render(renderPanel(adapter, { credits: CREDITS, cooldownMs: 0 }))
    const question = await view.findByLabelText('Sua dúvida para o Zappy')
    if (!(question instanceof HTMLTextAreaElement)) throw new Error('Campo do Zappy inválido')
    const form = question.closest('form')
    if (!form) throw new Error('Formulário do Zappy ausente')

    fireEvent.change(question, { target: { value: 'Como faço o pulo?' } })
    fireEvent.submit(form)
    await view.findByText('Tente novamente com este bloco.')
    // O ask não trouxe `credits` (nada foi consumido): mantém o que já tinha.
    expect(view.getByText('✨ 13 ideias hoje')).toBeTruthy()
  })

  it('aviso de limite não é aula: sem polegares e com cara de recado', async () => {
    const quota = {
      id: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e0aa',
      text: 'Por hoje a gente já estudou bastante! Amanhã tem mais 🤖',
      scope: 'quota' as const,
      blockReferences: [],
      createdAt: new Date().toISOString(),
    }
    const adapter: StudioTutorAdapter = {
      ...silentAdapter(),
      ask: async () => ({ response: quota, credits: { ...CREDITS, dayRemaining: 0 } }),
    }
    const view = render(renderPanel(adapter, { credits: CREDITS, cooldownMs: 0 }))
    const question = await view.findByLabelText('Sua dúvida para o Zappy')
    if (!(question instanceof HTMLTextAreaElement)) throw new Error('Campo do Zappy inválido')
    const form = question.closest('form')
    if (!form) throw new Error('Formulário do Zappy ausente')

    fireEvent.change(question, { target: { value: 'Como faço o pulo?' } })
    fireEvent.submit(form)
    await view.findByText(quota.text)

    // Pedir "isso ajudou?" para "acabou a ajuda" é cruel — e o polegar viraria
    // avaliação de qualidade sobre um aviso operacional.
    expect(view.queryByLabelText('A resposta ajudou')).toBeNull()
    expect(view.queryByLabelText('A resposta não ajudou')).toBeNull()
    // O saldo fresco chegou junto: o medidor vira o aviso de esgotado.
    expect(view.getByText('⚠️ As ideias de hoje acabaram')).toBeTruthy()
  })

  it('esgotado, o rodapé diz quando volta e o botão CONTINUA habilitado', async () => {
    const view = render(renderPanel(silentAdapter(), { credits: { ...CREDITS, dayRemaining: 0 } }))
    expect(await view.findByText('Amanhã de manhã tem mais.')).toBeTruthy()
    const question = view.getByLabelText('Sua dúvida para o Zappy')
    if (!(question instanceof HTMLTextAreaElement)) throw new Error('Campo do Zappy inválido')
    fireEvent.change(question, { target: { value: 'Tenho outra dúvida' } })
    // O servidor é a autoridade: um saldo velho numa aba aberta desde ontem não
    // pode trancar a criança de graça.
    const enviar = view.getByRole('button', { name: 'Perguntar' })
    expect(enviar.hasAttribute('disabled')).toBe(false)
  })
})
