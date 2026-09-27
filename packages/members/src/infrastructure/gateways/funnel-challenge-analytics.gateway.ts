import type {
  ChallengeAnalyticsEvent,
  ChallengeAnalyticsGateway,
} from '../../domain/ports/challenge-analytics-gateway.port'

export class FunnelChallengeAnalyticsGateway implements ChallengeAnalyticsGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly internalToken: string,
    private readonly timeoutMs = 8_000,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async publish(events: ChallengeAnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return
    for (let offset = 0; offset < events.length; offset += 500) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
      try {
        const response = await this.fetchFn(
          `${this.baseUrl.replace(/\/$/, '')}/api/internal/challenge-events`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-internal-token': this.internalToken,
            },
            body: JSON.stringify({
              events: events.slice(offset, offset + 500).map((event) => ({
                ...event,
                occurredAt: event.occurredAt.toISOString(),
              })),
            }),
            signal: controller.signal,
          },
        )
        if (!response.ok) throw new Error(`funnel challenge analytics: HTTP ${response.status}`)
      } finally {
        clearTimeout(timeout)
      }
    }
  }
}
