import type { DesktopSessionClaim } from '@sistemazero/core/security'
export type DesktopPairing = {
  id: string
  deviceCodeHash: string
  userCodeHash: string
  challenge: string
  label: string
  expiresAt: Date
}
export type DesktopDevice = {
  id: string
  userId: string
  sessionId: string
  label: string
  createdAt: Date
  expiresAt: Date
  revokedAt: Date | null
}
export interface DesktopSessionRepository {
  createPairing(input: DesktopPairing): Promise<void>
  describe(userCodeHash: string, now: Date): Promise<{ label: string; expiresAt: Date } | null>
  approve(userCodeHash: string, userId: string, now: Date): Promise<boolean>
  consume(
    deviceCodeHash: string,
    challenge: string,
    credentialHash: string,
    now: Date,
  ): Promise<{ status: 'pending' } | { status: 'approved'; device: DesktopDevice } | null>
  findByCredential(credentialHash: string, now: Date): Promise<DesktopDevice | null>
  list(userId: string): Promise<DesktopDevice[]>
  revoke(userId: string, deviceId: string, now: Date): Promise<boolean>
  validate(claim: DesktopSessionClaim, userId: string, now: Date): Promise<boolean>
  purgePairings(before: Date): Promise<number>
}
