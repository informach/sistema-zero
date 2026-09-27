import type { ShowcasePublishedArgs } from './members-gateway.port'

export interface ShowcaseDelivery {
  threadId: string
  payload: ShowcasePublishedArgs
}

export interface ShowcaseDeliveryRepository {
  findStatus(
    userId: string,
    accountId: string,
    courseId: string,
  ): Promise<'none' | 'pending' | 'delivered'>
  /** Claims one due delivery with a persistent retry lease; safe across workers/restarts. */
  claim(now: Date): Promise<ShowcaseDelivery | null>
  acknowledge(threadId: string, now: Date): Promise<void>
}
