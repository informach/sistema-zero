import 'server-only'
import type {
  HelpCollectionView,
  HelpImportResultView,
  HelpTutorialAdminSummaryView,
  HelpTutorialAdminView,
} from '@/lib/types'
import { type GatewayResponse, gatewayFetch as upstreamHelpFetch } from '@/server/gateway'

export type HelpTutorialAction = 'publish' | 'unpublish' | 'archive'
export function createHelpAdminClient(audience: 'kids' | 'adult' = 'kids') {
  const gatewayFetch: typeof upstreamHelpFetch = (path, opts) =>
    upstreamHelpFetch(
      audience === 'adult'
        ? path.replace('/members/admin/help/', '/members/admin/adult/help/')
        : path,
      opts,
    )
  const enc = encodeURIComponent

  // Adapters do "Como fazer" (biblioteca de ajuda do Kids): coleções e tutoriais em
  // `/members/admin/help/*`. O rascunho é editado aqui; a criança só lê o publicado.

  function listHelpCollections(): Promise<GatewayResponse<{ collections: HelpCollectionView[] }>> {
    return gatewayFetch('/members/admin/help/collections')
  }

  function createHelpCollection(body: unknown): Promise<GatewayResponse<HelpCollectionView>> {
    return gatewayFetch('/members/admin/help/collections', { method: 'POST', body })
  }

  function updateHelpCollection(
    id: string,
    body: unknown,
  ): Promise<GatewayResponse<HelpCollectionView>> {
    return gatewayFetch(`/members/admin/help/collections/${enc(id)}`, { method: 'PATCH', body })
  }

  function archiveHelpCollection(id: string): Promise<GatewayResponse<HelpCollectionView>> {
    return gatewayFetch(`/members/admin/help/collections/${enc(id)}/archive`, { method: 'POST' })
  }

  function restoreHelpCollection(id: string): Promise<GatewayResponse<HelpCollectionView>> {
    return gatewayFetch(`/members/admin/help/collections/${enc(id)}/restore`, { method: 'POST' })
  }

  function reorderHelpCollections(
    ids: string[],
  ): Promise<GatewayResponse<{ collections: HelpCollectionView[] }>> {
    return gatewayFetch('/members/admin/help/collections/order', { method: 'PUT', body: { ids } })
  }

  function listHelpTutorials(query: {
    status?: string
    collectionId?: string
    q?: string
  }): Promise<GatewayResponse<{ tutorials: HelpTutorialAdminSummaryView[] }>> {
    return gatewayFetch('/members/admin/help/tutorials', { query })
  }

  function getHelpTutorial(id: string): Promise<GatewayResponse<HelpTutorialAdminView>> {
    return gatewayFetch(`/members/admin/help/tutorials/${enc(id)}`)
  }

  function createHelpTutorial(body: unknown): Promise<GatewayResponse<HelpTutorialAdminView>> {
    return gatewayFetch('/members/admin/help/tutorials', { method: 'POST', body })
  }

  function updateHelpTutorial(
    id: string,
    body: unknown,
  ): Promise<GatewayResponse<HelpTutorialAdminView>> {
    return gatewayFetch(`/members/admin/help/tutorials/${enc(id)}`, { method: 'PATCH', body })
  }

  function actHelpTutorial(
    id: string,
    action: HelpTutorialAction,
    body: unknown,
  ): Promise<GatewayResponse<HelpTutorialAdminView>> {
    return gatewayFetch(`/members/admin/help/tutorials/${enc(id)}/${action}`, {
      method: 'POST',
      body,
    })
  }

  function importHelp(body: unknown): Promise<GatewayResponse<HelpImportResultView>> {
    return gatewayFetch('/members/admin/help/tutorials/import', { method: 'POST', body })
  }

  function exportHelp(): Promise<
    GatewayResponse<{ collections: HelpCollectionView[]; tutorials: HelpTutorialAdminView[] }>
  > {
    return gatewayFetch('/members/admin/help/tutorials/export')
  }

  return {
    listHelpCollections,
    createHelpCollection,
    updateHelpCollection,
    archiveHelpCollection,
    restoreHelpCollection,
    reorderHelpCollections,
    listHelpTutorials,
    getHelpTutorial,
    createHelpTutorial,
    updateHelpTutorial,
    actHelpTutorial,
    importHelp,
    exportHelp,
  }
}
