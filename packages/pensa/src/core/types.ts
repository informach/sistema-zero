import type { PensaDestination, PensaNarratableRef } from '@sistemazero/core/pensa'
import type { ReactNode } from 'react'

export interface PensaTransport {
  request<T>(
    path: string,
    init?: {
      method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
      body?: unknown
    },
  ): Promise<T>
}

export class PensaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly scope?: 'day' | 'month',
  ) {
    super(message)
    this.name = 'PensaApiError'
  }
}

export type PensaMascotPose = 'happy' | 'thinking' | 'celebrating' | 'sleeping' | 'speaking'

/** Browser integration only. Project availability is supplied by the server. */
export interface PensaHostAdapter {
  viewerId?: string
  transport: PensaTransport
  mode: 'kids' | 'adult'
  theme?: 'light' | 'dark'
  /** Kids only: the Zappy poses. Adult hosts omit them and the planner shows no mascot. */
  mascotImages?: Partial<Record<PensaMascotPose, string>>
  /**
   * The host already knows this is a read-only support session. Without it the planner still
   * switches to read-only when the BFF answers `IMPERSONATION_READONLY`.
   */
  readOnly?: boolean
  renderListen?: (reference: PensaNarratableRef) => ReactNode
  renderVoiceInput?: (input: {
    value: string
    onChange(value: string): void
    onBusyChange(busy: boolean): void
    disabled: boolean
    textareaId: string
  }) => ReactNode
  onOpenMission(input: {
    missionId: string
    destination: PensaDestination
    studioProjectId: string
    studioAuthoring: 'blocks' | 'code'
  }): void
  onOpenGame(input: {
    projectId: string
    studioProjectId: string
    studioAuthoring: 'blocks' | 'code'
  }): void
}

export interface PensaHostChromeMenu {
  hidden: boolean
  label: string
  onToggle(): void
}
export interface PensaHostChromeBack {
  label: string
  href: string
  onNavigate(): void
}
export interface PensaHostChrome {
  menu: PensaHostChromeMenu | null
  back: PensaHostChromeBack | null
}
