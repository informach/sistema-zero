'use client'

import type { PintaCausalViewer } from '@sistemazero/core/creations/pinta-causal'
import { createContext, type ReactNode, useContext } from 'react'

const Scope = createContext<PintaCausalViewer | null>(null)

/**
 * A conta do Pinta desta página, decidida no servidor (`pintaAccountViewer`): o aluno que guarda
 * pela fila causal e pelas paletas negociadas. Sem escopo (pais, suporte em modo leitura, sem
 * storage), o host fica no armazenamento de sempre.
 */
export function PintaAccountScope({
  viewer,
  children,
}: {
  viewer: PintaCausalViewer | null
  children: ReactNode
}) {
  return <Scope.Provider value={viewer}>{children}</Scope.Provider>
}

/**
 * A conta do perfil exibido, só quando o escopo é DESTE perfil e desta audiência. Uma conta
 * trocada aposenta a fila mesmo com o mesmo perfil na tela.
 */
export function usePintaAccount(
  viewerId: string | null,
  audience: PintaCausalViewer['audience'],
): string | null {
  const scope = useContext(Scope)
  if (!scope || scope.userId !== viewerId || scope.audience !== audience) return null
  return scope.accountId
}
