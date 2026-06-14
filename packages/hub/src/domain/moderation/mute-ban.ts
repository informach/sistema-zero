export type MuteBanKind = 'mute' | 'ban'

/** Silenciamento/banimento ativo de um usuário num servidor (ou canal). */
export interface MuteBan {
  id: string
  userId: string
  spaceId: string
  /** `null` = vale no servidor inteiro. */
  channelId: string | null
  kind: MuteBanKind
  /** `null` = permanente. */
  expiresAt: Date | null
  reason: string | null
  createdBy: string
  createdAt: Date
}

export function isActiveMuteBan(mb: MuteBan, now: Date): boolean {
  return mb.expiresAt === null || mb.expiresAt > now
}
