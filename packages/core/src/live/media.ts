/** Public media contracts. Provider credentials and SFU session IDs stay on the server. */
export type LiveMediaKind = 'microphone' | 'camera' | 'screen' | 'demo'
export type LiveMediaRole = 'teacher' | 'learner' | 'recorder'
export type LiveMediaState = 'idle' | 'connecting' | 'connected' | 'suspended' | 'failed' | 'closed'

export interface LiveMediaDescription {
  type: 'offer' | 'answer'
  sdp: string
}

export interface LiveMediaPublication {
  id: string
  actorId: string
  role: 'teacher' | 'learner'
  kind: LiveMediaKind
  simulcast: boolean
  /** First name of the publisher (child profile or teacher), for the classmates' tiles. */
  displayName?: string
}

export interface LiveMediaNegotiation {
  operationId: string
  sessionDescription?: LiveMediaDescription
  requiresAnswer: boolean
  mid?: string
  publication?: LiveMediaPublication
}

export interface LiveMediaJoin {
  connectionId: string
  generation: number
  iceServers: { urls: string | string[]; username?: string; credential?: string }[]
  controlLeaseMs: number
}

export interface LiveMediaRequestContext {
  occurrenceId: string
  deviceId: string
}
