import { createContext, useContext } from 'react'

/**
 * EDITAR O DESENHO — capacidade OPCIONAL do host (community-kids) para o Estúdio
 * Completo: abrir o Pinta, numa aba nova, já com AQUELE desenho aberto.
 *
 * O Studio só expõe o botão (no painel de Imagens, nos desenhos vindos do Pinta)
 * e entrega o id do desenho; navegar entre os apps é assunto do host — só ele
 * conhece as rotas. Default `null` → sem botão, que é o certo no embed do admin
 * e no bloco de aula, onde o Pinta não existe.
 *
 * O caminho de VOLTA (o desenho salvo se atualizar sozinho nos jogos) não passa
 * por aqui: ele é resolvido dentro do próprio Studio, em
 * `asset-library/personalSync.ts`. Mesmo padrão do {@link useStudioCloudSync}.
 */
const StudioEditDrawingContext = createContext<((drawingId: string) => void) | null>(null)

export const StudioEditDrawingProvider = StudioEditDrawingContext.Provider

/** Callback de "editar este desenho" (`null` quando o host não passou um). */
export function useStudioEditDrawing(): ((drawingId: string) => void) | null {
  return useContext(StudioEditDrawingContext)
}
