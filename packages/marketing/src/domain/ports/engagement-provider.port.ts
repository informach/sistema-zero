import type { SocialAccount } from '../social-account/social-account'
export type OutboundButton =
  | { type: 'postback'; title: string; payload: string }
  | { type: 'web_url'; title: string; url: string }
export type OutboundMessage = { text: string; buttons: OutboundButton[] }
export type SendOutcome =
  | { status: 'accepted'; externalId: string }
  | { status: 'failed' | 'uncertain' | 'retryable'; reason: string }
export interface EngagementProvider {
  verifyPost(account: SocialAccount, mediaId: string): Promise<boolean>
  send(
    account: SocialAccount,
    recipient: string,
    commentId: string | null,
    message: OutboundMessage,
  ): Promise<SendOutcome>
}
