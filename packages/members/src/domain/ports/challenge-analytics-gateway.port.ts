export type ChallengeAnalyticsEventName =
  | 'account_activated'
  | 'child_profile_created'
  | 'challenge_started'
  | 'challenge_day_completed'
  | 'challenge_completed'
  | 'expiry_reminder_sent'
  | 'challenge_expired'

export interface ChallengeAnalyticsEvent {
  buyerUserId: string
  eventName: ChallengeAnalyticsEventName
  occurredAt: Date
}

export interface ChallengeAnalyticsGateway {
  publish(events: ChallengeAnalyticsEvent[]): Promise<void>
}
