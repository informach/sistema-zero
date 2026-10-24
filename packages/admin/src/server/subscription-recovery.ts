import 'server-only'
import type { RecoveryPolicyView, RecoveryReviewPage } from '@/lib/subscription-recovery'
import { gatewayFetch } from './gateway'

const path = '/payments/admin/subscription-recovery/policy'
export function getRecoveryPolicy() {
  return gatewayFetch<RecoveryPolicyView>(path)
}
export function saveRecoveryPolicy(body: unknown) {
  return gatewayFetch<RecoveryPolicyView>(path, { method: 'PUT', body })
}
export function getRecoveryReview(
  query: Record<string, string | number | undefined>,
  signal?: AbortSignal,
) {
  return gatewayFetch<RecoveryReviewPage>('/payments/admin/subscription-recovery/review', {
    query,
    signal,
  })
}
export function confirmRecoveryPeriod(
  id: string,
  body: { expectedVersion: number; requestId: string },
  signal?: AbortSignal,
) {
  return gatewayFetch<{ paymentId: string; version: number; confirmed: true }>(
    `/payments/admin/subscription-recovery/payments/${encodeURIComponent(id)}/confirm-period`,
    { method: 'POST', body, signal },
  )
}
