import 'server-only'
import type {
  CreatorMasteryReviewDetail,
  CreatorMasteryReviewQueue,
} from '@sistemazero/core/journey'
import { gatewayFetch } from './gateway'
export const getMasteryQueue = (query: Record<string, string | number | undefined>) =>
  gatewayFetch<CreatorMasteryReviewQueue>('/members/admin/journey/masteries/submissions', { query })
export const getMasterySubmission = (id: string) =>
  gatewayFetch<CreatorMasteryReviewDetail>(
    `/members/admin/journey/masteries/submissions/${encodeURIComponent(id)}`,
  )
export const reviewMastery = (id: string, body: unknown) =>
  gatewayFetch(`/members/admin/journey/masteries/submissions/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    body,
  })
