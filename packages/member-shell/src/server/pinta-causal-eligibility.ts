import 'server-only'
import {
  type PintaCausalViewer,
  pintaCausalQaAllows,
} from '@sistemazero/core/creations/pinta-causal'
import { isReadonlyImpersonation } from '../lib/act'
import { getEnv } from '../lib/env'
import { learnerIdentity } from '../lib/learner-identity'
import type { SessionUser } from '../lib/types'

export function pintaCausalCandidateReady(): boolean {
  const env = getEnv()
  return env.PINTA_CAUSAL_CANDIDATE === '1' && pintaPrivateStorageReady(env)
}

export function pintaPaletteWriteCandidateReady(): boolean {
  const env = getEnv()
  return env.PINTA_PALETTE_WRITE_CANDIDATE === '1' && pintaPrivateStorageReady(env)
}

function pintaPrivateStorageReady(env: ReturnType<typeof getEnv>): boolean {
  return (
    env.PINTA_CAUSAL_QA_PROFILES.length > 0 &&
    Boolean(
      env.MEMBER_SHELL_HMAC_SECRET &&
        env.R2_ACCOUNT_ID &&
        env.R2_ACCESS_KEY_ID &&
        env.R2_SECRET_ACCESS_KEY &&
        env.R2_UGC_BUCKET,
    )
  )
}

export function pintaCausalViewer(
  user: SessionUser,
  audience: PintaCausalViewer['audience'],
): PintaCausalViewer {
  return {
    userId: user.id,
    accountId: user.activeProfile?.accountId ?? user.id,
    audience,
  }
}

export function pintaCausalProfileAllowed(viewer: PintaCausalViewer): boolean {
  return pintaCausalQaAllows(getEnv().PINTA_CAUSAL_QA_PROFILES, viewer)
}

export function pintaCausalPageEligible(
  user: SessionUser | null,
  audience: PintaCausalViewer['audience'],
): boolean {
  return (
    pintaCausalCandidateReady() &&
    !!user &&
    user.status === 'active' &&
    user.kids?.kind !== 'parent' &&
    !isReadonlyImpersonation(user) &&
    pintaCausalProfileAllowed(pintaCausalViewer(user, audience))
  )
}

export function pintaPalettePageViewer(
  user: SessionUser | null,
  audience: PintaCausalViewer['audience'],
): PintaCausalViewer | null {
  if (
    !user ||
    !learnerIdentity(user, audience) ||
    isReadonlyImpersonation(user) ||
    !pintaPaletteWriteCandidateReady()
  )
    return null
  const viewer = pintaCausalViewer(user, audience)
  return pintaCausalProfileAllowed(viewer) ? viewer : null
}
