import { createContext, useContext } from 'react'

/**
 * SINCRONIZAR COM O ENVIADO — capacidade OPCIONAL do host (member-shell) para o
 * Estúdio da AULA: puxar do servidor o projeto que o aluno ENVIOU ao professor e
 * substituir o que está no editor (o editor semeia do rascunho LOCAL deste
 * navegador; se o aluno terminou em outro computador, o local fica defasado).
 *
 * O Studio só EXPÕE o item de menu (⋯ → "Sincronizar com o enviado") e dispara
 * este callback; toda a lógica de aula (buscar a entrega, confirmar, substituir o
 * projeto via `StudioHandle.replaceProject`, feedback) vive no HOST, que tem o
 * `handleRef`. Default `null` → sem item de menu. Mesmo padrão do {@link useStudioShare}.
 */
const StudioCloudSyncContext = createContext<(() => void) | null>(null)

export const StudioCloudSyncProvider = StudioCloudSyncContext.Provider

/** Callback de "sincronizar com o enviado" (`null` quando o host não passou um). */
export function useStudioCloudSync(): (() => void) | null {
  return useContext(StudioCloudSyncContext)
}
