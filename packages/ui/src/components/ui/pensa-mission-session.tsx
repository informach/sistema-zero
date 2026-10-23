import type {
  PensaAssetSlot,
  PensaDestination,
  PensaKnowledgeReference,
  PensaMission,
  PensaMissionProgress,
} from '@sistemazero/core/pensa'
import type { ReactNode } from 'react'

/** Browser actions around a canonical mission. No domain payload is mirrored here. */
export interface PensaMissionSession {
  mission: PensaMission
  progress: PensaMissionProgress
  project: { id: string; name: string }
  assetSlots: PensaAssetSlot[]
  references: PensaKnowledgeReference[]
  blockedReason: string | null
  collapsed: boolean
  onCollapsedChange(collapsed: boolean): void
  renderListen?: (section: 'objective' | 'rule' | 'check' | 'setup', itemId?: string) => ReactNode
  onComplete(): Promise<void>
  onReopen(): Promise<void>
  onNextMission(): Promise<void>
  nextMissionLabel: string
  onNeedHelp(): void | Promise<void>
  onReturnToPlan(): void | Promise<void>
  onBindCreation(input: { assetSlotId: string; creationId: string }): Promise<void>
  onSaveNote(note: string): Promise<void>
  /**
   * Display only, read from the accepted plan the server returned: where this mission sits in
   * the plan ("missão 4 de 9"). Absent while the plan is loading or when the host has none.
   */
  order?: { index: number; total: number } | null
  /** Display only: the mission the server named as the next action, with its title. */
  nextMission?: { title: string; destination: PensaDestination } | null
  /**
   * Display only: the teammate who programs the game and receives this art (team games, art
   * missions of someone else). Comes from the team the server returned.
   */
  /** Quem programa e recebe a arte; `name` nulo quando o primeiro nome não veio. */
  handoffTo?: { name: string | null } | null
}
