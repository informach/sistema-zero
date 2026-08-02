import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
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
  it('reutiliza o clientMessageId quando a mesma tentativa é reenviada', async () => {
    const ids: string[] = []
    const adapter: StudioTutorAdapter = {
      loadHistory: async () => [],
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
        loadHistory: async () => [],
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
      loadHistory: async () => [
        {
          id: tutorResponse.id,
          role: 'assistant',
          text: tutorResponse.text,
          createdAt: tutorResponse.createdAt,
          response: tutorResponse,
        },
      ],
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
})
