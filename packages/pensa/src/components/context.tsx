import type { AiCreditsMeter } from '@sistemazero/core/ai-credits'
import { createContext, useContext } from 'react'
import type { PensaCopy } from '../core/copy'
import type { PensaHostAdapter, PensaMascotPose } from '../core/types'

/** O que toda tela do planner lê: quem fala com quem, o saldo e se dá para mexer. */
export interface PensaUi {
  adapter: PensaHostAdapter
  copy: PensaCopy
  kids: boolean
  /** Sessão de suporte só leitura: nenhuma ação que grava fica ligada. */
  readOnly: boolean
  credits: AiCreditsMeter
  mascot(pose: PensaMascotPose): string | null
  notify(message: string, tone?: 'ok' | 'error'): void
}

const PensaUiContext = createContext<PensaUi | null>(null)

export const PensaUiProvider = PensaUiContext.Provider

export function usePensaUi(): PensaUi {
  const value = useContext(PensaUiContext)
  if (!value) throw new Error('usePensaUi precisa do PensaApp em volta')
  return value
}
