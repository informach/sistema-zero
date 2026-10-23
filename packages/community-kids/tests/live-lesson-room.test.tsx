import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { LiveControl, LiveParticipation, LiveRoomView } from '@sistemazero/core/live'
import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
} from '@sistemazero/member-shell/components/lesson-player-context'
import { LessonSections } from '@sistemazero/member-shell/components/lesson-sections'
import { LessonVideoToggle } from '@sistemazero/member-shell/components/lesson-video-float'
import { LiveParticipants } from '@sistemazero/member-shell/components/live/live-participants'
import { LiveTeacherControls } from '@sistemazero/member-shell/components/live/live-teacher-controls'
import {
  LiveLessonClosed,
  useLiveLesson,
} from '@sistemazero/member-shell/components/live/use-live-lesson'
import { useReportActivityExpanded } from '@sistemazero/member-shell/lib/lesson-activity-expansion'
import { followLiveSection } from '@sistemazero/member-shell/lib/live/journey'
import type { LiveLessonSlotProps } from '@sistemazero/member-shell/lib/live/lesson-slot'
import type { LessonDetailView } from '@sistemazero/member-shell/lib/types'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { KidsLessonCopy } from '../src/components/kids/kids-lesson-copy'

// ⚠️ As ausências são conferidas como booleano: com um nó do DOM no diff de uma falha, o bun
// imprime a janela inteira e a suíte parece travar (achado na prova por mutação).
/**
 * A sala de curso ao vivo (14/10/2026): a aula com a transmissão fixa e as partes conduzidas pela
 * professora. Aqui roda o `LessonSections` de verdade com as duas props novas; sem elas, a aula
 * gravada não pode mudar (o resto da suíte da aula cobre esse lado).
 */

const lesson: LessonDetailView = {
  id: 'lesson',
  slug: 'aula',
  courseSlug: 'curso-ao-vivo',
  moduleId: 'unit',
  title: 'Encontro 1',
  completed: false,
  positionSeconds: null,
  estimatedMinutes: null,
  attachments: [],
  blocks: [
    { id: 'texto-1', kind: 'rich_text', sortOrder: 0, content: { kind: 'rich_text' } },
    { id: 'texto-2', kind: 'rich_text', sortOrder: 1, content: { kind: 'rich_text' } },
    { id: 'texto-3', kind: 'rich_text', sortOrder: 2, content: { kind: 'rich_text' } },
  ],
  sections: [
    {
      id: 'a',
      title: 'Conhecer',
      blockIds: ['texto-1'],
      workspaceBlockId: null,
      externalTool: null,
    },
    { id: 'b', title: 'Mover', blockIds: ['texto-2'], workspaceBlockId: null, externalTool: null },
    { id: 'c', title: 'Pular', blockIds: ['texto-3'], workspaceBlockId: null, externalTool: null },
  ],
}
const player: LessonPlayerContextValue = {
  lessonId: lesson.id,
  courseSlug: lesson.courseSlug,
  viewerId: 'child-a',
  viewerWatermark: null,
  initialPositionSeconds: null,
}
const originalFetch = globalThis.fetch
let navigations: string[] = []
beforeEach(() => {
  localStorage.clear()
  navigations = []
  globalThis.fetch = Object.assign(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null
      if (body?.sectionId) navigations.push(body.sectionId)
      return Response.json({ ok: true })
    },
    { preconnect: () => {} },
  ) as typeof fetch
})
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
})

function Ampliada() {
  useReportActivityExpanded(true)
  return <LessonVideoToggle expanded />
}

function Sala({
  control,
  stage = true,
  ampliada = false,
}: {
  control: { openedIds: string[]; currentId: string | null } | null
  stage?: boolean
  ampliada?: boolean
}) {
  return (
    <KidsLessonCopy>
      <LessonPlayerProvider value={player}>
        <LessonSections
          lesson={lesson}
          kids
          lessonTitle={lesson.title}
          immersive
          stage={stage ? <div data-testid="transmissao">A professora ao vivo</div> : undefined}
          sectionControl={control}
          renderBlocks={(blocks) =>
            blocks.map((block) => (
              <div key={block.id}>
                <p>Bloco {block.id}</p>
                {ampliada && block.id === 'texto-2' ? <Ampliada /> : null}
              </div>
            ))
          }
        />
      </LessonPlayerProvider>
    </KidsLessonCopy>
  )
}

describe('a aula na sala ao vivo', () => {
  test('sem as props novas, nada da sala aparece (a aula gravada não muda)', () => {
    const { container } = render(<Sala control={null} stage={false} />)
    expect(container.querySelector('.sz-lesson-stage') === null).toBe(true)
    expect(container.querySelector('.sz-lesson-stage-content') === null).toBe(true)
    expect(container.querySelector('.sz-lesson-live-notice') === null).toBe(true)
    expect(screen.getByRole('button', { name: 'Preciso de ajuda' })).toBeDefined()
    expect(screen.queryByText('A próxima parte abre já já') === null).toBe(true)
  })

  test('a transmissão fica no alto da coluna e a criança só anda entre as partes abertas', async () => {
    const { container, rerender } = render(<Sala control={{ openedIds: ['a'], currentId: 'a' }} />)
    const stage = screen.getByTestId('transmissao')
    expect(stage.closest('.sz-lesson-stage') !== null).toBe(true)
    // A transmissão é o primeiro filho da coluna da esquerda, antes da orientação da parte.
    const coluna = container.querySelector('[data-panel-id="lesson-content"], #lesson-content')
    expect(coluna?.firstElementChild?.classList.contains('sz-lesson-stage')).toBe(true)
    expect(screen.getByText('Bloco texto-1')).toBeDefined()
    // A próxima ainda não foi aberta: travada, e dizendo por quê.
    const proxima = screen.getByRole('button', { name: /Próxima parte/ })
    expect((proxima as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('A próxima parte abre já já')).toBeDefined()
    expect(proxima.getAttribute('aria-describedby')).toBeTruthy()
    // O pedido de ajuda da sala é o da barra da chamada.
    expect(screen.queryByRole('button', { name: 'Preciso de ajuda' }) === null).toBe(true)

    // A professora abre a parte 2: a tela vai junto, com o aviso, e a transmissão é o MESMO nó.
    rerender(<Sala control={{ openedIds: ['a', 'b'], currentId: 'b' }} />)
    expect(screen.getByText('Bloco texto-2')).toBeDefined()
    expect(screen.getByText('A turma está na parte 2')).toBeDefined()
    expect(screen.getByTestId('transmissao')).toBe(stage)
    await act(async () => {})
    expect(navigations).toContain('b')

    // Voltar pode (a parte 1 está aberta)…
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }))
    await screen.findByText('Bloco texto-1')
    // …e a próxima (2) está aberta: o botão destrava.
    expect(
      (screen.getByRole('button', { name: /Próxima parte/ }) as HTMLButtonElement).disabled,
    ).toBe(false)
    // Quem voltou para rever fica lá até a professora abrir OUTRA parte.
    rerender(<Sala control={{ openedIds: ['a', 'b'], currentId: 'b' }} />)
    expect(screen.getByText('Bloco texto-1')).toBeDefined()
    rerender(<Sala control={{ openedIds: ['a', 'b', 'c'], currentId: 'c' }} />)
    expect(screen.getByText('Bloco texto-3')).toBeDefined()
    expect(screen.getByText('A turma está na parte 3')).toBeDefined()
  })

  test('"Ir junto" leva quem voltou para rever à parte da turma, só se ela estiver aberta', async () => {
    const { rerender } = render(<Sala control={{ openedIds: ['a'], currentId: 'a' }} />)
    rerender(<Sala control={{ openedIds: ['a', 'b'], currentId: 'b' }} />)
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }))
    await screen.findByText('Bloco texto-1')
    // Uma parte ainda fechada não abre por pedido da sala.
    await act(async () => followLiveSection('c'))
    expect(screen.getByText('Bloco texto-1')).toBeDefined()
    navigations = []
    await act(async () => followLiveSection('b'))
    expect(screen.getByText('Bloco texto-2')).toBeDefined()
    // A navegação registrada vai junto, como na troca feita por quem conduz.
    expect(navigations).toContain('b')
  })

  test('na recepção a tela mostra a primeira parte e espera; fora do encontro tudo abre', () => {
    const { rerender } = render(<Sala control={{ openedIds: [], currentId: null }} />)
    expect(screen.getByText('Bloco texto-1')).toBeDefined()
    expect(
      (screen.getByRole('button', { name: /Próxima parte/ }) as HTMLButtonElement).disabled,
    ).toBe(true)
    rerender(<Sala control={null} />)
    expect(
      (screen.getByRole('button', { name: /Próxima parte/ }) as HTMLButtonElement).disabled,
    ).toBe(false)
    expect(screen.queryByText('A próxima parte abre já já') === null).toBe(true)
  })

  test('com uma atividade ampliada, a TRANSMISSÃO vira o flutuante e o interruptor a esconde', () => {
    render(<Sala control={{ openedIds: ['a', 'b'], currentId: 'b' }} ampliada />)
    const stage = screen.getByTestId('transmissao')
    const flutuante = stage.closest('.sz-lesson-video-float')
    expect(flutuante !== null).toBe(true)
    expect(flutuante?.getAttribute('aria-label')).toBe('Ao vivo')
    // Flutuando, a transmissão não é mais `sticky` (o z-index prenderia o flutuante embaixo).
    expect(stage.closest('.sz-lesson-stage')?.classList.contains('sticky')).toBe(false)
    const interruptor = screen.getByRole('button', { name: 'Transmissão' })
    expect(interruptor.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(interruptor)
    expect(stage.closest('.sz-lesson-video-float') === null).toBe(true)
    expect(screen.getByRole('button', { name: 'Transmissão' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
    // O mesmo nó, escondido e vivo (a chamada continua).
    expect(screen.getByTestId('transmissao')).toBe(stage)
  })
})

function room(
  state: 'live' | 'lobby' | 'ended',
  control: { openedIds: string[]; currentId: string | null } | null,
  participants: LiveParticipation[] = [],
): LiveRoomView {
  return {
    session: { id: 's1', title: 'Encontro 1' },
    serverTime: '2026-10-14T18:00:05.000Z',
    occurrence: {
      state,
      speakingMode: 'open',
      participants,
      sections: control,
      recording: { state: 'recording', published: false, version: 0, storageKey: null },
    },
  } as unknown as LiveRoomView
}

describe('a professora conduz as partes', () => {
  const sections = [
    { id: 'a', title: 'Conhecer' },
    { id: 'b', title: 'Mover' },
    { id: 'c', title: 'Pular' },
  ]
  test('"Próxima parte" e a lista abrem a parte pelo comando da sala', () => {
    const commands: LiveControl[] = []
    render(
      <LiveTeacherControls
        room={room('live', { openedIds: ['a'], currentId: 'a' })}
        busy={false}
        stale={false}
        sections={sections}
        onControl={async (command) => {
          commands.push(command)
          return true
        }}
      />,
    )
    expect(screen.getByText('A turma está na parte 1 de 3')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Próxima parte (2)' }))
    const lista = screen.getByRole('list', { name: 'Abrir uma parte' })
    fireEvent.click(within(lista).getByRole('button', { name: /3\. Pular/ }))
    // A atual não manda nada (reabrir a mesma não muda a turma).
    fireEvent.click(within(lista).getByRole('button', { name: /1\. Conhecer/ }))
    expect(commands).toEqual([
      { kind: 'open-section', sectionId: 'b' },
      { kind: 'open-section', sectionId: 'c' },
    ])
    expect(
      within(lista)
        .getByRole('button', { name: /1\. Conhecer/ })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })

  test('na última parte não há próxima; fora do encontro, nada de partes', () => {
    const { rerender } = render(
      <LiveTeacherControls
        room={room('live', { openedIds: ['a', 'b', 'c'], currentId: 'c' })}
        busy={false}
        stale={false}
        sections={sections}
        onControl={async () => true}
      />,
    )
    expect(
      (screen.getByRole('button', { name: 'Esta é a última parte' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    rerender(
      <LiveTeacherControls
        room={room('lobby', null)}
        busy={false}
        stale={false}
        sections={sections}
        onControl={async () => true}
      />,
    )
    expect(screen.queryByText('Partes do encontro') === null).toBe(true)
  })

  test('os cartões dizem a parte de cada criança e quem já concluiu a parte da turma', () => {
    const now = '2026-10-14T18:00:00.000Z'
    const child = (id: string, sectionId: string, completed: string[]): LiveParticipation => ({
      learnerId: id,
      displayName: id,
      deviceId: `d-${id}`,
      admission: 'admitted',
      joinedAt: now,
      seenAt: now,
      handAt: null,
      helpAt: null,
      microphoneLocked: false,
      cameraLocked: false,
      turnGranted: false,
      muteEpoch: 0,
      activity: {
        stepId: null,
        sectionId,
        completedSectionIds: completed,
        saveState: 'saved',
        reportedAt: now,
      },
    })
    render(
      <LiveParticipants
        room={room('live', { openedIds: ['a', 'b'], currentId: 'b' }, [
          child('Ana', 'b', ['a', 'b']),
          child('Bia', 'a', ['a']),
        ])}
        sections={sections}
        disabled={false}
        onControl={async () => true}
        onObserve={() => {}}
      />,
    )
    const [ana, bia] = screen.getAllByRole('article')
    expect(within(ana!).getByText('Parte 2 · Mover')).toBeDefined()
    expect(within(ana!).getByText('Concluiu a parte da turma')).toBeDefined()
    expect(within(bia!).getByText('Parte 1 · Conhecer')).toBeDefined()
    expect(within(bia!).queryByText('Concluiu a parte da turma') === null).toBe(true)
  })
})

describe('a aula ainda fechada para a vaga', () => {
  function Aula({ slot }: { slot: LiveLessonSlotProps }) {
    const { lesson, error, closed, reload } = useLiveLesson(slot)
    if (closed)
      return (
        <>
          <LiveLessonClosed stage={slot.stage} />
          <button type="button" onClick={reload}>
            tentar
          </button>
        </>
      )
    if (error) return <p role="alert">{error}</p>
    return <p>{lesson ? `Aula ${lesson.title}` : 'carregando'}</p>
  }
  test('403 LIVE_LESSON_CLOSED vira espera gentil com a transmissão, e abre sozinha depois', async () => {
    let aberta = false
    globalThis.fetch = Object.assign(
      async () =>
        aberta
          ? Response.json(lesson)
          : Response.json(
              {
                error: {
                  code: 'LIVE_LESSON_CLOSED',
                  message: 'Este encontro abre no dia marcado, para quem tem vaga na turma.',
                },
              },
              { status: 403 },
            ),
      { preconnect: () => {} },
    ) as typeof fetch
    const slot = {
      lesson: { courseId: 'c', courseSlug: 'curso-ao-vivo', lessonId: lesson.id },
      stage: <div data-testid="transmissao">A professora ao vivo</div>,
      sectionControl: null,
      teacher: false,
      onSectionReport: () => {},
    } satisfies LiveLessonSlotProps
    render(<Aula slot={slot} />)
    await screen.findByText('O encontro ainda vai abrir')
    // Sem erro cru, e com a transmissão no lugar de sempre.
    expect(screen.queryByRole('alert') === null).toBe(true)
    expect(screen.getByTestId('transmissao')).toBeDefined()
    aberta = true
    fireEvent.click(screen.getByRole('button', { name: 'tentar' }))
    await screen.findByText('Aula Encontro 1')
  })
})
