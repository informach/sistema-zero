import type { IncomingEvent } from '../engagement/policy'
import type { SocialAccount } from '../social-account/social-account'
import type { OutboundMessage, SendOutcome } from './engagement-provider.port'
export type Dispatch = {
  id: string
  leaseId: string
  account: SocialAccount
  recipient: string
  commentId: string | null
  message: OutboundMessage
}
export type PendingBinding = {
  id: string
  version: number
  account: SocialAccount
  mediaId: string
  publicationVersion: number
}
export interface EngagementEngine {
  ingest(events: IncomingEvent[]): Promise<number>
  process(now: Date): Promise<number>
  bindings(): Promise<PendingBinding[]>
  bind(candidate: PendingBinding, verified: boolean): Promise<void>
  claim(now: Date): Promise<Dispatch | null>
  finish(dispatch: Dispatch, outcome: SendOutcome, now: Date): Promise<void>
  maintain(now: Date): Promise<void>
}
