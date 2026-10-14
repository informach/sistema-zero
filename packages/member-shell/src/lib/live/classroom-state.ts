import type { LiveRoomView } from '@sistemazero/core/live'

/** Omission saves bandwidth; an explicit null revokes the cached lesson immediately. */
export function mergeLiveRoomPlan(previous: LiveRoomView | null, next: LiveRoomView): LiveRoomView {
  if (Object.hasOwn(next, 'plan')) return next
  return {
    ...next,
    plan:
      previous?.session.id === next.session.id && previous.planRevision === next.planRevision
        ? (previous.plan ?? null)
        : null,
  }
}

/** Admission is a prerequisite of media, not a prerequisite of entering reception. */
export function classroomState(
  room: LiveRoomView | null,
  deviceId: string,
  joined: boolean,
  stale: boolean,
) {
  const self = room?.occurrence?.participants.find(
    (participant) => participant.learnerId === room.actorId,
  )
  const isTeacher = room?.role === 'teacher'
  const admitted = isTeacher || (self?.admission === 'admitted' && self.deviceId === deviceId)
  const live = room?.occurrence?.state === 'live'
  const supervised = room?.supervision === 'present'
  const state = room?.occurrence?.state
  const canEnter = !!room?.access.canOpen && (state === 'lobby' || state === 'live')
  const canInteract = !!room?.access.canOpen && joined && admitted && live && supervised && !stale
  return {
    self,
    isTeacher,
    admitted,
    live,
    supervised,
    canEnter,
    canInteract,
    canSendChat: canInteract && (isTeacher || room?.occurrence?.chatEnabled === true),
  }
}
