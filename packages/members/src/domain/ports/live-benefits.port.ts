export interface LiveBenefitsPort {
  maxProfiles(accountId: string, now: Date): Promise<number>
  hasMural(accountId: string, learnerId: string, now: Date): Promise<boolean>
}
