import type {
  AdultCourseMilestone,
  AdultCreatorCapability,
  AdultJourneyPolicy,
} from '@sistemazero/core/journey'

export interface AdultJourneyPolicyRecord {
  version: number
  policy: AdultJourneyPolicy
}
export interface AdultJourneyRepository {
  getPolicy(): Promise<AdultJourneyPolicyRecord | null>
  savePolicy(
    policy: AdultJourneyPolicy,
    expectedVersion: number,
    now: Date,
  ): Promise<AdultJourneyPolicyRecord | null>
  listMilestones(userId: string): Promise<AdultCourseMilestone[]>
  /** Os marcos de VÁRIAS pessoas numa consulta só (a etapa nas listas: ranking, Mural, Clube). */
  listMilestonesForUsers(userIds: readonly string[]): Promise<Map<string, AdultCourseMilestone[]>>
  listGranted(userId: string): Promise<AdultCreatorCapability[]>
  freezeGranted(
    userId: string,
    version: number,
    capabilities: readonly AdultCreatorCapability[],
    now: Date,
  ): Promise<boolean>
}
