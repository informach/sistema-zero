import { createContext, useContext } from 'react'

/**
 * Onde os menus e as janelas do Studio são portalados. O padrão é o `document.body`.
 * Um host que abre o Studio dentro de um `<dialog>` modal (o desafio do Arquipélago)
 * passa o próprio diálogo: o `showModal()` deixa inerte tudo o que fica fora dele, e
 * um menu no `body` aparecia sem responder a clique nem teclado.
 */
const StudioPortalContainerContext = createContext<HTMLElement | null>(null)

export const StudioPortalContainerProvider = StudioPortalContainerContext.Provider

/** O contêiner escolhido pelo host; `null` = o `document.body` (lido só ao portalar). */
export function useStudioPortalContainer(): HTMLElement | null {
  return useContext(StudioPortalContainerContext)
}
