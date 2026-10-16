import { sql } from 'drizzle-orm'
import { contents, publications } from './schema'
import { editorialDeliveries } from './workspace-schema'

// Editorial deliveries share the publisher's durable queue, not the legacy global workspace.
// Their HTTP reads and mutations require project membership through DeliveryRepository.
export const legacyContent = sql`not exists (select 1 from ${editorialDeliveries} where ${editorialDeliveries.contentId} = ${contents.id})`
export const legacyPublication = sql`not exists (select 1 from ${editorialDeliveries} where ${editorialDeliveries.publicationId} = ${publications.id})`
