import { afterEach, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LiveOccurrence, LiveParticipation, LiveRoomView } from '@sistemazero/core/live'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LiveTeacherControls, lowerHandsCommand } = await import(
  '@sistemazero/member-shell/components/live/live-teacher-controls'
)
const { LiveParticipants, participantPrimaryAction, participantSignals } = await import(
  '@sistemazero/member-shell/components/live/live-participants'
)
const { recordingItems, recordingStatusView } = await import(
  '@sistemazero/member-shell/components/live/live-recording-review'
)
const { replacementError } = await import(
  '@sistemazero/member-shell/components/live/live-replacement'
)

const SERVER_TIME = '2026-10-14T18:00:05.000Z'

function child(learnerId: string, extra: Partial<LiveParticipation> = {}): LiveParticipation {
  return {
    learnerId,
    displayName: learnerId,
    deviceId: `d-${learnerId}`,
    admission: 'admitted',
    joinedAt: '2026-10-14T17:55:00Z',
    seenAt: '2026-10-14T18:00:00Z',
    handAt: null,
    helpAt: null,
    microphoneLocked: false,
    cameraLocked: false,
    turnGranted: false,
    muteEpoch: 0,
    ...extra,
  }
}

function room(
  state: LiveOccurrence['state'],
  participants: LiveParticipation[],
  recording: Partial<LiveOccurrence['recording']> = {},
): LiveRoomView {
  return {
    session: {
      id: 's1',
      cohortId: 'c1',
      order: 0,
      title: 'Esconde-esconde',
      startsAt: '2026-10-14T18:00:00Z',
      endsAt: '2026-10-14T19:30:00Z',
      accessEndsAt: '2026-11-13T18:00:00Z',
      occurrenceId: 'o1',
    },
    cohort: {
      id: 'c1',
      programId: 'p1',
      title: 'Turma',
      timeZone: 'America/Sao_Paulo',
      capacity: 8,
      accessDays: 30,
      teacherIds: ['t1'],
      status: 'open',
      createdAt: '2026-10-01T00:00:00Z',
    },
    plan: null,
    planRevision: 'r',
    access: {
      startsAt: '2026-10-14T18:00:00Z',
      endsAt: '2026-11-13T18:00:00Z',
      status: 'available',
      canOpen: true,
      canJoinMedia: true,
      canWatchRecording: false,
    },
    occurrence: {
      id: 'o1',
      sessionId: 's1',
      startsAt: '2026-10-14T18:00:00Z',
      endsAt: '2026-10-14T19:30:00Z',
      hardEndsAt: '2026-10-14T19:30:00Z',
      state,
      version: 7,
      speakingMode: 'turns',
      chatEnabled: true,
      teachers: { t1: 'Ana' },
      participants,
      messages: [],
      recording: {
        state: 'not_started',
        published: false,
        version: 0,
        storageKey: null,
        ...recording,
      },
    },
    recordings: [],
    role: 'teacher',
    actorId: 't1',
    supervision: 'present',
    serverTime: SERVER_TIME,
    mediaReady: true,
  }
}

let cleanup: (() => void) | null = null
afterEach(() => {
  cleanup?.()
  cleanup = null
})

async function mount(node: React.ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(node))
  cleanup = () => {
    act(() => root.unmount())
    container.remove()
  }
  return container
}

const buttons = (scope: ParentNode) => [...scope.querySelectorAll('button')]
function button(scope: ParentNode, label: string | RegExp) {
  const found = buttons(scope).find((node) =>
    typeof label === 'string'
      ? node.textContent?.trim() === label
      : label.test(node.textContent ?? ''),
  )
  if (!found) throw new Error(`Botão ausente: ${label}`)
  return found
}

describe('organização da sala (professora)', () => {
  test('recepção: receber todos de uma vez e começar', async () => {
    const sent: unknown[] = []
    const view = await mount(
      <LiveTeacherControls
        room={room('lobby', [
          child('ana', { admission: 'waiting' }),
          child('bia', { admission: 'waiting' }),
        ])}
        busy={false}
        stale={false}
        onControl={async (command) => {
          sent.push(command)
          return true
        }}
      />,
    )
    await act(async () => button(view, 'Receber todos (2)').click())
    await act(async () => button(view, 'Começar encontro').click())
    expect(sent).toEqual([{ kind: 'admit-all' }, { kind: 'start' }])
    // Os nomes dos modos de fala da especificação.
    expect(
      [...view.querySelectorAll('[aria-pressed]')].map((node) => node.textContent?.trim()),
    ).toEqual(['Conversa livre', 'Falar por vez', 'Hora de ouvir'])
    expect(view.querySelector('[aria-pressed="true"]')?.textContent).toBe('Falar por vez')
  })

  test('abaixar mãos manda o horário da foto da sala que a professora viu', async () => {
    const sent: unknown[] = []
    const current = room('live', [child('ana', { handAt: '2026-10-14T18:00:01Z' })])
    expect(lowerHandsCommand(current)).toEqual({
      kind: 'lower-hands',
      learnerId: null,
      before: SERVER_TIME,
    })
    const view = await mount(
      <LiveTeacherControls
        room={current}
        busy={false}
        stale={false}
        onControl={async (command) => {
          sent.push(command)
          return true
        }}
      />,
    )
    await act(async () => button(view, 'Abaixar todas as mãos (1)').click())
    expect(sent).toEqual([{ kind: 'lower-hands', learnerId: null, before: SERVER_TIME }])
  })

  test('encerrar e cancelar só depois da confirmação, nunca com window.confirm', async () => {
    const sent: unknown[] = []
    const originalConfirm = window.confirm
    window.confirm = () => {
      throw new Error('window.confirm não pode ser usado')
    }
    try {
      const onControl = async (command: unknown) => {
        sent.push(command)
        return true
      }
      const live = await mount(
        <LiveTeacherControls
          room={room('live', [])}
          busy={false}
          stale={false}
          onControl={onControl}
        />,
      )
      await act(async () => button(live, 'Encerrar encontro').click())
      expect(sent).toEqual([])
      const dialog = document.querySelector('[role="dialog"]')!
      expect(dialog.textContent).toContain('Os desafios e o projeto de cada uma continuam')
      await act(async () => button(dialog, 'Encerrar encontro').click())
      expect(sent).toEqual([{ kind: 'end' }])
      cleanup?.()
      cleanup = null

      const scheduled = await mount(
        <LiveTeacherControls
          room={room('scheduled', [])}
          busy={false}
          stale={false}
          onControl={onControl}
        />,
      )
      await act(async () => button(scheduled, 'Cancelar encontro').click())
      const cancel = document.querySelector('[role="dialog"]')!
      expect(cancel.textContent).toContain('As famílias continuam com o acesso')
      expect(cancel.textContent).toContain('agendar uma reposição')
      await act(async () => button(cancel, 'Voltar').click())
      expect(sent).toEqual([{ kind: 'end' }])
      await act(async () => button(scheduled, 'Cancelar encontro').click())
      await act(async () =>
        button(document.querySelector('[role="dialog"]')!, 'Cancelar encontro').click(),
      )
      expect(sent).toEqual([{ kind: 'end' }, { kind: 'cancel' }])
    } finally {
      window.confirm = originalConfirm
    }
  })

  test('todo botão da organização tem pelo menos 44px', async () => {
    const view = await mount(
      <LiveTeacherControls
        room={room('live', [child('ana', { admission: 'waiting' })])}
        busy={false}
        stale={false}
        onControl={async () => true}
      />,
    )
    for (const node of buttons(view)) expect(node.className).toContain('min-h-11')
  })
})

describe('cartões da turma', () => {
  test('ação principal: receber, permitir voltar, ajuda, vez de falar e acompanhar', () => {
    expect(participantPrimaryAction(child('a', { admission: 'waiting' })).label).toBe('Receber')
    expect(participantPrimaryAction(child('a', { admission: 'removed' })).label).toBe(
      'Permitir voltar',
    )
    expect(participantPrimaryAction(child('a', { helpAt: SERVER_TIME })).kind).toBe('observe-help')
    expect(participantPrimaryAction(child('a', { handAt: SERVER_TIME })).kind).toBe('grant-turn')
    expect(participantPrimaryAction(child('a')).kind).toBe('observe')
  })

  test('o estado vem em texto, nunca só pela cor', () => {
    expect(
      participantSignals(
        child('a', {
          helpAt: SERVER_TIME,
          handAt: SERVER_TIME,
          turnGranted: true,
          microphoneLocked: true,
          cameraLocked: true,
        }),
      ).map((signal) => signal.label),
    ).toEqual([
      'Pediu ajuda',
      'Mão levantada',
      'Com a vez de falar',
      'Microfone bloqueado',
      'Câmera pausada',
    ])
    expect(participantSignals(child('a', { admission: 'waiting', handAt: SERVER_TIME }))).toEqual(
      [],
    )
  })

  test('na recepção a professora já recebe; retirada volta só com permissão', async () => {
    const sent: unknown[] = []
    const view = await mount(
      <LiveParticipants
        room={room('lobby', [
          child('Bia', { admission: 'waiting' }),
          child('Caio', { admission: 'removed' }),
        ])}
        disabled={false}
        onControl={async (command) => {
          sent.push(command)
          return true
        }}
        onObserve={() => {}}
      />,
    )
    expect(view.textContent).toContain('Saiu deste encontro. Só volta se você permitir.')
    await act(async () => button(view, 'Receber').click())
    await act(async () => button(view, 'Permitir voltar').click())
    expect(sent).toEqual([
      { kind: 'admit', learnerId: 'Bia' },
      { kind: 'admit', learnerId: 'Caio' },
    ])
  })

  test('retirar da sala pede confirmação que diz que é só com permissão para voltar', async () => {
    const sent: unknown[] = []
    const view = await mount(
      <LiveParticipants
        room={room('live', [child('Dora', { microphoneLocked: true })])}
        disabled={false}
        onControl={async (command) => {
          sent.push(command)
          return true
        }}
        onObserve={() => {}}
      />,
    )
    expect(view.querySelector('[data-signal="mic-locked"]')?.textContent).toBe(
      'Microfone bloqueado',
    )
    await act(async () => button(view, 'Retirar da sala').click())
    expect(sent).toEqual([])
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain(
      'Dora sai deste encontro agora e só volta se você permitir',
    )
    await act(async () => button(dialog, 'Retirar da sala').click())
    expect(sent).toEqual([{ kind: 'remove', learnerId: 'Dora' }])
  })

  test('encontro encerrado não aceita moderação', async () => {
    const view = await mount(
      <LiveParticipants
        room={room('ended', [child('Eva', { admission: 'waiting' })])}
        disabled={false}
        onControl={async () => true}
        onObserve={() => {}}
      />,
    )
    expect(button(view, 'Receber').disabled).toBe(true)
  })
})

describe('gravação do encontro (professora)', () => {
  test('cada estado tem rótulo e próximo passo', () => {
    expect(recordingStatusView({ state: 'processing', published: false }, 'ended').key).toBe(
      'processing',
    )
    expect(recordingStatusView({ state: 'review', published: false }, 'ended')).toMatchObject({
      key: 'review',
      label: 'Pronta para revisar',
    })
    expect(recordingStatusView({ state: 'ready', published: true }, 'ended').key).toBe('published')
    expect(recordingStatusView({ state: 'failed', published: false }, 'ended').nextStep).toContain(
      'reposição',
    )
    expect(recordingStatusView({ state: 'not_started', published: false }, 'ended').key).toBe(
      'empty',
    )
    expect(recordingStatusView({ state: 'not_started', published: false }, 'scheduled').key).toBe(
      'waiting',
    )
    expect(recordingStatusView({ state: 'empty', published: false }, 'ended').key).toBe('empty')
    expect(recordingStatusView({ state: 'unavailable', published: false }, 'live')).toMatchObject({
      key: 'unavailable',
      label: 'Gravador sem resposta',
    })
    // Um estado que este app ainda não conhece não quebra a tela.
    expect(recordingStatusView({ state: 'arquivada', published: false }, 'ended').key).toBe('empty')
    for (const state of ['processing', 'review', 'failed', 'not_started'] as const)
      expect(recordingStatusView({ state, published: false }, 'ended').nextStep).toBeTruthy()
  })

  test('a gravação do encontro atual nunca some da vista', () => {
    const items = recordingItems(room('ended', [], { state: 'processing', version: 3 }))
    expect(items).toEqual([
      {
        occurrenceId: 'o1',
        startsAt: '2026-10-14T18:00:00Z',
        recording: { state: 'processing', published: false, version: 3 },
      },
    ])
  })
})

describe('reposição', () => {
  const now = Date.parse('2026-10-14T18:00:00Z')
  test('confere as datas antes de ir ao servidor', () => {
    expect(replacementError('', '', '', now)).toBe('Informe o início e o fim da reposição.')
    expect(replacementError('2026-10-13T10:00', '2026-10-13T11:00', '', now)).toContain(
      'daqui para a frente',
    )
    expect(replacementError('2026-10-20T10:00', '2026-10-20T09:00', '', now)).toContain(
      'depois do início',
    )
    expect(replacementError('2026-10-20T10:00', '2026-10-20T15:00', '', now)).toContain(
      'quatro horas',
    )
    expect(
      replacementError('2026-10-20T10:00', '2026-10-20T11:00', '2026-10-20T10:30', now),
    ).toContain('novo fim de acesso')
    expect(replacementError('2026-10-20T10:00', '2026-10-20T11:00', '', now)).toBeNull()
  })
})
