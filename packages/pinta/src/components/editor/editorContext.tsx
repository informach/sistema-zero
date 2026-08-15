/**
 * Contexto do EDITOR aberto (asset + sessão) — interno; criado pelo
 * EditorScreen e consumido por toolbar/paleta/canvas/animações.
 */
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { PintaEditorState, PintaEditorStore } from '../../state/editorStore'
import type { PintaSessionState, PintaSessionStore } from '../../state/sessionStore'

export interface PintaEditorContextValue {
  editor: PintaEditorStore
  session: PintaSessionStore
  /**
   * Curadoria da caixa de ferramentas vinda do HOST (o bloco de aula). Ausente ou vazia = nada
   * escondido, que é o Pinta solto. Ver `core/toolCuration.ts`.
   */
  allowTools?: readonly string[]
}

const PintaEditorContext = createContext<PintaEditorContextValue | null>(null)

export const PintaEditorProvider = PintaEditorContext.Provider

export function useEditorStores(): PintaEditorContextValue {
  const value = useContext(PintaEditorContext)
  if (!value) throw new Error('useEditorStores deve ser usado dentro do editor')
  return value
}

export function useEditor<T>(selector: (state: PintaEditorState) => T): T {
  const { editor } = useEditorStores()
  return useStore(editor, selector)
}

export function useSession<T>(selector: (state: PintaSessionState) => T): T {
  const { session } = useEditorStores()
  return useStore(session, selector)
}

/** A lista curada do host, ou `undefined` quando ninguém curou. */
export function useToolCuration(): readonly string[] | undefined {
  return useEditorStores().allowTools
}
