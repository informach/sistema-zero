'use client'

import type { PensaMissionHandoff } from '@sistemazero/core/pensa'
import type { CreationsCloud } from '@/lib/creations-cloud'
import { usePensaMissionSession } from './use-pensa-mission-session'

/** Both Studio modes use the same functional mission and saved evidence contract. */
export function useStudioTaskSession(input: {
  handoff: PensaMissionHandoff | null
  projectId: string | null
  viewerId: string | null
  cloud: CreationsCloud | null
  retry(): void
  update(next: PensaMissionHandoff): void
  navigate(path: string): void
  narrationEnabled?: boolean
}) {
  return usePensaMissionSession({
    ...input,
    handoff: input.handoff?.studioProjectId === input.projectId ? input.handoff : null,
  })
}
