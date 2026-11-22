import { createContext, useContext } from 'react'

/**
 * ABRIR OUTRO PROJETO — capacidade OPCIONAL do host (proposta aprovada em 21/11/2026, "de onde veio
 * o projeto Pro"). O Studio não navega (regra 4: a navegação é do host): o item "Abrir a versão em
 * blocos" do menu ⋯ chama este callback com o id da cópia em blocos guardada na conversão
 * (`proMeta.origin.projectId`). Default `null` → sem item de menu. Mesmo padrão do
 * {@link useStudioCloudSync}.
 */
const StudioOpenProjectContext = createContext<((projectId: string) => void) | null>(null)

export const StudioOpenProjectProvider = StudioOpenProjectContext.Provider

/** Callback de abrir outro projeto (`null` quando o host não passou um). */
export function useStudioOpenProject(): ((projectId: string) => void) | null {
  return useContext(StudioOpenProjectContext)
}
