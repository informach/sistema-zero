import { afterEach, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'

let replay: any
mock.module('../../../member-shell/node_modules/next/dynamic.js', () => ({
  default: () => (props: any) => {
    replay = props
    return createElement('div', { 'data-testid': 'recording' }, props.occurrenceId)
  },
}))
mock.module('../../../member-shell/src/components/live/live-media-panel', () => ({
  useLiveMedia: () => ({
    local: {},
    remote: {},
    self: null,
    available: false,
    sessionReady: false,
    reconnecting: false,
    busy: false,
    cameraEffect: 'none',
    label: () => '',
    toggle: async () => {},
    stop: () => {},
    setCameraEffect: () => {},
  }),
  Stream: () => null,
}))
const { LiveLearnerRoom } = await import(
  '../../../member-shell/src/components/live/live-learner-room'
)
afterEach(() => {
  cleanup()
  replay = null
})
const now = new Date().toISOString()
const room: any = {
  session: {
    id: 's',
    title: 'Cadê, Todo Mundo?',
    startsAt: now,
    endsAt: now,
    accessEndsAt: '2026-12-14T17:00:00Z',
    occurrenceId: 'o',
  },
  cohort: {
    id: 'c',
    title: 'Criadores de sábado',
    timeZone: 'America/Sao_Paulo',
    teacherIds: ['t'],
    teacherNames: { t: 'Helena' },
    course: { id: 'course', slug: 'oficina', title: 'Nosso primeiro jogo', audience: 'kids' },
  },
  lesson: { courseId: 'course', courseSlug: 'oficina', lessonId: 'lesson' },
  access: {
    status: 'available',
    canOpen: true,
    canJoinMedia: true,
    canEnterLobby: true,
    canWatchRecording: false,
    startsAt: now,
    endsAt: '2026-12-14T17:00:00Z',
  },
  occurrence: {
    id: 'o',
    state: 'live',
    version: 1,
    startsAt: now,
    endsAt: now,
    hardEndsAt: '2026-12-14T17:00:00Z',
    speakingMode: 'open',
    chatEnabled: true,
    teachers: {},
    participants: [
      {
        learnerId: 'child',
        displayName: 'Bia',
        deviceId: 'device',
        admission: 'admitted',
        handAt: null,
        helpAt: null,
        microphoneLocked: false,
        cameraLocked: false,
      },
    ],
    messages: [
      {
        id: 'msg',
        authorId: 't',
        role: 'teacher',
        name: 'Helena',
        text: 'Vamos criar juntos!',
        createdAt: now,
      },
    ],
    sections: { openedIds: ['a', 'b'], currentId: 'a' },
    recording: { state: 'recording', version: 1, published: false },
  },
  actorId: 'child',
  role: 'learner',
  supervision: 'present',
  mediaReady: false,
  serverTime: now,
}

test('reposição preserva seleção da gravação original e dos seus capítulos', async () => {
  room.occurrence.state = 'scheduled'
  room.occurrence.recording = { state: 'not_started', published: false, version: 0 }
  room.access.canWatchRecording = true
  room.recordings = [
    {
      occurrenceId: 'original',
      startsAt: now,
      recording: {
        state: 'ready',
        published: true,
        version: 7,
        chapters: [{ sectionId: 'a', seconds: 42 }],
        vimeo: null,
      },
    },
  ]
  const noop = () => {}
  const view = render(
    createElement(LiveLearnerRoom, {
      room,
      deviceId: 'device',
      liveWorkspace: {
        sessionId: room.session.id,
        role: 'learner',
        actorId: room.actorId,
        learnerId: room.actorId,
        deviceId: 'device',
      },
      joined: false,
      takeover: false,
      stale: false,
      busy: false,
      error: null,
      connectionError: null,
      onDismissError: noop,
      onRetry: noop,
      onJoin: noop,
      perform: async () => true,
      onError: noop,
      currentSection: 'a',
      onSectionReport: noop,
      outline: null,
      onOutline: noop,
      renderLesson: (slot: any) => slot.stage,
    }),
  )
  fireEvent.change(screen.getByLabelText('Encontro e gravações'), { target: { value: 'original' } })
  await waitFor(() => expect(replay?.occurrenceId).toBe('original'))
  expect(replay.version).toBe(7)
  expect(replay.chapters).toEqual([{ sectionId: 'a', seconds: 42 }])
  expect(Boolean(screen.queryByTestId('recording'))).toBe(true)
  fireEvent.change(screen.getByLabelText('Encontro e gravações'), { target: { value: 'current' } })
  expect(Boolean(screen.queryByTestId('recording'))).toBe(false)
  view.unmount()
})
