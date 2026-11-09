'use client'

import type { SceneAction, SceneActivity, SceneState } from '@sistemazero/core/learning/scene'
import { createContext, type ReactNode, useContext } from 'react'

/** O jeito de o Zappy falar na moldura nova. Sem opções, a fala de sempre (as telas antigas). */
export type FalaDaDescoberta = {
  /** As frases que o "Ouvir" lê em sequência (a ideia e o "No seu jogo:"). */
  textos?: string[]
  pose?: 'speaking' | 'celebrating'
  /** Toca sozinha a cada texto novo (depois do primeiro gesto e com o som ligado). */
  falarSozinho?: boolean
  /** O corpo rico do balão no lugar do texto (o cartão da ideia). */
  corpo?: ReactNode
}

export const DiscoveryContext = createContext<{
  activity: SceneActivity
  state: SceneState
  dispatch: (a: SceneAction) => void
  instruction: string
  /** Movimento e relógios locais compartilham o foco da atividade. Retomar exige gesto. */
  movimento?: {
    pausado: boolean
    retomar: () => Promise<boolean>
    podeAvancar: () => boolean
  }
  running: boolean
  setRunning: (v: boolean) => void
  /**
   * Passa tempo na cena SEM contar como gesto (a câmera lenta do Farol tem o relógio dela). Pelo
   * `dispatch`, cada tique apagaria o aviso da descoberta que acabou de cair.
   */
  tick?: (seconds: number) => void
  /**
   * Um passo do relógio do JOGO que não é gesto da criança (o segundo da ponte, 08/11/2026): como o
   * `tick`, não apaga o aviso da descoberta nem a frase "Continuamos de onde você parou.".
   */
  tempo?: (a: SceneAction) => void
  dialogue: (text: string, opcoes?: FalaDaDescoberta) => ReactNode
  tools: ReactNode
  /** Só o "Continuar para a pergunta" (as telas da moldura nova não mostram o Desfazer nem a pista). */
  continuar?: ReactNode
} | null>(null)
export function useDiscovery() {
  const context = useContext(DiscoveryContext)
  if (!context) throw Error('Discovery context missing')
  return context
}
