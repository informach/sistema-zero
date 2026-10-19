import type { ChallengeEntryArgs, StandaloneShowcaseArgs } from './members-gateway.port'

export type StudioPublicationEvent =
  | { kind: 'standalone'; payload: StandaloneShowcaseArgs }
  | { kind: 'challenge'; payload: ChallengeEntryArgs }

export interface StudioEventRepository {
  claim(now: Date): Promise<{ eventId: string; event: StudioPublicationEvent } | null>
  acknowledge(eventId: string, now: Date): Promise<void>
}

/** Bind notification time to the committed thread, preserving the discriminated payload. */
export function studioPublicationEventAt(
  event: StudioPublicationEvent,
  publishedAt: string,
): StudioPublicationEvent {
  return event.kind === 'standalone'
    ? { kind: event.kind, payload: { ...event.payload, publishedAt } }
    : { kind: event.kind, payload: { ...event.payload, publishedAt } }
}
