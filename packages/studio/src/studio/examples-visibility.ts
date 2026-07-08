import { createContext, useContext } from 'react'

/**
 * EXEMPLOS VISÍVEIS — os exemplos prontos (CORE_EXAMPLES + os `examples` das
 * extensões oficiais) são material de TESTE do admin: podem estar
 * desatualizados/com erro conforme os blocos evoluíram. Por isso só aparecem
 * quando o HOST liga esta flag — hoje, apenas o playground local (`bun run dev`),
 * a superfície onde o admin testa a ferramenta.
 *
 * Default `false` → clientes (community-kids, autoria no admin) NÃO veem
 * exemplos: nem a lista "Exemplos" do painel de Extensões nem a vitrine de
 * "jogos prontos" (KitGallery) da lista de projetos. Instalar/remover extensão
 * segue sempre disponível — só os EXEMPLOS somem.
 *
 * Latchado uma vez por instância no {@link StudioCore} (mesmo padrão do
 * {@link useStudioShare}/{@link useStudioCloudSync}). A {@link ProjectList} vive
 * FORA do StudioCore, então recebe a visibilidade por PROP direta.
 */
const StudioExamplesVisibleContext = createContext<boolean>(false)

export const StudioExamplesVisibleProvider = StudioExamplesVisibleContext.Provider

/** `true` quando o host liberou os exemplos prontos (playground/admin de teste). */
export function useStudioExamplesVisible(): boolean {
  return useContext(StudioExamplesVisibleContext)
}
