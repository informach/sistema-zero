import 'server-only'
import type { RecoveryPolicyView } from '@/lib/subscription-recovery'
import { gatewayFetch } from './gateway'

const path = '/payments/admin/subscription-recovery/policy'
export function getRecoveryPolicy() {
  return gatewayFetch<RecoveryPolicyView>(path)
}
export function saveRecoveryPolicy(body: unknown) {
  return gatewayFetch<RecoveryPolicyView>(path, { method: 'PUT', body })
}
