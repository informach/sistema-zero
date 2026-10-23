import type { LiveMediaSupervisorPort } from './cloudflare-sfu.provider'
import { type LiveMediaConnection, LiveMediaError } from './media-registry'

export class HttpLiveMediaSupervisor implements LiveMediaSupervisorPort {
  constructor(
    private readonly config: { url: string; token: string },
    private readonly request: typeof fetch = fetch,
  ) {
    if (!config.url.startsWith('https://') || config.token.length < 32)
      throw new LiveMediaError(
        'MEDIA_SUPERVISOR_MISSING',
        'Supervisor de mídia não configurado.',
        503,
      )
  }
  register(connection: LiveMediaConnection): Promise<void> {
    return this.update(connection)
  }
  renew(connection: LiveMediaConnection): Promise<void> {
    return this.update(connection)
  }
  retire(connection: LiveMediaConnection): Promise<void> {
    return this.update(connection)
  }

  private async update(connection: LiveMediaConnection): Promise<void> {
    const response = await this.request(
      `${this.config.url.replace(/\/$/, '')}/connections/${encodeURIComponent(connection.id)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId: connection.id,
          generation: connection.generation,
          sessionId: connection.sessionId,
          leaseEndsAt: Date.parse(connection.leaseEndsAt),
          hardEndsAt: Date.parse(connection.hardEndsAt),
          retired: connection.status === 'retired' || connection.status === 'closed',
          mids: connection.resources.map((resource) => resource.mid),
        }),
        signal: AbortSignal.timeout(5_000),
      },
    )
    if (!response.ok)
      throw new LiveMediaError(
        'MEDIA_SUPERVISOR_UNAVAILABLE',
        'Não foi possível confirmar a supervisão da transmissão.',
        503,
      )
    const result = (await response.json()) as { accepted?: boolean; retired?: boolean }
    if (!result.accepted || (result.retired && connection.status === 'active'))
      throw new LiveMediaError(
        'MEDIA_SUPERVISOR_RETIRED',
        'Reconecte para continuar na transmissão.',
      )
  }
}
