import type {
  CourseBenefitContext,
  CourseBenefitView,
  GiftAudience,
} from '@sistemazero/core/referrals'
import type { AcquisitionRecord } from '../acquisition'

export interface CourseBenefitRecord extends Omit<CourseBenefitView, 'createdAt'> {
  codeId: string
  createdAt: Date
}

export interface CourseBenefitRepository {
  findById(id: string): Promise<CourseBenefitRecord | null>
  list(audience: GiftAudience, courseSlug?: string): Promise<CourseBenefitRecord[]>
  acquisitions(id: string): Promise<AcquisitionRecord[]>
  contexts(redemptionIds: string[]): Promise<Map<string, CourseBenefitContext>>
  /** Operação explícita, transacional e auditada; preserva código e resgates. */
  convertCampaign(input: {
    campaignId: string
    courseSlug: string
    name: string
    audience: GiftAudience
  }): Promise<CourseBenefitRecord>
}
