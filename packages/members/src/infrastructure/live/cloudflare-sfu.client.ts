import type { LiveMediaDescription } from '@sistemazero/core/live'
import { LiveMediaError } from './media-registry'

export interface SfuTrackResult {
  mid?: string
  trackName?: string
  sessionId?: string
  errorCode?: string
  errorDescription?: string
  location?: 'local' | 'remote'
  status?: string
}

export interface SfuResponse {
  sessionId?: string
  sessionDescription?: LiveMediaDescription
  requiresImmediateRenegotiation?: boolean
  tracks?: SfuTrackResult[]
  errorCode?: string
}

/** Native SFU API only. Callers supply business-authorized operations, never arbitrary URLs. */
export class CloudflareSfuClient {
  constructor(
    private readonly config: { appId: string; appSecret: string },
    private readonly request: typeof fetch = fetch,
  ) {
    if (!config.appId || !config.appSecret) {
      throw new LiveMediaError(
        'MEDIA_NOT_CONFIGURED',
        'A transmissão ainda não foi configurada.',
        503,
      )
    }
  }

  async createSession(attemptId: string): Promise<SfuResponse> {
    return this.call('POST', `sessions/new?correlationId=${encodeURIComponent(attemptId)}`)
  }

  async newTracks(sessionId: string, body: unknown): Promise<SfuResponse> {
    return this.call('POST', `sessions/${encodeURIComponent(sessionId)}/tracks/new`, body)
  }

  async answer(sessionId: string, description: LiveMediaDescription): Promise<SfuResponse> {
    return this.call('PUT', `sessions/${encodeURIComponent(sessionId)}/renegotiate`, {
      sessionDescription: description,
    })
  }

  async inspect(sessionId: string): Promise<SfuResponse> {
    return this.call('GET', `sessions/${encodeURIComponent(sessionId)}`)
  }

  async closeTracks(sessionId: string, mids: string[]): Promise<SfuResponse> {
    return this.call('PUT', `sessions/${encodeURIComponent(sessionId)}/tracks/close`, {
      tracks: mids.map((mid) => ({ mid })),
      force: true,
    })
  }

  private async call(method: string, path: string, body?: unknown): Promise<SfuResponse> {
    const response = await this.request(
      `https://rtc.live.cloudflare.com/v1/apps/${encodeURIComponent(this.config.appId)}/${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${this.config.appSecret}`,
          'Content-Type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    )
    // Do not echo provider bodies: SDP and diagnostics may identify endpoints.
    if (!response.ok) {
      throw new LiveMediaError(
        'MEDIA_PROVIDER_ERROR',
        'A transmissão não confirmou a operação.',
        502,
      )
    }
    const value: unknown = await response.json()
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new LiveMediaError('MEDIA_PROVIDER_INVALID', 'Resposta de transmissão inválida.', 502)
    }
    const result = value as SfuResponse
    if (result.errorCode) {
      throw new LiveMediaError('MEDIA_PROVIDER_ERROR', 'A transmissão recusou a operação.', 502)
    }
    return result
  }
}

export function assertSfuTrackResult(result: SfuResponse, requestedMid?: string): SfuTrackResult {
  const track = requestedMid
    ? result.tracks?.find((item) => item.mid === requestedMid)
    : result.tracks?.[0]
  if (!track || track.errorCode || !track.mid || result.tracks?.some((item) => item.errorCode)) {
    throw new LiveMediaError(
      'MEDIA_TRACK_FAILED',
      'A trilha não foi confirmada pela transmissão.',
      502,
    )
  }
  return track
}
