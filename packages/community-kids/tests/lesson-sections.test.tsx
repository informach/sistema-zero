import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { SectionProgressView } from '@sistemazero/core/learning'
import {
  type InteractiveBlock,
  LEARNING_PROTOCOL,
  type LearningBlockProgress,
  publicInteractiveBlock,
} from '@sistemazero/core/learning'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
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
const pergunta: InteractiveBlock = {
  kind: 'interactive',
  title: 'Antes de testar',
  instructions: 'Escolha uma ideia.',
  required: false,
  hints: ['Pense na direção.'],
  activity: { type: 'html', html: '<p>Escolha uma ideia.</p>' },
  checkpoint: {
    prompt: 'O que acontece com o Dino?',
    choices: [
      { id: 'up', label: 'Sobe' },
      { id: 'down', label: 'Desce' },
    ],
    correctChoiceId: 'up',
    explanation: 'O impulso empurra para cima.',
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
  test('modo imersivo preserva o título acessível e troca avanço por conclusão na última seção', () => {
    const { container } = render(
      <LessonPlayerProvider value={player}>
        <LessonSections
          lesson={{
            ...lesson,
            sections: [lesson.sections?.[0]].filter((section) => section !== undefined),
          }}
          kids
          lessonTitle="Meu jogo"
          immersive
          completionAction={<button type="button">Concluir aula</button>}
          renderBlocks={() => null}
        />
      </LessonPlayerProvider>,
    )
    expect(screen.getByRole('heading', { level: 1 }).closest('header')?.className).toContain(
      'sr-only',
    )
    expect(screen.queryByText('Índice da aula')).toBeNull()
    expect(screen.getByRole('button', { name: 'Concluir aula' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Próxima seção' })).toBeNull()
    expect(container.querySelector('.sz-lesson-immersive')).not.toBeNull()
    expect(container.querySelector('.sz-lesson-nav-inner span')?.textContent).toBe('Preparar')
    expect(container.querySelector('.sz-lesson-immersive')?.getAttribute('data-layout')).toBe(
      'reading',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Preciso de ajuda' }))
    const helpForm = container.querySelector('.sz-lesson-nav-immersive form')
    expect(helpForm).not.toBeNull()
    expect(helpForm?.classList.contains('mb-4')).toBe(true)
  })
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
    expect(screen.getByRole('heading', { name: /Feche a aula/ })).toBeTruthy()
    expect(screen.getByText('quiz')).toBeTruthy()
    expect(project?.isConnected).toBe(true)
    expect(container.querySelectorAll('#lesson-block-project')).toHaveLength(1)
  })
  const cenaDeAula = (id: string) => ({
    id,
    kind: 'interactive',
    sortOrder: 1,
    blockRevision: 'revision',
    content: {
      kind: 'interactive',
      title: 'Quem fica na frente?',
      instructions: 'Troque as peças de lugar.',
      hints: [],
      required: false,
      activity: { type: 'experimentation', scene: 'layers' },
    },
  })
  const fala = {
    id: 'fala',
    kind: 'dialogue',
    sortOrder: 0,
    content: { kind: 'dialogue', text: 'Oi!' },
  }
  function renderSecaoUnica(blocks: LessonDetailView['blocks'], blockIds: string[]) {
    return render(
      <LessonSections
        lesson={{
          ...lesson,
          blocks,
          sections: [
            {
              id: 'only',
              title: 'Descobrir',
              externalTool: null,
              workspaceBlockId: null,
              blockIds,
            },
          ],
        }}
        renderBlocks={(items) => items.map((b) => <p key={b.id}>{b.id}</p>)}
      />,
    )
  }
  const painelDe = (container: HTMLElement, id: string) =>
    container.querySelector(`#lesson-block-${id}`)?.closest('[data-panel-id]')

  test('modo imersivo libera a largura inteira quando a seção tem conteúdo e ferramenta', () => {
    const { container } = render(
      <LessonPlayerProvider value={player}>
        <LessonSections
          lesson={{
            ...lesson,
            blocks: [
              fala,
              { id: 'project', kind: 'studio', sortOrder: 1, content: { kind: 'studio' } },
            ],
            sections: [
              {
                id: 'only',
                title: 'Explorar',
                externalTool: null,
                workspaceBlockId: 'project',
                blockIds: ['fala', 'project'],
              },
            ],
          }}
          immersive
          renderBlocks={(items) => items.map((block) => <p key={block.id}>{block.id}</p>)}
        />
      </LessonPlayerProvider>,
    )
    expect(container.querySelector('.sz-lesson-immersive')?.getAttribute('data-layout')).toBe(
      'wide',
    )
    expect(container.querySelector('.sz-lesson-immersive')?.className).not.toContain(
      'max-w-[860px]',
    )
  })

  test('fechamento pode reutilizar o mesmo Estúdio enviado para compartilhar sem voltar', async () => {
    const { container } = render(
      <LessonSections
        lesson={{
          ...lesson,
          blocks: [
            lesson.blocks[0]!,
            { id: 'video-final', kind: 'video', sortOrder: 1, content: { kind: 'video' } },
          ],
          sections: [
            {
              id: 'entrega',
              title: 'Entregar o jogo',
              blockIds: ['project'],
              workspaceBlockId: 'project',
              externalTool: null,
            },
            {
              id: 'fechamento',
              title: 'Sua busca está completa',
              blockIds: ['video-final'],
              workspaceBlockId: 'project',
              externalTool: null,
            },
          ],
        }}
        renderBlocks={(items) =>
          items.map((block) =>
            block.id === 'project' ? (
              <button key={block.id} type="button">
                Compartilhar
              </button>
            ) : (
              <p key={block.id}>Vídeo de fechamento</p>
            ),
          )
        }
      />,
    )
    const editor = container.querySelector('#lesson-block-project')
    expect(editor).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Próxima seção' }))
    await screen.findByRole('heading', { name: 'Sua busca está completa' })
    expect(container.querySelector('#lesson-block-project')).toBe(editor)
    expect(editor?.parentElement?.style.display).not.toBe('none')
    expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeDefined()
  })

  test('a cena de aula mora na coluna da ferramenta, ao lado do conteúdo', () => {
    // ⚠️ Pedido dela (14/09/2026): experimentação e demonstração se comportam como o Estúdio.
    // Elas são `kind: 'interactive'` como a pergunta curta, então quem decide é a ATIVIDADE.
    const { container } = renderSecaoUnica([fala, cenaDeAula('cena')], ['fala', 'cena'])
    expect(painelDe(container, 'cena')?.getAttribute('data-panel-id')).toBe('lesson-tool')
    expect(painelDe(container, 'fala')?.getAttribute('data-panel-id')).toBe('lesson-content')
    // Sem abas: "Ver exemplo"/"Criar" é o par de um EDITOR; a cena É a aula.
    expect(screen.queryByRole('button', { name: 'Criar' })).toBeNull()
  })

  test('a ENTREGA por galeria é conteúdo da seção, e não some da aula', () => {
    // ⚠️ Achado do full review (14/09/2026): o painel do conteúdo filtrava por KIND
    // (`!== 'studio' && !== 'pinta'`) e a lista da ferramenta descartava a galeria — então um
    // bloco de entrega colocado numa seção não aparecia em LUGAR NENHUM. A autoria permite
    // esse bloco (o admin só o proíbe como espaço de trabalho) e a validação do core exige que
    // todo bloco esteja numa seção ou nos materiais de apoio: ele sumia da criança em
    // silêncio. Classificar por PAPEL, e não por kind, fechou o buraco.
    const entrega = {
      id: 'entrega',
      kind: 'pinta',
      sortOrder: 1,
      content: { kind: 'pinta', gallery: { minItems: 1, maxItems: 3 } },
    }
    const { container } = renderSecaoUnica([fala, entrega], ['fala', 'entrega'])
    expect(painelDe(container, 'entrega')?.getAttribute('data-panel-id')).toBe('lesson-content')
  })

  test('cena sozinha na seção não divide, e continua na tela', () => {
    const { container } = renderSecaoUnica([cenaDeAula('cena')], ['cena'])
    const painel = painelDe(container, 'cena')
    expect(painel?.getAttribute('data-panel-id')).toBe('lesson-tool')
    // ⚠️ Não dividir não pode virar sumiço: sem a ferramenta visível a seção ficaria VAZIA.
    expect(painel?.className.includes('hidden!')).toBe(false)
    expect(screen.queryByRole('button', { name: 'Criar' })).toBeNull()
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
    expect(screen.getByRole('heading', { name: /Preparar/ })).toBeTruthy()
  })
  // ⚠️ Os testes acima (e quase todo este arquivo) renderizam SEM a flag `kids`: eles
  // cobrem o layout do ADULTO, que mantém a barra. Os dois abaixo são o único lugar
  // que exercita o caminho do kids, onde a barra deixou de existir (13/09/2026).
  test('no kids o índice mora no cabeçalho da seção, e "o que falta para concluir" sai de vez', () => {
    // A conta das pendências já aparecia em outros DOIS lugares: a barra do topo do kids
    // (que recebe as mesmas `requirements`) e o próprio índice, que marca a seção com
    // "Atividade pendente". O cartão a mais só empurrava o conteúdo para baixo.
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections
          lesson={{ ...lesson, sectionProgress: progression() }}
          kids
          renderBlocks={() => null}
        />
      </LessonPlayerProvider>,
    )
    expect(screen.queryByText(/O que falta para concluir/)).toBeNull()
    const titulo = screen.getByRole('heading', { name: /Preparar/ })
    const indice = screen.getByText('Índice da aula')
    // O MESMO cartão: é o que a mudança promete, e é o `sz-lesson-section-head` que o
    // CSS do kids veste. Separá-los de novo devolveria o cartão extra sem ninguém ver.
    expect(indice.closest('header')).toBe(titulo.closest('header'))
    // Título ANTES do índice no DOM: o cabeçalho é flex e não usa `order`, então a
    // ordem do documento é a ordem visual — título à esquerda, índice à direita.
    expect(titulo.compareDocumentPosition(indice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  test('no kids o índice continua navegando e travando as seções futuras', async () => {
    globalThis.fetch = Object.assign(async () => Response.json({ ok: true }), {
      preconnect: () => {},
    })
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections
          lesson={{ ...lesson, sectionProgress: progression(1) }}
          kids
          renderBlocks={() => null}
        />
      </LessonPlayerProvider>,
    )
    // ⚠️ A aula ABRE na primeira seção disponível, que aqui é "Observar". Navegar para
    // ELA não provaria nada: a espera pelo título passaria sozinha, e um índice que
    // levasse à seção errada seguiria verde. O destino precisa ser OUTRA seção.
    expect(screen.getByRole('heading', { name: /Observar/ })).toBeTruthy()
    const summary = screen.getByText('Índice da aula')
    fireEvent.click(summary)
    expect(
      screen.getByRole('button', { name: /Bloqueada Melhorar/ }).hasAttribute('disabled'),
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /Concluída Preparar/ }))
    await screen.findByRole('heading', { name: 'Preparar' })
    // Navegar FECHA o menu: aberto, ele cobriria justamente o começo da seção nova.
    expect(summary.closest('details')?.open).toBe(false)
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
    expect(screen.getByRole('heading', { name: /Preparar/ })).toBeTruthy()
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
    expect(screen.getByRole('heading', { name: /Preparar/ })).toBeTruthy()
    expect(document.activeElement?.id).toBe('lesson-block-project')
    expect(summary.closest('details')?.open).toBe(false)
    expect(screen.getAllByText('Atividade obrigatória')).toHaveLength(1)
  })
  test('no Kids a regra continua valendo, mas não ganha o rótulo técnico na tela', () => {
    render(
      <LessonPlayerProvider value={{ ...player, showActivityRequirement: false }}>
        <LessonSections
          lesson={lesson}
          renderBlocks={() => <input aria-label="Projeto de teste" />}
        />
      </LessonPlayerProvider>,
    )
    expect(screen.queryByText('Atividade obrigatória')).toBeNull()
    expect(screen.getByRole('button', { name: 'Próxima seção' })).toBeTruthy()
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
              content: { ...pergunta, title: '' },
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
          content: publicInteractiveBlock(pergunta),
        },
      ],
    }
    function Host({ viewer }: { viewer: string }) {
      const learning = useLessonLearning(scopedLesson, viewer)
      handlers.set(viewer, learning.onProgress)
      return (
        <output aria-label="Progresso atual">
          {String(learning.progress.blocks[0]?.answers.checkpoint ?? 'Sem resposta')}
        </output>
      )
    }
    const update: LearningBlockProgress = {
      blockId: 'activity',
      revision: 'revision',
      positionSeconds: null,
      answers: { checkpoint: 'down' },
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
    act(() => previous({ ...update, answers: { checkpoint: 'up' } }))
    expect(screen.getByLabelText('Progresso atual').textContent).toBe('down')
  })
  test('a prévia do HTML permite conferir o bloco completo de autoria', () => {
    render(
      <LessonSections
        lesson={{
          ...lesson,
          blocks: [{ id: 'discovery', kind: 'interactive', sortOrder: 0, content: pergunta }],
          sections: [{ ...lesson.sections![0]!, blockIds: ['discovery'], workspaceBlockId: null }],
        }}
        renderBlocks={() => null}
      />,
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Sobe' }))
    const check = screen.getByRole('button', {
      name: 'Conferir minha descoberta',
    }) as HTMLButtonElement
    expect(check.disabled).toBe(false)
    fireEvent.click(check)
    // ⚠️ Mudou de propósito (consertos do review do lote 2): a mesma frase da prévia da cena.
    expect(screen.getByText('Prévia: nada é guardado.')).toBeTruthy()
  })
  test('prévia de autoria permite conferir o resultado sem registrar atividade de aluno', async () => {
    const block = {
      id: 'preview',
      kind: 'interactive',
      sortOrder: 0,
      content: publicInteractiveBlock(pergunta),
    }
    render(<InteractiveLessonBlock block={block} previewContent={pergunta} />)
    const frame = screen.getByTitle('Antes de testar') as HTMLIFrameElement
    const instance = frame.srcdoc.match(/"instance":"([^"]+)"/)?.[1]
    if (!instance) throw new Error('Instância da experiência HTML ausente')
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          source: frame.contentWindow,
          data: { protocol: LEARNING_PROTOCOL, instance, event: 'participated', state: {} },
        }),
      )
    })
    fireEvent.click(screen.getByRole('radio', { name: 'Sobe' }))
    fireEvent.click(screen.getByRole('button', { name: 'Conferir minha descoberta' }))
    // ⚠️ Mudou de propósito (consertos do review do lote 2): a mesma frase da prévia da cena.
    expect(await screen.findByText('Prévia: nada é guardado.')).toBeTruthy()
    // ⚠️ Na prévia o gabarito está à mão, então a explicação do acerto tem que aparecer: é ela
    // que o professor confere antes de publicar.
    expect(screen.getAllByText('O impulso empurra para cima.').length).toBeGreaterThan(0)
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

  test('a divisória sem largura útil medida permanece desativada, com nome e gancho do tema', () => {
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

    // O gancho do tema é CONTRATO: renomeá-lo apaga o desenho da divisória no kids
    // em silêncio (o member-shell não tem regra nenhuma para ele).
    expect(divisoria.classList.contains('sz-lesson-split-handle')).toBe(true)
    // `role="separator"` focável precisa de NOME: a lib só põe aria-controls e
    // aria-valuenow, e o leitor dizia "separador, 50".
    expect(divisoria.getAttribute('aria-label')).toBeTruthy()
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

  test('Ver exemplo e Criar preservam a mesma instância e o trabalho em tela estreita', () => {
    // ⚠️ A seção precisa de conteúdo dos DOIS lados para as abas existirem (14/09/2026):
    // seção cujo único bloco é a ferramenta não divide mais, ela ocupa a largura toda — e
    // "Ver exemplo"/"Criar" sem exemplo nenhum à esquerda seria uma aba para o vazio.
    const comTexto: LessonDetailView = {
      ...lesson,
      blocks: [
        ...lesson.blocks,
        { id: 'intro', kind: 'dialogue', sortOrder: 1, content: { kind: 'dialogue', text: 'Oi!' } },
      ],
      sections: lesson.sections?.map((s) =>
        s.id === 'first' ? { ...s, blockIds: ['intro', 'project'] } : s,
      ),
    }
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections
          lesson={comTexto}
          renderBlocks={(items) =>
            items.map((b) =>
              b.kind === 'studio' ? (
                <input key={b.id} aria-label="Trabalho no projeto" defaultValue="" />
              ) : (
                <p key={b.id}>Oi!</p>
              ),
            )
          }
        />
      </LessonPlayerProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }))
    const project = screen.getByRole('textbox', { name: 'Trabalho no projeto' })
    fireEvent.change(project, { target: { value: 'Meu Dino salta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ver exemplo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }))
    expect(screen.getByRole('textbox', { name: 'Trabalho no projeto' })).toBe(project)
    expect(project).toHaveProperty('value', 'Meu Dino salta')
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
    // ⚠️ O aviso mora num EFEITO, e efeito passivo roda DEPOIS do commit: o
    // heading novo já está no DOM enquanto a fila de efeitos ainda não andou.
    // Assertar aqui direto passava na máquina rápida e falhava no CI.
    await waitFor(() =>
      expect(avisos).toEqual([
        { index: 0, total: 3 },
        { index: 1, total: 3 },
      ]),
    )

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
    expect(screen.getByRole('heading', { name: /Observar/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Preciso de ajuda' }))
    expect(screen.getByRole('textbox').closest('form')?.classList.contains('mb-4')).toBe(false)
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

  test('recupera respostas locais por perfil e revisão sem misturar irmãos', async () => {
    const content = publicInteractiveBlock(pergunta)
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
        answers: { checkpoint: 'up' },
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

/**
 * ⭐ UM cabeçalho só (18/09/2026). O nome da aula era um `<h1>` do player e o da
 * seção um `<h2>` logo abaixo: duas linhas de título, cada uma com a sua margem, e
 * a seção — que é o que muda ao avançar — aparecendo por último. Agora é
 * "aula · seção" numa linha, com o índice ao lado.
 */
describe('o cabeçalho da aula e da seção, numa linha só', () => {
  test('com o título da aula o cabeçalho é o H1 da página e mostra os dois nomes', () => {
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections lesson={lesson} kids lessonTitle="Meu jogo" renderBlocks={() => null} />
      </LessonPlayerProvider>,
    )
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo.textContent).toContain('Meu jogo')
    expect(titulo.textContent).toContain('Preparar')
    // ⚠️ UM só: o player parou de renderizar o dele, e dois `<h1>` numa página é
    // pior do que o cartão que este lote tirou.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  test('sem o título da aula (ensaio do admin) segue sendo H2, só com a seção', () => {
    // Lá o nome da aula já está em volta, no editor; repeti-lo aqui seria a mesma
    // duplicação que o lote foi tirar da página de aula.
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections lesson={lesson} kids renderBlocks={() => null} />
      </LessonPlayerProvider>,
    )
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    const titulo = screen.getByRole('heading', { level: 2, name: 'Preparar' })
    // O que importa é a AUSÊNCIA do nome da aula; `toBe` travaria markup (um
    // `sr-only` legítimo reprovaria sem defeito).
    expect(titulo.textContent).not.toContain('Meu jogo')
  })

  test('no ADULTO o índice também mora no cabeçalho, e saiu da barra de cima', () => {
    const { container } = render(
      <LessonPlayerProvider value={player}>
        <LessonSections lesson={lesson} lessonTitle="Meu jogo" renderBlocks={() => null} />
      </LessonPlayerProvider>,
    )
    const indice = screen.getByText('Índice da aula')
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(indice.closest('header')).toBe(titulo.closest('header'))
    // A barra do adulto continua existindo, agora só com o que falta concluir.
    // ⚠️ Escopado no container: `document.querySelector` pegaria a barra de outro
    // render se um `cleanup` falhasse, e em silêncio.
    const barra = container.querySelector('.sz-lesson-toolbar')
    expect(barra?.textContent).toContain('O que falta para concluir')
    expect(barra?.contains(indice)).toBe(false)
  })

  test('trocar de seção leva o FOCO ao cabeçalho, que é a âncora do conteúdo novo', async () => {
    // ⚠️ Sem isto, quem usa teclado ou leitor de tela avança de seção e continua no
    // meio da página anterior: o cabeçalho é o alvo do `focus()` e do scroll.
    globalThis.fetch = Object.assign(async () => Response.json({ ok: true }), {
      preconnect: () => {},
    })
    // Todas liberadas: o que se mede aqui é o FOCO ao avançar, não a trava.
    const todasLiberadas: SectionProgressView = {
      revision: 'structure',
      completed: 0,
      total: 3,
      percent: 0,
      sections: ['first', 'second', 'third'].map((id) => ({
        id,
        title: id,
        status: 'available' as const,
        pending: [],
      })),
    }
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections
          lesson={{ ...lesson, sectionProgress: todasLiberadas }}
          kids
          lessonTitle="Meu jogo"
          immersive
          renderBlocks={() => null}
        />
      </LessonPlayerProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Próxima seção/ }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Observar')
    })
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })
})

/**
 * ⚠️ Os dois players (kids e adulto) não têm suíte — montar o `LessonPlayer` puxa o
 * Next inteiro. Então o que garante que eles PARARAM de renderizar o título da aula
 * é a leitura da fonte: sem isto, repor o `<h1>` neles devolve o nome da aula duas
 * vezes na tela e nenhum teste de componente vê, porque o `LessonSections` sozinho
 * só emite um cabeçalho (a asserção de "um `<h1>` só" fica tautológica).
 */
describe('os players entregam o título da aula ao cabeçalho, e não renderizam o seu', () => {
  const players = [
    ['kids', 'src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx'],
    [
      'adulto',
      '../community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx',
    ],
  ] as const

  test.each(players)('o player do %s passa lessonTitle e não abre um <h1> próprio', (_, rel) => {
    const fonte = readFileSync(resolve(import.meta.dir, '..', rel), 'utf8')
    expect(fonte).toContain('lessonTitle={lesson.title}')
    expect(fonte).not.toContain('<h1')
  })
})

describe('o cabeçalho aguenta o conteúdo real', () => {
  test('aula LEGADA não imprime o mesmo nome duas vezes', () => {
    // `legacyLessonSections` usa o TÍTULO DA AULA como nome da seção quando a aula
    // não tem seções — é o caso do certificado e das aulas "em breve". Sem a guarda,
    // o cabeçalho saía "Meu jogo · Meu jogo".
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections
          lesson={{ ...lesson, sections: undefined, blocks: [] }}
          kids
          lessonTitle="Meu jogo"
          renderBlocks={() => null}
        />
      </LessonPlayerProvider>,
    )
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Meu jogo')
    expect(titulo.textContent).not.toContain('·')
  })

  test('o nome acessível separa os dois nomes (o ponto é só visual)', () => {
    // O `·` é `aria-hidden`, e com ele some o único espaço entre os dois nomes: o
    // leitor de tela emendava "DinoUm lugar". A vírgula `sr-only` é o separador
    // audível.
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections lesson={lesson} kids lessonTitle="Meu jogo" renderBlocks={() => null} />
      </LessonPlayerProvider>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Meu jogo , Preparar' })).toBeTruthy()
  })

  test('palavra comprida quebra em vez de vazar por baixo do índice', () => {
    // happy-dom não faz layout: a régua é a CLASSE, como no cabeçalho do kids.
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections lesson={lesson} kids lessonTitle="Meu jogo" renderBlocks={() => null} />
      </LessonPlayerProvider>,
    )
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo.className).toContain('[overflow-wrap:anywhere]')
    // E o foco continua alcançável por programa (é o alvo ao trocar de seção).
    expect(titulo.getAttribute('tabindex')).toBe('-1')
  })

  test('no estreito o índice fica só no ícone, sem perder o nome acessível', () => {
    // O texto comia ~108px da MESMA linha do título; medido nos 392 pares reais de
    // aula × seção, isso custava 5,3 linhas de cabeçalho num celular de 390px.
    render(
      <LessonPlayerProvider value={player}>
        <LessonSections lesson={lesson} kids lessonTitle="Meu jogo" renderBlocks={() => null} />
      </LessonPlayerProvider>,
    )
    const rotulo = screen.getByText('Índice da aula')
    expect(rotulo.className).toContain('sr-only')
    expect(rotulo.className).toContain('sm:not-sr-only')
    expect(rotulo.closest('summary')?.getAttribute('aria-label')).toBe('Índice da aula')
  })
})
