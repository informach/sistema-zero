export const MESSAGE_STATUSES = [
  'QUEUED',
  'SCHEDULED',
  'SENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'SUPPRESSED',
] as const

export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

/** Estados terminais — não transicionam mais por conta própria. */
export const TERMINAL_STATUSES: ReadonlySet<MessageStatus> = new Set<MessageStatus>([
  'READ',
  'FAILED',
  'SUPPRESSED',
])

/** Estados "devidos" que o worker pode reivindicar para enviar. */
export const SENDABLE_STATUSES: ReadonlySet<MessageStatus> = new Set<MessageStatus>([
  'QUEUED',
  'SCHEDULED',
])
