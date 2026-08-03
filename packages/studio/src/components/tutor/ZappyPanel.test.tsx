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
        return response()
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
        return response()
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
        ask: async () => response(),
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
      ask: async () => tutorResponse,
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
      ask: async () => tutorResponse,
      feedback: async () => undefined,
    }

    const view = render(renderPanel(adapter))

    await view.findByText(tutorResponse.text)
    expect(view.queryByRole('button', { name: 'mostrar no console' })).toBeNull()
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
      ask: async () => response(),
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
      ask: async () => response(),
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
      ask: async () => oldAnswer.promise,
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
      ask: async () => response(),
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
})
