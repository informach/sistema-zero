import 'server-only'
import type { AdultJourneyPolicy } from '@sistemazero/core/journey'
import { gatewayFetch } from './gateway'
export interface AdultJourneyPolicyRecord {
  version: number
  policy: AdultJourneyPolicy
}
export function getAdultJourneyPolicy() {
  return gatewayFetch<AdultJourneyPolicyRecord>('/members/admin/journey/adult')
}
export function saveAdultJourneyPolicy(body: unknown) {
  return gatewayFetch<AdultJourneyPolicyRecord>('/members/admin/journey/adult', {
    method: 'PUT',
    body,
  })
}
