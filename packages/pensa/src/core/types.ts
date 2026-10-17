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

export type PensaMascotPose = 'happy' | 'thinking' | 'celebrating' | 'sleeping'

/** Browser integration only. Project availability is supplied by the server. */
export interface PensaHostAdapter {
  viewerId?: string
  transport: PensaTransport
  mode: 'kids'
  theme?: 'light' | 'dark'
  mascotImages?: Partial<Record<PensaMascotPose, string>>
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
