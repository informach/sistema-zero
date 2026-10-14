import type {
  LiveMediaDescription,
  LiveMediaKind,
  LiveMediaPublication,
} from '@sistemazero/core/live'

export interface LiveMediaActor {
  id: string
  accountId: string
  name: string
  staff: boolean
}

export interface LiveMediaAccess {
  actorId: string
  role: 'teacher' | 'learner'
  canPublishAudio: boolean
  canPublishVideo: boolean
  muteEpoch: number
  hardEndsAt: string
}

export interface LiveMediaAuthorizationPort {
  authorize(actor: LiveMediaActor, occurrenceId: string, deviceId: string): Promise<LiveMediaAccess>
}

export interface LiveMediaResource {
  mid: string
  direction: 'local' | 'remote'
  publication: LiveMediaPublication
  publisherSessionId: string
  trackName: string
  state: 'negotiating' | 'active' | 'closing' | 'closed'
  muteEpoch: number
}

export interface LiveMediaConnection {
  id: string
  occurrenceId: string
  actor: LiveMediaActor
  deviceId: string
  generation: number
  role: 'teacher' | 'learner'
  sessionId: string | null
  status: 'creating' | 'active' | 'retired' | 'closed'
  createdAt: string
  leaseEndsAt: string
  hardEndsAt: string
  resources: LiveMediaResource[]
  pending: {
    id: string
    state: 'requesting' | 'awaiting-answer' | 'awaiting-applied' | 'completing'
    startedAt: string
    description?: LiveMediaDescription
    mid?: string
    publication?: LiveMediaPublication
  } | null
  cleanupPending: boolean
  /** A timeout is not proof that the provider stopped processing the request. */
  uncertain: boolean
}

/** Every mutate/insert must be durable and serialized across backend replicas. */
export interface LiveMediaRegistryPort {
  /** Atomically retire the actor's former connections and assign a monotonic generation. */
  insert(connection: LiveMediaConnection): Promise<LiveMediaConnection>
  get(id: string): Promise<LiveMediaConnection | null>
  list(occurrenceId: string): Promise<LiveMediaConnection[]>
  mutate<T>(id: string, update: (connection: LiveMediaConnection) => T): Promise<T>
}

export class LiveMediaError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 409,
  ) {
    super(message)
    this.name = 'LiveMediaError'
  }
}

export function canReceiveLivePublication(
  receiver: 'teacher' | 'learner' | 'recorder',
  publication: LiveMediaPublication,
): boolean {
  if (receiver === 'recorder') {
    return publication.role === 'teacher' && publication.kind !== 'screen'
  }
  if (publication.kind === 'screen') return receiver === 'teacher'
  return true
}

export function canPublishLiveKind(access: LiveMediaAccess, kind: LiveMediaKind): boolean {
  if (kind === 'microphone') return access.canPublishAudio
  if (kind === 'camera') return access.canPublishVideo
  if (kind === 'demo') return access.role === 'teacher'
  return access.role === 'learner'
}
