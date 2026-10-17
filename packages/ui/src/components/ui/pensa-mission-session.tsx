import type {
  PensaAssetSlot,
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
}
