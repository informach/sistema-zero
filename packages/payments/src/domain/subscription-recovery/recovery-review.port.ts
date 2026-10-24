export type RecoveryReviewKind = 'CASE' | 'ADMISSION' | 'OPERATION' | 'PERIOD'
export type RecoveryReviewAudience = 'kids' | 'adult' | 'unknown'
export interface RecoveryReviewItem {
  kind: RecoveryReviewKind
  id: string
  subscriptionId: string | null
  paymentId: string | null
  audience: RecoveryReviewAudience
  state: string
  reason: string | null
  amountInCents: string
  version: number
  openedAt: string
  deadlineAt: string | null
  customerName: string | null
  customerEmail: string | null
}
export interface RecoveryReviewQuery {
  subscriptionId?: string
  q?: string
  kind?: RecoveryReviewKind
  audience?: RecoveryReviewAudience
  limit: number
  offset: number
}
export interface RecoveryReviewPage {
  items: RecoveryReviewItem[]
  total: number
  limit: number
  offset: number
}
export interface RecoveryReviewRepository {
  list(query: RecoveryReviewQuery): Promise<RecoveryReviewPage>
}
