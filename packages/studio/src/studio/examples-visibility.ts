import { createContext, useContext } from 'react'

/**
 * EXEMPLOS VISÍVEIS — os exemplos prontos (CORE_EXAMPLES + os `examples` das
 * extensões oficiais) são material de TESTE do admin: podem estar
 * desatualizados/com erro conforme os blocos evoluíram. Por isso só aparecem
 * quando o HOST autoriza: playground local e contas de equipe admitidas nas
 * comunidades. Selecionar uma linguagem nunca amplia esse público.
 *
 * Default `false` → alunos e hosts que não autorizaram a vitrine NÃO veem
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
