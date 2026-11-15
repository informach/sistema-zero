import type { ReactNode } from 'react'
import type { RoomBuilderTab } from './room-builder-model'

/** As peles existentes recebem conteúdo, sem conhecer o formato da casa ou suas regras. */
export interface MoradaRoomViewProps {
  header?: ReactNode
  wallet: { balance: number; unlimited: boolean } | null
  saving: boolean
  ready: boolean
  onSave(): void
  tab: RoomBuilderTab
  onTab(tab: RoomBuilderTab): void
  stage: ReactNode
  actions: ReactNode
  pieces: ReactNode
  extras: ReactNode
  tray: ReactNode
  notice: ReactNode
}
