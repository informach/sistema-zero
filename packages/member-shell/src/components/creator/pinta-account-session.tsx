import type { PintaCausalViewer } from '@sistemazero/core/creations/pinta-causal'
import type { ReactNode } from 'react'
import type { SessionUser } from '../../lib/types'
import { pintaAccountViewer } from '../../server/pinta-causal-eligibility'
import { PintaAccountScope } from './pinta-account-scope'

export function PintaAccountSession({
  session,
  audience,
  children,
}: {
  session: SessionUser | null
  audience: PintaCausalViewer['audience']
  children: ReactNode
}) {
  return (
    <PintaAccountScope viewer={pintaAccountViewer(session, audience)}>{children}</PintaAccountScope>
  )
}
