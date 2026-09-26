import 'server-only'
import type {
  HelpCollectionView,
  HelpImportResultView,
  HelpTutorialAdminSummaryView,
  HelpTutorialAdminView,
} from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from '@/server/gateway'

const enc = encodeURIComponent

// Adapters do "Como fazer" (biblioteca de ajuda do Kids): coleções e tutoriais em
// `/members/admin/help/*`. O rascunho é editado aqui; a criança só lê o publicado.

export function listHelpCollections(): Promise<
  GatewayResponse<{ collections: HelpCollectionView[] }>
> {
  return gatewayFetch('/members/admin/help/collections')
}

export function createHelpCollection(body: unknown): Promise<GatewayResponse<HelpCollectionView>> {
  return gatewayFetch('/members/admin/help/collections', { method: 'POST', body })
}

export function updateHelpCollection(
  id: string,
  body: unknown,
): Promise<GatewayResponse<HelpCollectionView>> {
  return gatewayFetch(`/members/admin/help/collections/${enc(id)}`, { method: 'PATCH', body })
}

export function archiveHelpCollection(id: string): Promise<GatewayResponse<HelpCollectionView>> {
  return gatewayFetch(`/members/admin/help/collections/${enc(id)}/archive`, { method: 'POST' })
}

export function restoreHelpCollection(id: string): Promise<GatewayResponse<HelpCollectionView>> {
  return gatewayFetch(`/members/admin/help/collections/${enc(id)}/restore`, { method: 'POST' })
}

export function reorderHelpCollections(
  ids: string[],
): Promise<GatewayResponse<{ collections: HelpCollectionView[] }>> {
  return gatewayFetch('/members/admin/help/collections/order', { method: 'PUT', body: { ids } })
}

export function listHelpTutorials(query: {
  status?: string
  collectionId?: string
  q?: string
}): Promise<GatewayResponse<{ tutorials: HelpTutorialAdminSummaryView[] }>> {
  return gatewayFetch('/members/admin/help/tutorials', { query })
}

export function getHelpTutorial(id: string): Promise<GatewayResponse<HelpTutorialAdminView>> {
  return gatewayFetch(`/members/admin/help/tutorials/${enc(id)}`)
}

export function createHelpTutorial(body: unknown): Promise<GatewayResponse<HelpTutorialAdminView>> {
  return gatewayFetch('/members/admin/help/tutorials', { method: 'POST', body })
}

export function updateHelpTutorial(
  id: string,
  body: unknown,
): Promise<GatewayResponse<HelpTutorialAdminView>> {
  return gatewayFetch(`/members/admin/help/tutorials/${enc(id)}`, { method: 'PATCH', body })
}

export type HelpTutorialAction = 'publish' | 'unpublish' | 'archive'

export function actHelpTutorial(
  id: string,
  action: HelpTutorialAction,
  body: unknown,
): Promise<GatewayResponse<HelpTutorialAdminView>> {
  return gatewayFetch(`/members/admin/help/tutorials/${enc(id)}/${action}`, {
    method: 'POST',
    body,
  })
}

export function importHelp(body: unknown): Promise<GatewayResponse<HelpImportResultView>> {
  return gatewayFetch('/members/admin/help/tutorials/import', { method: 'POST', body })
}

export function exportHelp(): Promise<
  GatewayResponse<{ collections: HelpCollectionView[]; tutorials: HelpTutorialAdminView[] }>
> {
  return gatewayFetch('/members/admin/help/tutorials/export')
}
