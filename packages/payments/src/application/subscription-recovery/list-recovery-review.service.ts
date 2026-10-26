import { ValidationError } from '../../domain/shared/errors'
import type {
  RecoveryReviewQuery,
  RecoveryReviewRepository,
} from '../../domain/subscription-recovery/recovery-review.port'

/** Operational visibility only: no notice, debit, cancellation or access mutation. */
export class ListRecoveryReviewService {
  constructor(private readonly repository: RecoveryReviewRepository) {}
  execute(query: RecoveryReviewQuery) {
    if (
      !Number.isSafeInteger(query.limit) ||
      query.limit < 1 ||
      query.limit > 100 ||
      !Number.isSafeInteger(query.offset) ||
      query.offset < 0 ||
      query.offset > 100_000 ||
      (query.q !== undefined && (typeof query.q !== 'string' || query.q.length > 120)) ||
      (query.subscriptionId !== undefined &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          query.subscriptionId,
        )) ||
      (query.kind !== undefined &&
        !['CASE', 'ADMISSION', 'OPERATION', 'PERIOD'].includes(query.kind)) ||
      (query.audience !== undefined && !['kids', 'adult', 'unknown'].includes(query.audience))
    )
      throw new ValidationError('Filtro de conferência inválido')
    return this.repository.list(query)
  }
}
