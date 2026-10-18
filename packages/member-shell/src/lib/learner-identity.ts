import type { SessionUser } from './types'

export interface LearnerIdentity {
  learnerId: string
  accountId: string
  audience: 'adult' | 'kids'
}

/** Accounts are adult learners; child profiles retain their responsible account. */
export function learnerIdentity(
  session: SessionUser | null,
  audience: LearnerIdentity['audience'],
): LearnerIdentity | null {
  if (session?.status !== 'active') return null
  if (audience === 'adult') {
    if (session.activeProfile || session.kids) return null
    return { learnerId: session.id, accountId: session.id, audience }
  }
  if (!session.activeProfile || session.kids?.kind === 'parent') return null
  return { learnerId: session.id, accountId: session.activeProfile.accountId, audience }
}
