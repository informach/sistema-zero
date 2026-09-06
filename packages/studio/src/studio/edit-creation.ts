import { createContext, useContext } from 'react'

/**
 * EDITAR A CRIAÇÃO NO MOLDA — capacidade OPCIONAL do host (community-kids) para o
 * Estúdio Completo: abrir o Molda, numa aba nova, já com AQUELA criação aberta
 * (modelo `.glb`, céu `.hdr` ou textura `.png`).
 *
 * Gêmeo do {@link useStudioEditDrawing} (o Pinta): o Studio só expõe o botão (no
 * painel de Imagens, nos assets trazidos do Molda) e entrega o id da criação;
 * navegar entre os apps é assunto do host. Default `null` → sem botão, que é o
 * certo no embed do admin e no bloco de aula.
 *
 * O caminho de VOLTA (salvar no Molda atualiza o `.glb`/`.hdr`/`.png` do projeto)
 * é o mesmo do Pinta: o host regrava a biblioteca pessoal e
 * `asset-library/personalSync.ts` leva os bytes novos aos jogos.
 */
const StudioEditCreationContext = createContext<((creationId: string) => void) | null>(null)

export const StudioEditCreationProvider = StudioEditCreationContext.Provider

/** Callback de "editar esta criação no Molda" (`null` quando o host não passou um). */
export function useStudioEditCreation(): ((creationId: string) => void) | null {
  return useContext(StudioEditCreationContext)
}
