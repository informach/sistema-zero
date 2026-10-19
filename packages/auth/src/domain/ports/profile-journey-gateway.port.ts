/** Auth-only initialization. Ownership is captured by Auth, never inferred from a public profile. */
export interface ProfileJourneyGateway {
  initialize(owner: { profileId: string; accountUserId: string }): Promise<'admitted' | 'not_ready'>
}
