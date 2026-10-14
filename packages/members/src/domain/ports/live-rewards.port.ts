export interface LiveRewardsPort {
  encounterAttended(input: {
    learnerId: string
    accountId: string
    occurrenceId: string
    courseId: string
    audience: 'adult' | 'kids'
  }): Promise<void>
}
