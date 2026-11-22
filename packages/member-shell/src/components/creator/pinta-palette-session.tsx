import type { PintaCausalViewer } from '@sistemazero/core/creations/pinta-causal'
import type { ReactNode } from 'react'
import type { SessionUser } from '../../lib/types'
import { pintaPalettePageViewer } from '../../server/pinta-causal-eligibility'
import { PintaPaletteScope } from './pinta-palette-scope'

export function PintaPaletteSession({
  session,
  audience,
  children,
}: {
  session: SessionUser | null
  audience: PintaCausalViewer['audience']
  children: ReactNode
}) {
  return (
    <PintaPaletteScope viewer={pintaPalettePageViewer(session, audience)}>
      {children}
    </PintaPaletteScope>
  )
}
