import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { SectionProgressView } from '@sistemazero/core/learning'
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
import { LessonProgressBar } from '@sistemazero/member-shell/components/lesson-progress-bar'
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
      externalTool: null,
      blockIds: ['project'],
      workspaceBlockId: 'project',
    },
    {
      id: 'second',
      title: 'Observar',
      workspaceBlockId: null,
      externalTool: null,
      blockIds: [],
    },
    {
      id: 'third',
      title: 'Melhorar',
      externalTool: null,
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
// ⚠️ O caso da divisória larga TROCA o `window.matchMedia` do ambiente. Sem restaurar,
// todo teste seguinte herdava uma janela "larga" — e um deles passaria a afirmar o
// contrário do que checa.
const originalMatchMedia = window.matchMedia
beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
  window.matchMedia = originalMatchMedia
})

describe('aula por seções', () => {
  test.each([
    false,
    true,
  ])('vídeo legado só pede 90% se a aula ainda não foi concluída: %s', (completed) => {
    globalThis.fetch = Object.assign(async () => Response.json({ ok: true }), {
      preconnect: () => {},
    })
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections
          lesson={{
            ...lesson,
            completed,
            sections: undefined,
            legacyLayout: true,
            blocks: [{ id: 'video', kind: 'video', sortOrder: 0, content: { kind: 'video' } }],
          }}
          renderBlocks={() => null}
        />
      </LessonPlayerProvider>,
    )
    expect(screen.queryByText('0% assistido · veja 90% para continuar') !== null).toBe(!completed)
  })
  test.each([
    false,
    true,
  ])('legado separa vídeo e Estúdio do quiz, com backfill=%s', (backfilled) => {
    const blocks = [
      { id: 'quiz', kind: 'quiz', sortOrder: 0, content: { kind: 'quiz' } },
      { id: 'project', kind: 'studio', sortOrder: 1, content: { kind: 'studio' } },
      { id: 'video', kind: 'video', sortOrder: 2, content: { kind: 'video' } },
    ]
    const { container } = render(
      <LessonSections
        lesson={{
          ...lesson,
          blocks,
          legacyLayout: backfilled ? true : undefined,
          sections: backfilled
            ? [
                {
                  id: lesson.id,
                  title: lesson.title,
                  blockIds: blocks.map((b) => b.id),
                  workspaceBlockId: null,
                  externalTool: null,
                },
              ]
            : undefined,
        }}
        renderBlocks={(items) => items.map((b) => <div key={b.id}>{b.id}</div>)}
      />,
    )
    expect([...container.querySelectorAll('.sz-lesson-block')].map((b) => b.id)).toEqual([
      'lesson-block-video',
      'lesson-block-project',
    ])
    expect(
      container
        .querySelector('#lesson-block-project')
        ?.closest('[data-panel-id]')
        ?.getAttribute('data-panel-id'),
    ).toBe('lesson-tool')
    expect(
      container
        .querySelector('#lesson-block-video')
        ?.closest('[data-panel-id]')
        ?.getAttribute('data-panel-id'),
    ).toBe('lesson-content')
    const project = container.querySelector('#lesson-block-project')
    fireEvent.click(screen.getByRole('button', { name: 'Próxima seção' }))
    expect(screen.getByRole('heading', { name: 'Feche a aula' })).toBeTruthy()
    expect(screen.getByText('quiz')).toBeTruthy()
    expect(project?.isConnected).toBe(true)
    expect(container.querySelectorAll('#lesson-block-project')).toHaveLength(1)
  })
  const progression = (completed = 0): SectionProgressView => ({
    revision: 'structure',
    completed,
    total: 3,
    percent: (completed / 3) * 100,
    sections: ['first', 'second', 'third'].map((id, index) => ({
      id,
      title: id,
      status: index < completed ? 'completed' : index === completed ? 'available' : 'locked',
      pending: index < completed ? [] : ['Conclua a atividade.'],
    })),
  })
  test('a barra conta conclusões e o índice não permite abrir seções futuras', () => {
    const progress = progression()
    render(
      <LessonPlayerProvider value={player}>
        <LessonProgressBar progress={progress} />
        <LessonSections
          lesson={{ ...lesson, sectionProgress: progress }}
          renderBlocks={() => null}
        />
      </LessonPlayerProvider>,
    )
    expect(screen.getByText('0 de 3 seções concluídas · 0%')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Próxima seção' }).hasAttribute('disabled')).toBe(
      true,
    )
    fireEvent.click(screen.getByText('Índice da aula'))
    const future = screen.getByRole('button', { name: /Bloqueada Observar/ })
    expect(future.hasAttribute('disabled')).toBe(true)
    fireEvent.click(future)
    expect(screen.getByRole('heading', { name: 'Preparar' })).toBeTruthy()
  })
  test('falha de navegação mantém a seção atual; a nova tentativa preserva o projeto', async () => {
    let fail = true
    globalThis.fetch = Object.assign(
      async () =>
        fail
          ? Response.json({ error: { message: 'Falha de rede' } }, { status: 503 })
          : Response.json({ ok: true }),
      { preconnect: () => {} },
    )
    const progress = progression(1)
    render(
      <LessonPlayerProvider value={player}>
        <LessonProgressBar progress={progress} />
        <LessonSections
          lesson={{
            ...lesson,
            learningProgress: { sectionId: 'first', blocks: [] },
            sectionProgress: progress,
          }}
          renderBlocks={() => <input aria-label="Meu projeto" defaultValue="Dino" />}
        />
      </LessonPlayerProvider>,
    )
    const input = screen.getByRole('textbox', { name: 'Meu projeto' })
    fireEvent.click(screen.getByRole('button', { name: 'Próxima seção' }))
    await screen.findByText(
      'Não foi possível abrir esta seção. Suas respostas foram mantidas. Tente novamente.',
    )
    expect(screen.getByRole('heading', { name: 'Preparar' })).toBeTruthy()
    expect(screen.getByText('1 de 3 seções concluídas · 33,3%')).toBeTruthy()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await screen.findByRole('heading', { name: 'Observar' })
    expect(input.isConnected).toBe(true)
    expect(screen.getByRole('button', { name: 'Próxima seção' }).hasAttribute('disabled')).toBe(
      true,
    )
  })
  test('pendência leva ao único projeto e fecha a lista durante a navegação', () => {
    render(
      <LessonSections
        lesson={lesson}
        renderBlocks={() => <input aria-label="Projeto de teste" />}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Próxima seção' }))
    const summary = screen.getByText('O que falta para concluir · 1')
    fireEvent.click(summary)
    fireEvent.click(screen.getByRole('button', { name: /Enviar projeto/ }))
    expect(screen.getByRole('heading', { name: 'Preparar' })).toBeTruthy()
    expect(document.activeElement?.id).toBe('lesson-block-project')
    expect(summary.closest('details')?.open).toBe(false)
    expect(screen.getAllByText('Atividade obrigatória')).toHaveLength(1)
  })
  test('descoberta incompleta na prévia mostra orientação e não registra tentativas', () => {
    render(
      <LessonSections
        lesson={{
          ...lesson,
          blocks: [
            {
              id: 'unfinished',
              kind: 'interactive',
              sortOrder: 0,
              content: { ...prediction, title: '' },
            },
          ],
          sections: [{ ...lesson.sections![0]!, blockIds: ['unfinished'], workspaceBlockId: null }],
        }}
        renderBlocks={() => null}
      />,
    )
    expect(
      screen.getByText('Complete a descoberta interativa para experimentar a prévia.'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Conferir minha descoberta' })).toBeNull()
  })
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

  test('a divisória entre a aula e a ferramenta é arrastável e alcançável pelo teclado', () => {
    // A criança que está ASSISTINDO quer o vídeo maior; a que está CRIANDO quer o
    // editor maior. Antes do lote o split era um grid fixo em 0.8fr/1.2fr, sem
    // arrasto, e só existia acima de 1536px de VIEWPORT.
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections lesson={lesson} renderBlocks={() => null} />
      </LessonPlayerProvider>,
    )
    const divisoria = screen.getByRole('separator')
    expect(divisoria.getAttribute('data-panel-group-direction')).toBe('horizontal')
    // ⚠️ O que este teste PRECISA morder é o par: a divisória existe sempre (senão
    // o editor da direita remonta) mas só é interativa onde ela aparece. Montada e
    // habilitada num layout empilhado, a lib registra uma zona de arrasto fantasma
    // no canto (0,0) da tela, porque `display:none` mede {0,0,0,0}.
    // Aqui a janela do happy-dom é estreita, então tem que estar DESABILITADA.
    expect(divisoria.getAttribute('data-panel-resize-handle-enabled')).toBe('false')

    // Larga o bastante: a divisória acorda.
    window.matchMedia = ((q: string) => ({
      matches: true,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    cleanup()
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections lesson={lesson} renderBlocks={() => null} />
      </LessonPlayerProvider>,
    )
    const larga = screen.getByRole('separator')
    expect(larga.tabIndex).toBe(0)
    expect(larga.getAttribute('data-panel-resize-handle-enabled')).toBe('true')
    // O gancho do tema é CONTRATO: renomeá-lo apaga o desenho da divisória no kids
    // em silêncio (o member-shell não tem regra nenhuma para ele).
    expect(larga.classList.contains('sz-lesson-split-handle')).toBe(true)
    // `role="separator"` focável precisa de NOME: a lib só põe aria-controls e
    // aria-valuenow, e o leitor dizia "separador, 50".
    expect(larga.getAttribute('aria-label')).toBeTruthy()
  })

  test('a divisória desabilitada não é parada de Tab', () => {
    // A lib mantém `tabIndex` 0 mesmo desabilitada, mas o teclado dela é gateado
    // por `disabled`: seria um foco que não faz nada. A janela do happy-dom é
    // estreita, então aqui ela está empilhada.
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections lesson={lesson} renderBlocks={() => null} />
      </LessonPlayerProvider>,
    )
    expect(screen.getByRole('separator').tabIndex).toBe(-1)
  })

  test('os dois lados nascem do mesmo tamanho', () => {
    // "Tem menos espaço para o Estúdio" (relato da dona): o padrão era 55/45, e o
    // lado menor era justo o da ferramenta.
    // ⚠️ Este teste morde o `defaultSize`, NÃO a persistência: a lib não chega a
    // tocar o `localStorage` no happy-dom (medido — nem lê a chave semeada nem
    // grava o layout), então um caso sobre o ajuste guardado passaria aqui com ou
    // sem o conserto, que é pior do que não existir. Quem guarda a regra da chave
    // versionada é o comentário em `lesson-sections.tsx`, junto do `autoSaveId`.
    const { container } = render(
      <LessonPlayerProvider value={player}>
        <LessonSections lesson={lesson} renderBlocks={() => null} />
      </LessonPlayerProvider>,
    )
    const tamanhos = [...container.querySelectorAll('[data-panel]')].map((p) =>
      p.getAttribute('data-panel-size'),
    )
    expect(tamanhos).toEqual(['50.0', '50.0'])
  })

  test('avisa a posição no percurso ao montar e a cada troca de seção', async () => {
    globalThis.fetch = (async () => Response.json({ ok: true })) as unknown as typeof fetch
    const avisos: Array<{ index: number; total: number }> = []
    function Host() {
      const [, setPosicao] = useState<{ index: number; total: number } | null>(null)
      return (
        <LessonPlayerProvider value={player}>
          <LessonSections
            lesson={lesson}
            renderBlocks={() => <input aria-label="Meu projeto" />}
            // ⚠️ Função INLINE de propósito: identidade nova a cada render. Se o
            // callback voltar para as deps do efeito lá dentro, isto vira laço
            // (pai setState → render → efeito → setState) e o teste trava. É a
            // razão de o member-shell guardá-lo num ref.
            onSectionChange={(p) => {
              avisos.push(p)
              setPosicao(p)
            }}
          />
        </LessonPlayerProvider>
      )
    }
    const view = render(<Host />)
    expect(avisos).toEqual([{ index: 0, total: 3 }])
    const input = screen.getByRole('textbox', { name: 'Meu projeto' })

    fireEvent.click(screen.getByRole('button', { name: 'Próxima seção' }))
    await screen.findByRole('heading', { name: 'Observar' })
    expect(avisos).toEqual([
      { index: 0, total: 3 },
      { index: 1, total: 3 },
    ])

    // Re-render do pai por motivo alheio não reavisa, e o editor da direita NÃO
    // remonta (o rascunho do Estúdio morreria a cada troca de seção).
    view.rerender(<Host />)
    expect(avisos).toHaveLength(2)
    expect(input.isConnected).toBe(true)
  })

  test('trocar de perfil no meio da aula não oferece "tentar novamente"', async () => {
    // 409 VIEWER_CHANGED: aqui repetir NUNCA funciona, então o recado é o do
    // servidor e o botão some. Antes a criança lia "tentar novamente" para um
    // erro que só passa reabrindo a aula.
    globalThis.fetch = (async () =>
      Response.json(
        { error: { code: 'VIEWER_CHANGED', message: 'O perfil mudou. Abra a aula de novo.' } },
        { status: 409 },
      )) as unknown as typeof fetch
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections lesson={lesson} renderBlocks={() => null} />
      </LessonPlayerProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Próxima seção' }))
    const aviso = await screen.findByRole('alert')
    expect(aviso.textContent).toContain('O perfil mudou. Abra a aula de novo.')
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull()
  })

  test('a troca de seção sobrevive ao fechamento da aba', async () => {
    // Sem `keepalive` o navegador CANCELA o pedido no unload, e o lugar se perde
    // justamente em quem troca de seção e fecha a aula em seguida.
    const inits: RequestInit[] = []
    globalThis.fetch = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      if (init) inits.push(init)
      return Response.json({ ok: true })
    }) as unknown as typeof fetch
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections lesson={lesson} renderBlocks={() => null} />
      </LessonPlayerProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Próxima seção' }))
    await waitFor(() => expect(inits.length).toBeGreaterThan(0))
    expect(inits.every((i) => i.keepalive === true)).toBe(true)
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
      // Abrir a aula REGISTRA a seção onde a criança entrou, e isso acontece na
      // MONTAGEM — por isso vem primeiro. A navegação só grava em transição, então
      // quem abre e fica na primeira seção nunca criava linha, e é o `updated_at`
      // dela que alimenta o "continuar de onde parou".
      {
        url: '/api/members/lessons/lesson/navigation',
        body: { sectionId: 'second' },
        viewer: 'child-a',
      },
      {
        url: '/api/members/lessons/lesson/section-help',
        body: { sectionId: 'second', body: 'Por que ele cai?', requestId: expect.any(String) },
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
