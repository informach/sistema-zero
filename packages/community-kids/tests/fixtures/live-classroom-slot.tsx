/**
 * A sala de curso ao vivo pelo slot da aula (14/10/2026): o `LiveClassroom` de verdade, com a
 * mídia substituída (rede e aparelhos ficam fora deste fluxo) e o servidor imitado pelo `fetch`.
 * Roda em processo próprio (ver `live-classroom-slot.test.ts`): o `mock.module` do bun é global.
 */
import { afterEach, expect, mock, test } from 'bun:test'
import type { LiveRoomView } from '@sistemazero/core/live'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'

mock.module('../../../member-shell/src/components/live/live-media-panel', () => ({
  LiveMediaPanel: () => createElement('p', null, 'Painel da professora'),
  Stream: () => null,
  useLiveMedia: () => ({
    local: { microphone: null, camera: null, screen: null },
    remote: {},
    self: undefined,
    busy: false,
    available: false,
    microphoneAllowed: false,
    cameraAllowed: false,
    sessionReady: false,
    reconnecting: false,
    cameraEffect: 'none',
    setCameraEffect: () => {},
    capture: async () => new MediaStream(),
    publish: async () => {},
    toggle: async () => {},
    stop: () => {},
    label: () => '',
  }),
}))
const { LiveClassroom } = await import('../../../member-shell/src/components/live/live-classroom')
type Slot = import('../../../member-shell/src/lib/live/lesson-slot').LiveLessonSlotProps

const SESSION = 'c7a1b6a0-531a-4c29-8b1e-46d2b61f6506'
const LESSON = 'd05682a7-175b-483b-983c-46d4a7676627'
const originalFetch = globalThis.fetch
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
})

function room(
  overrides: Partial<LiveRoomView> = {},
  joinedDevice: string | null = null,
): LiveRoomView {
  const now = new Date().toISOString()
  return {
    session: {
      id: SESSION,
      cohortId: 'cohort',
      order: 0,
      title: 'Encontro 1',
      startsAt: now,
      endsAt: new Date(Date.now() + 3_600_000).toISOString(),
      accessEndsAt: new Date(Date.now() + 86_400_000).toISOString(),
      occurrenceId: 'occ',
    },
    cohort: {
      id: 'cohort',
      programId: '',
      courseId: 'course',
      course: { id: 'course', slug: 'dino-ao-vivo', title: 'Dino ao vivo', audience: 'kids' },
      title: 'Turma A',
      timeZone: 'America/Sao_Paulo',
      capacity: 8,
      accessDays: 30,
      teacherIds: ['teacher'],
      teacherNames: { teacher: 'Ana' },
      status: 'open',
      createdAt: now,
    },
    lesson: { courseId: 'course', courseSlug: 'dino-ao-vivo', lessonId: LESSON },
    access: {
      startsAt: now,
      endsAt: new Date(Date.now() + 86_400_000).toISOString(),
      status: 'available',
      canOpen: true,
      canJoinMedia: true,
      canWatchRecording: false,
      canEnterLobby: true,
    },
    occurrence: {
      id: 'occ',
      sessionId: SESSION,
      startsAt: now,
      endsAt: new Date(Date.now() + 3_600_000).toISOString(),
      hardEndsAt: new Date(Date.now() + 7_200_000).toISOString(),
      state: 'live',
      version: 3,
      speakingMode: 'open',
      chatEnabled: true,
      teachers: {},
      participants: joinedDevice
        ? [
            {
              learnerId: 'child',
              displayName: 'Bia',
              deviceId: joinedDevice,
              admission: 'admitted',
              joinedAt: now,
              seenAt: now,
              handAt: null,
              helpAt: null,
              microphoneLocked: false,
              cameraLocked: false,
              turnGranted: false,
              muteEpoch: 0,
            },
          ]
        : [],
      messages: [],
      sections: { openedIds: ['a'], currentId: 'a' },
      recording: { state: 'recording', published: false, version: 0, storageKey: null },
    },
    role: 'learner',
    actorId: 'child',
    supervision: 'present',
    serverTime: now,
    mediaReady: false,
    ...overrides,
  } as LiveRoomView
}

test('a criança recebe a aula pelo slot, com as partes conduzidas, e relata a parte no batimento', async () => {
  let device: string | null = null
  const beats: unknown[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).split('?')[0]!
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    if (path.endsWith('/join')) {
      device = body.deviceId
      return Response.json({ ok: true })
    }
    if (path.endsWith('/heartbeat')) {
      beats.push(body.activity)
      return Response.json({ ok: true })
    }
    return Response.json(room({}, device))
  }) as typeof fetch
  const slots: Slot[] = []
  render(
    createElement(LiveClassroom, {
      sessionId: SESSION,
      renderLesson: (slot: Slot) => {
        slots.push(slot)
        return createElement(
          'div',
          null,
          slot.stage,
          createElement(
            'button',
            {
              type: 'button',
              onClick: () => slot.onSectionReport({ sectionId: 'a', completedSectionIds: ['a'] }),
            },
            'relatar',
          ),
        )
      },
    }),
  )
  await waitFor(() => expect(slots.length).toBeGreaterThan(0))
  const slot = slots.at(-1)!
  expect(slot.teacher).toBe(false)
  expect(slot.lesson).toEqual({ courseId: 'course', courseSlug: 'dino-ao-vivo', lessonId: LESSON })
  expect(slot.sectionControl).toEqual({ openedIds: ['a'], currentId: 'a' })
  expect(slot.audience).toBe('kids')
  expect(slot.liveWorkspace?.role).toBe('learner')
  // Antes de entrar, a porta da sala mora no lugar da transmissão (entrar não faz a aula pular).
  expect(screen.getByRole('heading', { name: 'A professora Ana já está na sala!' })).toBeDefined()
  // O roteiro antigo saiu da sala.
  expect(screen.queryByText('Vamos criar')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'relatar' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Entrar na sala' }))
  await waitFor(() => expect(beats.length).toBeGreaterThan(0))
  expect(beats[0]).toMatchObject({
    stepId: null,
    sectionId: 'a',
    completedSectionIds: ['a'],
  })
  // Dentro da sala, a barra da chamada no rodapé e a transmissão no palco.
  await waitFor(() =>
    expect(screen.getByRole('navigation', { name: 'Controles da sala' })).toBeDefined(),
  )
  expect(screen.getByRole('region', { name: 'Professora Ana ao vivo' })).toBeDefined()
  expect(screen.getByRole('button', { name: /Ampliar a transmissão/ })).toBeDefined()
})

test('turma antiga do roteiro cai no recado do formato antigo', async () => {
  globalThis.fetch = (async () =>
    Response.json(
      room({ lesson: null, cohort: { ...room().cohort, course: null, courseId: null } }),
    )) as unknown as typeof fetch
  render(createElement(LiveClassroom, { sessionId: SESSION, renderLesson: () => 'aula' }))
  await waitFor(() => expect(screen.getByText('Esta turma é de um formato antigo')).toBeDefined())
  expect(screen.queryByText('aula') === null).toBe(true)
  cleanup()
  // A sala da professora também.
  globalThis.fetch = (async () =>
    Response.json(
      room({
        role: 'teacher',
        actorId: 'teacher',
        lesson: null,
        cohort: { ...room().cohort, course: null, courseId: null },
      }),
    )) as unknown as typeof fetch
  render(
    createElement(LiveClassroom, { sessionId: SESSION, teacher: true, renderLesson: () => 'aula' }),
  )
  await waitFor(() => expect(screen.getByText('Esta turma é de um formato antigo')).toBeDefined())
  expect(screen.queryByText('aula') === null).toBe(true)
})

test('a professora recebe a aula com todas as partes abertas e as anotações dela', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const path = String(input).split('?')[0]!
    if (path.endsWith('/teacher-notes')) return Response.json({ notes: { b: 'Mostrar a seta.' } })
    return Response.json(room({ role: 'teacher', actorId: 'teacher' }))
  }) as typeof fetch
  const slots: Slot[] = []
  render(
    createElement(LiveClassroom, {
      sessionId: SESSION,
      teacher: true,
      renderLesson: (slot: Slot) => {
        slots.push(slot)
        return createElement(
          'button',
          {
            type: 'button',
            onClick: () =>
              slot.onOutline?.({
                sections: [
                  { id: 'a', title: 'Conhecer' },
                  { id: 'b', title: 'Mover' },
                ],
              }),
          },
          'contar as partes',
        )
      },
    }),
  )
  fireEvent.click(await screen.findByRole('button', { name: 'contar as partes' }))
  await waitFor(() => expect(slots.at(-1)?.teacherNotes).toEqual({ b: 'Mostrar a seta.' }))
  const slot = slots.at(-1)!
  expect(slot.teacher).toBe(true)
  // A professora não é presa: todas abertas, acompanhando a parte da turma.
  expect(slot.sectionControl).toEqual({ openedIds: ['a', 'b'], currentId: 'a' })
  expect(slot.liveWorkspace?.role).toBe('teacher')
})
