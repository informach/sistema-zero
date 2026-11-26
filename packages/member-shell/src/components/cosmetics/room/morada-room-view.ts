import type { ReactNode } from 'react'
import type { RoomBuilderTab } from './room-builder-model'

/** As duas abas do painel do quarto Kids (26/11/2026): a loja e as peças que já estão nele. */
export type RoomPanel = 'decorar' | 'quarto'

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
  /**
   * Só a tela Kids (26/11/2026) usa os campos abaixo; a adulta segue com `extras`.
   * `avatar`: a foto pequena do avatar na barra de cima. `stageTools`: o zoom e as paredes, por
   * cima do quarto. `stack`: o "Colocar em cima de", ao lado das ações da peça. `adjust`: o
   * ajuste da peça escolhida, na aba "No quarto". `panel`/`onPanel`: a aba aberta do painel.
   */
  avatar?: ReactNode
  stageTools?: ReactNode
  stack?: ReactNode
  adjust?: ReactNode
  placedCount?: number
  selectedLabel?: string | null
  panel?: RoomPanel
  onPanel?(panel: RoomPanel): void
}
