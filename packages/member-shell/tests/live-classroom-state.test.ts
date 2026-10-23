import { describe, expect, test } from 'bun:test'
import type { LiveRoomView } from '@sistemazero/core/live'
import { classroomState, mergeLiveRoomPlan } from '../src/lib/live/classroom-state'

function room(overrides: Partial<LiveRoomView> = {}): LiveRoomView {
  return {
    actorId: 'learner',
    role: 'learner',
    access: { canOpen: true, canJoinMedia: false },
    supervision: 'present',
    occurrence: { state: 'lobby', participants: [] },
    ...overrides,
  } as LiveRoomView
}
describe('classroom reception and participation', () => {
  test('paused chat allows teacher notices but keeps children and stale rooms blocked', () => {
    const live = room({
      role: 'teacher',
      occurrence: {
        state: 'live',
        chatEnabled: false,
        participants: [{ learnerId: 'learner', deviceId: 'a', admission: 'admitted' }],
      } as LiveRoomView['occurrence'],
    })
    expect(classroomState(live, 'a', true, false).canSendChat).toBe(true)
    expect(classroomState({ ...live, role: 'learner' }, 'a', true, false).canSendChat).toBe(false)
    expect(classroomState(live, 'a', true, true).canSendChat).toBe(false)
    expect(
      classroomState({ ...live, supervision: 'reconnecting' }, 'a', true, false).canSendChat,
    ).toBe(false)
  })
  test('keeps only matching omitted plans and clears explicit revoked or expired plans', () => {
    const previous = room({
      session: { id: 'session-a' } as LiveRoomView['session'],
      planRevision: 'hash-a',
      plan: { title: 'Private lesson' } as LiveRoomView['plan'],
    })
    const omitted = room({ session: previous.session, planRevision: 'hash-a' })
    expect(mergeLiveRoomPlan(previous, omitted).plan).toBe(previous.plan)
    expect(mergeLiveRoomPlan(previous, { ...omitted, plan: null }).plan).toBeNull()
    expect(mergeLiveRoomPlan(previous, { ...omitted, planRevision: 'hash-b' }).plan).toBeNull()
    expect(
      mergeLiveRoomPlan(previous, {
        ...omitted,
        session: { id: 'session-b' } as LiveRoomView['session'],
      }).plan,
    ).toBeNull()
  })
  test('a learner can enter reception before teacher admission', () => {
    const state = classroomState(room(), 'tab-a', false, false)
    expect(state.canEnter).toBe(true)
    expect(state.canInteract).toBe(false)
  })
  test('the reception opens 15 minutes early, only while the teacher keeps it open', () => {
    const early = (state: string) =>
      classroomState(
        room({
          access: { canOpen: false, canEnterLobby: true } as LiveRoomView['access'],
          occurrence: { state, participants: [] } as unknown as LiveRoomView['occurrence'],
        }),
        'a',
        false,
        false,
      )
    expect(early('lobby').canEnter).toBe(true)
    expect(early('lobby').canInteract).toBe(false)
    expect(early('scheduled').canEnter).toBe(false)
  })
  test('pre-release, expired and ended lessons do not reopen calls', () => {
    expect(
      classroomState(
        room({ access: { canOpen: false } as LiveRoomView['access'] }),
        'a',
        false,
        false,
      ).canEnter,
    ).toBe(false)
    expect(
      classroomState(
        room({
          role: 'teacher',
          occurrence: { state: 'ended', participants: [] } as unknown as LiveRoomView['occurrence'],
        }),
        'a',
        false,
        false,
      ).canEnter,
    ).toBe(false)
  })
  test('another document cannot reuse an admitted participation', () => {
    const admitted = room({
      occurrence: {
        state: 'live',
        participants: [{ learnerId: 'learner', deviceId: 'tab-a', admission: 'admitted' }],
      } as unknown as LiveRoomView['occurrence'],
    })
    expect(classroomState(admitted, 'tab-a', true, false).canInteract).toBe(true)
    expect(classroomState(admitted, 'tab-b', true, false).canInteract).toBe(false)
    expect(classroomState(admitted, 'tab-a', true, true).canInteract).toBe(false)
    expect(
      classroomState({ ...admitted, supervision: 'reconnecting' }, 'tab-a', true, false)
        .canInteract,
    ).toBe(false)
  })
})
