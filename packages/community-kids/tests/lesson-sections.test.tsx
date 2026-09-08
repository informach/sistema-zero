import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  type InteractiveBlock,
  type LearningAnswers,
  type LearningBlockProgress,
  publicInteractiveBlock,
} from '@sistemazero/core/learning'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { LearningExperiment } from '@sistemazero/member-shell/components/learning-experiment'
import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
} from '@sistemazero/member-shell/components/lesson-player-context'
import {
  LessonSections,
  useLessonLearning,
} from '@sistemazero/member-shell/components/lesson-sections'
import type { LessonDetailView } from '@sistemazero/member-shell/lib/types'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

const lesson: LessonDetailView = {
  id: 'lesson',
  slug: 'aula',
  courseSlug: 'curso',
  moduleId: 'unit',
  title: 'Meu jogo',
  completed: false,
  positionSeconds: null,
  estimatedMinutes: null,
  attachments: [],
  blocks: [{ id: 'project', kind: 'studio', sortOrder: 0, content: { kind: 'studio' } }],
  sections: [
    {
      id: 'first',
      title: 'Preparar',
      objective: '',
      intent: 'application',
      externalTool: null,
      pendingMedia: [],
      blockIds: ['project'],
      workspaceBlockId: 'project',
    },
    {
      id: 'second',
      title: 'Observar',
      objective: '',
      intent: 'exploration',
      workspaceBlockId: null,
      externalTool: null,
      pendingMedia: [],
      blockIds: [],
    },
    {
      id: 'third',
      title: 'Melhorar',
      objective: '',
      intent: 'application',
      externalTool: null,
      pendingMedia: [],
      blockIds: [],
      workspaceBlockId: 'project',
    },
  ],
}
const player: LessonPlayerContextValue = {
  lessonId: lesson.id,
  courseSlug: lesson.courseSlug,
  viewerId: 'child-a',
  viewerWatermark: null,
  initialPositionSeconds: null,
}
const prediction: InteractiveBlock = {
  kind: 'interactive',
  title: 'Antes de testar',
  instructions: 'Escolha uma ideia.',
  required: false,
  hints: ['Pense na direção.'],
  activity: {
    type: 'prediction',
    choices: [
      { id: 'up', label: 'Sobe' },
      { id: 'down', label: 'Desce' },
    ],
    outcome: 'Agora observe o movimento.',
  },
}
const originalFetch = globalThis.fetch
beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
})

describe('aula por seções', () => {
  test('uma resposta atrasada do perfil anterior não apaga o progresso do perfil atual', () => {
    const handlers = new Map<string, (value: LearningBlockProgress) => void>()
    const scopedLesson = {
      ...lesson,
      blocks: [
        {
          id: 'activity',
          kind: 'interactive',
          blockRevision: 'revision',
          sortOrder: 0,
          content: publicInteractiveBlock(prediction),
        },
      ],
    }
    function Host({ viewer }: { viewer: string }) {
      const learning = useLessonLearning(scopedLesson, viewer)
      handlers.set(viewer, learning.onProgress)
      return (
        <output aria-label="Progresso atual">
          {String(learning.progress.blocks[0]?.answers.prediction ?? 'Sem resposta')}
        </output>
      )
    }
    const update: LearningBlockProgress = {
      blockId: 'activity',
      revision: 'revision',
      positionSeconds: null,
      answers: { prediction: 'down' },
      hintsUsed: 0,
      attemptsCount: 0,
      result: null,
      updatedAt: '2026-09-08T15:00:00Z',
    }
    const view = render(<Host viewer="child-a" />)
    const previous = handlers.get('child-a')!
    view.rerender(<Host viewer="child-b" />)
    act(() => handlers.get('child-b')!(update))
    expect(screen.getByLabelText('Progresso atual').textContent).toBe('down')
    act(() => previous({ ...update, answers: { prediction: 'up' } }))
    expect(screen.getByLabelText('Progresso atual').textContent).toBe('down')
  })
  test('a prévia da sequência permite conferir os blocos completos de autoria', () => {
    render(
      <LessonSections
        lesson={{
          ...lesson,
          blocks: [{ id: 'discovery', kind: 'interactive', sortOrder: 0, content: prediction }],
          sections: [{ ...lesson.sections![0]!, blockIds: ['discovery'], workspaceBlockId: null }],
        }}
        renderBlocks={() => null}
      />,
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Sobe' }))
    fireEvent.click(screen.getByRole('button', { name: 'Observar o resultado' }))
    const check = screen.getByRole('button', {
      name: 'Conferir minha descoberta',
    }) as HTMLButtonElement
    expect(check.disabled).toBe(false)
    fireEvent.click(check)
    expect(
      screen.getByText('Prévia de autoria. Nenhum progresso de aluno foi registrado.'),
    ).toBeTruthy()
  })
  test('prévia de autoria permite conferir o resultado sem registrar atividade de aluno', async () => {
    const block = {
      id: 'preview',
      kind: 'interactive',
      sortOrder: 0,
      content: publicInteractiveBlock(prediction),
    }
    render(<InteractiveLessonBlock block={block} previewContent={prediction} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Sobe' }))
    fireEvent.click(screen.getByRole('button', { name: 'Observar o resultado' }))
    fireEvent.click(screen.getByRole('button', { name: 'Conferir minha descoberta' }))
    expect(
      await screen.findByText('Prévia de autoria. Nenhum progresso de aluno foi registrado.'),
    ).toBeTruthy()
    expect(screen.getAllByText('Agora observe o movimento.').length).toBeGreaterThan(0)
    expect(localStorage.length).toBe(0)
  })
  test('preserva a mesma instância e o rascunho do projeto ao ocultar e voltar ao editor', () => {
    function Project() {
      const [value, setValue] = useState('')
      return (
        <input
          aria-label="Nome do projeto"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )
    }
    render(<LessonSections lesson={lesson} renderBlocks={() => <Project />} />)
    const input = screen.getByRole('textbox', { name: 'Nome do projeto' }) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Meu dinossauro' } })
    fireEvent.click(screen.getByRole('button', { name: 'Próxima seção' }))
    expect(input.isConnected).toBe(true)
    expect(screen.queryByRole('textbox', { name: 'Nome do projeto' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Próxima seção' }))
    expect(screen.getByRole('textbox', { name: 'Nome do projeto' })).toBe(input)
    expect(input.value).toBe('Meu dinossauro')
  })

  test('retoma a seção salva e inclui seu contexto no pedido de ajuda', async () => {
    const requests: Array<{ url: string; body: unknown; viewer: string | null }> = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({
        url: String(input),
        body: JSON.parse(String(init?.body)),
        viewer: new Headers(init?.headers).get('x-sz-viewer'),
      })
      return Response.json({ ok: true })
    }) as unknown as typeof fetch
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections
          lesson={{ ...lesson, learningProgress: { sectionId: 'second', blocks: [] } }}
          renderBlocks={() => null}
        />
      </LessonPlayerProvider>,
    )
    expect(screen.getByRole('heading', { name: 'Observar' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Preciso de ajuda' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Por que ele cai?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar ao professor' }))
    await screen.findByText('Pedido enviado. A resposta aparecerá nos seus recados.')
    expect(requests).toEqual([
      {
        url: '/api/members/lessons/lesson/section-help',
        body: { sectionId: 'second', body: 'Por que ele cai?' },
        viewer: 'child-a',
      },
    ])
  })

  test('experimento exige valores distintos e transmite a evidência esperada pelo servidor', () => {
    let submitted: LearningAnswers = {}
    function Experiment() {
      const [answers, setAnswers] = useState<LearningAnswers>({})
      return (
        <LearningExperiment
          activity={{ type: 'experiment', preset: 'motion', parameters: {} }}
          answers={answers}
          onChange={(value) => {
            submitted = value
            setAnswers(value)
          }}
        />
      )
    }
    render(<Experiment />)
    fireEvent.click(screen.getByRole('button', { name: 'Testar este valor' }))
    fireEvent.click(screen.getByRole('button', { name: 'Testar este valor' }))
    expect(submitted.experiments).toBe(1)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1.2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Testar este valor' }))
    expect(submitted.experiments).toBe(2)
    expect(submitted.observed).toBe(true)
    expect(submitted.previous).toBe(0.6)
    expect(screen.getByText('2 valores testados')).toBeTruthy()
  })

  test('recupera respostas locais por perfil e revisão sem misturar irmãos', async () => {
    const content = publicInteractiveBlock(prediction)
    const block = {
      id: 'activity',
      blockRevision: 'revision',
      kind: 'interactive',
      sortOrder: 0,
      content,
    }
    localStorage.setItem(
      'sz:learning:child-a:lesson:activity:revision',
      JSON.stringify({
        answers: { prediction: 'up' },
        hintsUsed: 1,
        updatedAt: '2026-09-08T12:00:00Z',
      }),
    )
    globalThis.fetch = (async () => Response.json({})) as unknown as typeof fetch
    const view = render(
      <LessonPlayerProvider value={player}>
        <InteractiveLessonBlock block={block} />
      </LessonPlayerProvider>,
    )
    await waitFor(() =>
      expect((screen.getByRole('radio', { name: 'Sobe' }) as HTMLInputElement).checked).toBe(true),
    )
    expect(screen.getByText('Pense na direção.')).toBeTruthy()
    view.rerender(
      <LessonPlayerProvider value={{ ...player, viewerId: 'child-b' }}>
        <InteractiveLessonBlock block={block} />
      </LessonPlayerProvider>,
    )
    expect((screen.getByRole('radio', { name: 'Sobe' }) as HTMLInputElement).checked).toBe(false)
    expect(screen.queryByText('Pense na direção.')).toBeNull()
    view.rerender(
      <LessonPlayerProvider value={player}>
        <InteractiveLessonBlock block={{ ...block, blockRevision: 'new-revision' }} />
      </LessonPlayerProvider>,
    )
    expect((screen.getByRole('radio', { name: 'Sobe' }) as HTMLInputElement).checked).toBe(false)
  })
})
