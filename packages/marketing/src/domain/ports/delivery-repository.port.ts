import type { CreateDelivery, Delivery, DeliveryAction } from '@sistemazero/marketing-contracts'
import type { MediaAsset } from '../media/media-asset'
import type { Publication } from '../publication/publication-record'

export interface ResolvedDelivery {
  projectId: string
  representationId: string
  editionHash: string
  title: string
  assets: MediaAsset[]
  orderedAssetIds: string[]
}
export interface DeliveryRepository {
  analyze(
    actorId: string,
    projectId: string,
    id: string,
    input: import('@sistemazero/marketing-contracts').MetricsAnalysis,
    hash: string,
  ): Promise<import('@sistemazero/marketing-contracts').BatchResult>
  metrics(
    actorId: string,
    projectId: string,
    id: string,
  ): Promise<{ snapshots: import('@sistemazero/marketing-contracts').PublicationMetricsSnapshot[] }>
  options(
    actorId: string,
    projectId: string,
  ): Promise<{
    automaticFormats: import('../publication/publication').PublicationFormat[]
    verifiableNetworks: import('../publication/publication').Network[]
    accounts: {
      id: string
      network: import('../publication/publication').Network
      displayName: string
    }[]
  }>
  create(actorId: string, projectId: string, input: CreateDelivery, hash: string): Promise<Delivery>
  act(
    actorId: string,
    projectId: string,
    id: string,
    input: DeliveryAction,
    hash: string,
  ): Promise<Delivery>
  list(
    actorId: string,
    projectId: string,
    representationId: string,
    before?: string,
  ): Promise<{ items: Delivery[]; nextCursor: string | null }>
  /** null = legacy publication; a bound but invalid edition must throw, never fall back. */
  resolve(publication: Publication): Promise<ResolvedDelivery | null>
  syncContent(publication: Publication): Promise<boolean>
}
