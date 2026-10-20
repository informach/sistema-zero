import { createPromotionHandler } from './handler'
import { approvedPromotionPlan } from './plan.generated'

/** Separate operational entrypoint; never imported by the public runtime Worker. */
export default { fetch: createPromotionHandler(approvedPromotionPlan) }
