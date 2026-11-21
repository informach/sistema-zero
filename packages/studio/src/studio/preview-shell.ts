import { createContext, useContext } from 'react'

/**
 * A casca da prévia do Clássico em outro site, dada pelo HOST para todas as telas do editor de
 * uma vez (o layout raiz do app), sem passar `previewShellUrl` por cada uma. A propriedade, se
 * vier, continua mandando. Subcaminho leve (só React): entra no layout de toda página.
 */
const StudioPreviewShellContext = createContext<string | null>(null)

export const StudioPreviewShellProvider = StudioPreviewShellContext.Provider

export function useStudioPreviewShellUrl(): string | null {
  return useContext(StudioPreviewShellContext)
}
